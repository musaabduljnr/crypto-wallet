import crypto from "crypto";
import { createServerClient } from "@/lib/supabase/server";
import { ledgerService } from "./ledger.service";
import { notificationService } from "./notification.service";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";

export interface ResolvedRecipient {
  recipientId: string;
  maskedIdentifier: string;
  displayName: string;
  kycTier: number;
  isVerified: boolean;
}

export interface ExecuteTransferInput {
  senderId: string;
  recipientId: string;
  asset: string;
  amount: string;
  idempotencyKey: string;
  note?: string;
}

export interface TransferResult {
  transactionId: string;
  referenceId: string;
  senderId: string;
  recipientId: string;
  asset: string;
  amount: string;
  fee: string;
  status: "COMPLETED" | "FAILED";
  timestamp: string;
}

export class TransferService {
  /**
   * Resolves a recipient by email or phone with privacy-preserving masking.
   * Prohibits self-lookup for transfer.
   */
  async resolveRecipient(senderId: string, identifier: string): Promise<ResolvedRecipient> {
    const cleanId = identifier.trim();
    if (!cleanId) {
      throw new AppError("Recipient identifier is required", "INVALID_IDENTIFIER", 400);
    }

    const supabase = await createServerClient();

    // Try executing stored procedure
    const { data, error } = await supabase.rpc("resolve_transfer_recipient", {
      p_identifier: cleanId,
    });

    if (error || !data || data.length === 0) {
      // Fallback query for development environments
      const { data: userProfile } = await supabase
        .from("user_profiles")
        .select("id, first_name, last_name, phone_number, kyc_tier")
        .or(`phone_number.eq.${cleanId},id.eq.${cleanId}`)
        .maybeSingle();

      if (!userProfile) {
        throw new AppError("Recipient not found. Please verify the email or phone number.", "RECIPIENT_NOT_FOUND", 404);
      }

      if (userProfile.id === senderId) {
        throw new AppError("Self-transfers are not permitted", "SELF_TRANSFER_PROHIBITED", 400);
      }

      const masked = cleanId.includes("@")
        ? cleanId.slice(0, 2) + "***@" + cleanId.split("@")[1]
        : cleanId.slice(0, 4) + "***" + cleanId.slice(-3);

      return {
        recipientId: userProfile.id,
        maskedIdentifier: masked,
        displayName: `${userProfile.first_name} ${userProfile.last_name ? userProfile.last_name[0] + "." : ""}`.trim(),
        kycTier: userProfile.kyc_tier || 1,
        isVerified: (userProfile.kyc_tier || 1) >= 1,
      };
    }

    const recipient = data[0];

    if (recipient.recipient_id === senderId) {
      throw new AppError("Self-transfers are not permitted", "SELF_TRANSFER_PROHIBITED", 400);
    }

    return {
      recipientId: recipient.recipient_id,
      maskedIdentifier: recipient.masked_identifier,
      displayName: recipient.display_name,
      kycTier: recipient.kyc_tier,
      isVerified: recipient.is_verified,
    };
  }

  /**
   * Authorizes and commits an internal user-to-user transfer atomically on the server.
   * Employs double-entry accounting with non-negative balance enforcement and idempotency protection.
   */
  async executeTransfer(input: ExecuteTransferInput): Promise<TransferResult> {
    const asset = input.asset.toUpperCase();
    const amountNum = parseFloat(input.amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      throw new AppError("Transfer amount must be greater than zero", "INVALID_AMOUNT", 400);
    }

    if (input.senderId === input.recipientId) {
      throw new AppError("Self-transfers are not permitted", "SELF_TRANSFER_PROHIBITED", 400);
    }

    const supabase = await createServerClient();

    // Idempotency check: see if this transaction was already posted
    const { data: existingTx } = await supabase
      .from("ledger_transactions")
      .select("id, reference_id, status, created_at")
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();

    if (existingTx) {
      logger.info("Idempotent replay of internal transfer", {
        txId: existingTx.id,
        idempotencyKey: input.idempotencyKey,
      });
      return {
        transactionId: existingTx.id,
        referenceId: existingTx.reference_id,
        senderId: input.senderId,
        recipientId: input.recipientId,
        asset,
        amount: input.amount,
        fee: "0.00",
        status: "COMPLETED",
        timestamp: existingTx.created_at,
      };
    }

    // Server-side balance validation
    const balances = await ledgerService.getUserBalances(input.senderId);
    const senderAssetBalance = balances[asset];
    const available = senderAssetBalance ? parseFloat(senderAssetBalance.availableBalance) : 0;

    if (available < amountNum) {
      throw new AppError(
        `Insufficient available ${asset} balance. Available: ${available.toFixed(4)}, Required: ${input.amount}`,
        "INSUFFICIENT_FUNDS",
        400
      );
    }

    const referenceId = `TRF-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const metadata = {
      note: input.note || null,
      transferType: "INTERNAL_P2P",
      senderId: input.senderId,
      recipientId: input.recipientId,
    };

    // Execute atomic stored procedure
    const { data: txId, error: rpcError } = await supabase.rpc("execute_internal_transfer", {
      p_sender_id: input.senderId,
      p_recipient_id: input.recipientId,
      p_asset: asset,
      p_amount: amountNum,
      p_reference_id: referenceId,
      p_idempotency_key: input.idempotencyKey,
      p_metadata: metadata,
    });

    if (rpcError) {
      logger.error("Failed to execute internal transfer via RPC", {
        error: rpcError.message,
        senderId: input.senderId,
        recipientId: input.recipientId,
      });

      if (rpcError.message.includes("ERR_INSUFFICIENT_FUNDS")) {
        throw new AppError("Insufficient funds for transfer", "INSUFFICIENT_FUNDS", 400);
      }
      if (rpcError.message.includes("ERR_SELF_TRANSFER_PROHIBITED")) {
        throw new AppError("Self-transfers are not permitted", "SELF_TRANSFER_PROHIBITED", 400);
      }

      throw new AppError("Internal transfer failed during ledger settlement", "TRANSFER_EXECUTION_FAILED", 500);
    }

    const transactionId = txId || crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Server-side trusted notifications
    await notificationService.createNotification({
      userId: input.senderId,
      title: "Transfer Sent",
      message: `You successfully sent ${input.amount} ${asset}. Ref: ${referenceId}`,
      type: "TRANSFER_SENT",
      idempotencyKey: `notif-snd-${input.idempotencyKey}`,
      metadata: { referenceId, asset, amount: input.amount, recipientId: input.recipientId },
    });

    await notificationService.createNotification({
      userId: input.recipientId,
      title: "Transfer Received",
      message: `You received ${input.amount} ${asset} from a verified user. Ref: ${referenceId}`,
      type: "TRANSFER_RECEIVED",
      idempotencyKey: `notif-rcv-${input.idempotencyKey}`,
      metadata: { referenceId, asset, amount: input.amount, senderId: input.senderId },
    });

    logger.info("Internal transfer completed successfully", {
      transactionId,
      referenceId,
      senderId: input.senderId,
      recipientId: input.recipientId,
      amount: input.amount,
      asset,
    });

    return {
      transactionId,
      referenceId,
      senderId: input.senderId,
      recipientId: input.recipientId,
      asset,
      amount: input.amount,
      fee: "0.00",
      status: "COMPLETED",
      timestamp,
    };
  }
}

export const transferService = new TransferService();
