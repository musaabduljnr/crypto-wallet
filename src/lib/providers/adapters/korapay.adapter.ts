import crypto from "crypto";
import {
  IFiatFundingAdapter,
  CreateFundingParams,
  FundingSessionResult,
  WebhookFundingPayload,
  VerifiedFundingEvent,
  PaymentStatusResult,
} from "../contracts/fiat-funding.interface";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";

export interface KorapayConfig {
  secretKey?: string;
  publicKey?: string;
  isSandbox?: boolean;
  baseUrl?: string;
}

export class KorapayFundingAdapter implements IFiatFundingAdapter {
  readonly providerName = "KORAPAY";
  readonly isSandbox: boolean;
  private readonly secretKey?: string;
  private readonly baseUrl: string;

  constructor(config: KorapayConfig = {}) {
    this.secretKey = config.secretKey || process.env.KORAPAY_SECRET_KEY;
    this.isSandbox = config.isSandbox ?? (!this.secretKey || this.secretKey.startsWith("sandbox_") || process.env.NODE_ENV !== "production");
    this.baseUrl = config.baseUrl || "https://api.korapay.com/merchant/api/v1";
  }

  async createFundingSession(params: CreateFundingParams): Promise<FundingSessionResult> {
    const amountNum = parseFloat(params.amountNgn);
    if (isNaN(amountNum) || amountNum < 100) {
      throw new AppError("Minimum funding amount is ₦100.00", "INVALID_AMOUNT", 400);
    }
    if (amountNum > 5000000) {
      throw new AppError("Maximum single funding amount is ₦5,000,000.00", "LIMIT_EXCEEDED", 400);
    }

    // Flat NGN 50 fee for virtual account funding
    const feeAmountNgn = "50.00";
    const providerReference = `KORA-${params.idempotencyKey.slice(0, 16).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    // If no real production secret key is provided, safely operate in sandbox mode
    if (this.isSandbox || !this.secretKey) {
      logger.info("Created Korapay sandbox funding session", {
        userId: params.userId,
        amountNgn: params.amountNgn,
        providerReference,
        isSandbox: true,
      });

      // Deterministic sandbox virtual account for verification
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour validity
      return {
        providerReference,
        paymentMethod: "VIRTUAL_ACCOUNT",
        virtualAccount: {
          bankName: "Wema Bank (Sandbox)",
          accountNumber: "99" + Math.floor(10000000 + Math.random() * 90000000).toString(),
          accountName: `APEX/${params.userName.toUpperCase()}`,
          expiresAt,
        },
        feeAmountNgn,
        status: "PENDING",
        isSandbox: true,
      };
    }

    // Production Korapay API integration
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch(`${this.baseUrl}/charges/bank-transfer`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_name: params.userName,
          amount: amountNum,
          currency: "NGN",
          reference: providerReference,
          customer: {
            name: params.userName,
            email: params.userEmail,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        logger.error("Korapay API error response", { status: res.status, errorBody });
        throw new AppError("Payment provider was unable to create funding session", "PROVIDER_ERROR", 502);
      }

      const json = await res.json();
      const bankDetails = json.data?.bank_account;

      return {
        providerReference,
        paymentMethod: "VIRTUAL_ACCOUNT",
        virtualAccount: {
          bankName: bankDetails?.bank_name || "Providus Bank",
          accountNumber: bankDetails?.account_number || "",
          accountName: bankDetails?.account_name || params.userName,
          expiresAt: json.data?.expiry_date_in_utc || new Date(Date.now() + 3600000).toISOString(),
        },
        feeAmountNgn,
        status: "PENDING",
        isSandbox: false,
      };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        logger.error("Korapay API request timed out", { providerReference });
        throw new AppError("Payment provider timed out. Please try again.", "PROVIDER_TIMEOUT", 504);
      }
      throw err;
    }
  }

  verifyWebhookSignature(payload: WebhookFundingPayload): boolean {
    if (!this.secretKey) {
      // In sandbox mode without configured key, verify based on deterministic test signature
      if (this.isSandbox && payload.signature === "sandbox_valid_sig") {
        return true;
      }
      return false;
    }

    try {
      const computedHash = crypto
        .createHmac("sha256", this.secretKey)
        .update(payload.rawBody)
        .digest("hex");

      return crypto.timingSafeEqual(
        Buffer.from(computedHash, "hex"),
        Buffer.from(payload.signature, "hex")
      );
    } catch {
      return false;
    }
  }

  parseFundingWebhook(payload: WebhookFundingPayload): VerifiedFundingEvent {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(payload.rawBody);
    } catch {
      throw new AppError("Invalid JSON webhook payload", "MALFORMED_WEBHOOK", 400);
    }

    const data = (parsed.data || parsed) as Record<string, unknown>;
    const providerReference = String(data.reference || data.provider_reference || "");
    const amountNum = parseFloat(String(data.amount || "0"));
    const feeNum = parseFloat(String(data.fee || "50.00"));

    if (!providerReference || isNaN(amountNum) || amountNum <= 0) {
      throw new AppError("Incomplete webhook payment fields", "INVALID_WEBHOOK_PAYLOAD", 400);
    }

    return {
      externalEventId: String(parsed.event_id || data.id || `EVT-${Date.now()}`),
      providerReference,
      amountNgn: amountNum.toFixed(2),
      feeNgn: feeNum.toFixed(2),
      paidAt: String(data.paid_at || new Date().toISOString()),
      senderBank: typeof data.payer_bank === "string" ? data.payer_bank : undefined,
      senderAccountName: typeof data.payer_name === "string" ? data.payer_name : undefined,
      rawPayload: parsed,
    };
  }

  async queryPaymentStatus(providerReference: string): Promise<PaymentStatusResult> {
    if (this.isSandbox || !this.secretKey) {
      return {
        providerReference,
        status: "PENDING",
        amountNgn: "0.00",
        feeNgn: "0.00",
      };
    }

    try {
      const res = await fetch(`${this.baseUrl}/charges/${providerReference}`, {
        headers: { Authorization: `Bearer ${this.secretKey}` },
      });
      if (!res.ok) {
        throw new AppError("Failed to query Korapay payment status", "PROVIDER_QUERY_FAILED", 502);
      }
      const json = await res.json();
      const status = json.data?.status === "success" ? "SUCCESSFUL" : json.data?.status === "failed" ? "FAILED" : "PENDING";
      return {
        providerReference,
        status,
        amountNgn: parseFloat(json.data?.amount || 0).toFixed(2),
        feeNgn: parseFloat(json.data?.fee || 50).toFixed(2),
        settledAt: json.data?.settled_at,
      };
    } catch (err: unknown) {
      logger.error("Failed to query payment status from Korapay", { providerReference, err });
      throw err;
    }
  }
}
