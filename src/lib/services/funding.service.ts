import { createServerClient } from "@/lib/supabase/server";
import { providers } from "@/lib/providers/registry";
import { ledgerService } from "./ledger.service";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";

export interface CreateFundingOrderInput {
  userId: string;
  userEmail: string;
  userName: string;
  amountNgn: string;
  paymentMethod?: "VIRTUAL_ACCOUNT" | "CHECKOUT_URL";
  idempotencyKey?: string;
}

export interface FundingOrderOutput {
  sessionId: string;
  providerReference: string;
  amountNgn: string;
  feeNgn: string;
  totalNgn: string;
  paymentMethod: string;
  virtualAccount?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    expiresAt: string;
  };
  checkoutUrl?: string;
  expiresAt: string;
  isSandbox: boolean;
}

export class FundingService {
  async createFundingOrder(input: CreateFundingOrderInput): Promise<FundingOrderOutput> {
    const amountNum = parseFloat(input.amountNgn);
    if (isNaN(amountNum) || amountNum < 100) {
      throw new AppError("Minimum deposit is ₦100.00", "INVALID_AMOUNT", 400);
    }
    if (amountNum > 5000000) {
      throw new AppError("Maximum deposit limit is ₦5,000,000.00", "LIMIT_EXCEEDED", 400);
    }

    const idempotencyKey = input.idempotencyKey || `FUND-${input.userId.slice(0, 8)}-${Date.now()}`;
    const adapter = providers.getFiatFundingAdapter();

    // Server-enforced account restriction check
    const { checkUserActiveRestriction } = await import("@/lib/admin/restrictions");
    const isFundingRestricted = await checkUserActiveRestriction(input.userId, "FIAT_FUNDING");
    if (isFundingRestricted) {
      throw new AppError(
        "Account restriction active: Fiat funding is temporarily disabled for this account.",
        "ACCOUNT_RESTRICTED",
        403
      );
    }

    // Check if duplicate funding session already exists
    const supabase = await createServerClient();
    const { data: existingSession } = await supabase
      .from("funding_sessions")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingSession) {
      return {
        sessionId: existingSession.id,
        providerReference: existingSession.provider_reference,
        amountNgn: String(existingSession.amount_ngn),
        feeNgn: String(existingSession.fee_ngn),
        totalNgn: (parseFloat(existingSession.amount_ngn) + parseFloat(existingSession.fee_ngn)).toFixed(2),
        paymentMethod: existingSession.payment_method,
        virtualAccount: existingSession.virtual_account_number ? {
          bankName: existingSession.virtual_bank_name,
          accountNumber: existingSession.virtual_account_number,
          accountName: existingSession.virtual_account_name,
          expiresAt: existingSession.expires_at,
        } : undefined,
        checkoutUrl: existingSession.checkout_url,
        expiresAt: existingSession.expires_at,
        isSandbox: adapter.isSandbox,
      };
    }

    // Call provider adapter
    const sessionResult = await adapter.createFundingSession({
      userId: input.userId,
      userEmail: input.userEmail,
      userName: input.userName,
      amountNgn: amountNum.toFixed(2),
      idempotencyKey,
    });

    const expiresAt = sessionResult.virtualAccount?.expiresAt || new Date(Date.now() + 3600000).toISOString();

    // Store in funding_sessions table
    const { data: sessionRow, error: insertError } = await supabase
      .from("funding_sessions")
      .insert({
        user_id: input.userId,
        amount_ngn: amountNum,
        fee_ngn: parseFloat(sessionResult.feeAmountNgn),
        provider_reference: sessionResult.providerReference,
        idempotency_key: idempotencyKey,
        payment_method: sessionResult.paymentMethod,
        virtual_bank_name: sessionResult.virtualAccount?.bankName,
        virtual_account_number: sessionResult.virtualAccount?.accountNumber,
        virtual_account_name: sessionResult.virtualAccount?.accountName,
        checkout_url: sessionResult.checkoutUrl,
        status: "PENDING",
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (insertError) {
      logger.error("Failed to insert funding_session record", { error: insertError, input });
      // Non-fatal if session was generated, but log it
    }

    return {
      sessionId: sessionRow?.id || sessionResult.providerReference,
      providerReference: sessionResult.providerReference,
      amountNgn: amountNum.toFixed(2),
      feeNgn: sessionResult.feeAmountNgn,
      totalNgn: (amountNum + parseFloat(sessionResult.feeAmountNgn)).toFixed(2),
      paymentMethod: sessionResult.paymentMethod,
      virtualAccount: sessionResult.virtualAccount,
      checkoutUrl: sessionResult.checkoutUrl,
      expiresAt,
      isSandbox: sessionResult.isSandbox,
    };
  }

  /**
   * Processes verified inbound payment webhook with strict idempotency and double-spend protection.
   */
  async processFundingWebhook(rawBody: string, signature: string): Promise<{ success: boolean; message: string }> {
    const adapter = providers.getFiatFundingAdapter();

    // 1. Verify signature
    const isValid = adapter.verifyWebhookSignature({ rawBody, signature });
    if (!isValid) {
      logger.warn("Webhook rejected: Invalid signature", { provider: adapter.providerName });
      throw new AppError("Invalid webhook signature", "UNAUTHORIZED_WEBHOOK", 401);
    }

    // 2. Parse payload
    const event = adapter.parseFundingWebhook({ rawBody, signature });
    const supabase = await createServerClient();

    // 3. Webhook deduplication: Record in webhook_events table
    const { error: eventError } = await supabase
      .from("webhook_events")
      .insert({
        provider: adapter.providerName,
        event_id: event.externalEventId,
        event_type: "charge.success",
        payload: event.rawPayload,
        signature,
        status: "PROCESSED",
      });

    if (eventError && eventError.code === "23505") {
      // Unique violation: Already processed
      logger.info("Webhook duplicate ignored", { eventId: event.externalEventId });
      return { success: true, message: "Duplicate event acknowledged" };
    }

    // 4. Match funding session by provider reference
    const { data: session } = await supabase
      .from("funding_sessions")
      .select("*")
      .eq("provider_reference", event.providerReference)
      .maybeSingle();

    if (!session) {
      logger.error("Webhook matched no existing funding session", { reference: event.providerReference });
      throw new AppError("Funding session not found", "NOT_FOUND", 404);
    }

    if (session.status === "SUCCESSFUL") {
      logger.info("Funding session already settled", { reference: event.providerReference });
      return { success: true, message: "Already settled" };
    }

    // 5. Atomic Double-Entry Ledger Credit
    const ledgerTx = await ledgerService.creditFiatDeposit({
      userId: session.user_id,
      amountNgn: event.amountNgn,
      providerRef: event.providerReference,
      idempotencyKey: `LEDGER-FIAT-${event.externalEventId}`,
      metadata: {
        provider: adapter.providerName,
        bank: event.senderBank,
        payer: event.senderAccountName,
      },
    });

    // 6. Update funding session to SUCCESSFUL
    await supabase
      .from("funding_sessions")
      .update({
        status: "SUCCESSFUL",
        ledger_transaction_id: ledgerTx.transactionId,
        settled_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    // 7. Audit log
    await supabase
      .from("financial_audit_logs")
      .insert({
        user_id: session.user_id,
        event_type: "FIAT_DEPOSIT_SETTLED",
        entity_type: "funding_sessions",
        entity_id: session.id,
        details: {
          providerReference: event.providerReference,
          amountNgn: event.amountNgn,
          ledgerTransactionId: ledgerTx.transactionId,
        },
      });

    logger.info("Fiat funding webhook processed and ledger credited successfully", {
      sessionId: session.id,
      amountNgn: event.amountNgn,
    });

    return { success: true, message: "Deposit confirmed and credited" };
  }

  async getActiveSession(userId: string): Promise<any | null> {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from("funding_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "PENDING")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data;
  }
}

export const fundingService = new FundingService();
