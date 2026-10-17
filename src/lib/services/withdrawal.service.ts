import crypto from "crypto";
import { createServerClient } from "@/lib/supabase/server";
import { providers } from "@/lib/providers/registry";
import { ledgerService } from "./ledger.service";
import { notificationService } from "./notification.service";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";

export interface WithdrawalFeeQuote {
  asset: string;
  network: string;
  networkFee: string;
  estimatedGasUsd: string;
  minWithdrawalAmount: string;
  maxDailyAmount: string;
}

export interface RequestWithdrawalInput {
  userId: string;
  asset: string;
  network: string;
  destinationAddress: string;
  amount: string;
  idempotencyKey: string;
}

export interface WithdrawalExecutionResult {
  withdrawalId: string;
  referenceId: string;
  asset: string;
  network: string;
  destinationAddress: string;
  netAmount: string;
  feeAmount: string;
  totalDebit: string;
  status: "INITIATED" | "RESERVED" | "BROADCASTED" | "CONFIRMED" | "FAILED";
  txHash?: string;
  isSandbox: boolean;
  createdAt: string;
}

export class WithdrawalService {
  private readonly MIN_AMOUNTS: Record<string, string> = {
    USDT: "10.00",
    USDC: "10.00",
    BTC: "0.0005",
    ETH: "0.005",
    SOL: "0.05",
    NGN: "1000.00",
  };

  /**
   * Estimates network gas and provider fees for the selected asset and network.
   */
  async getWithdrawalFeeQuote(asset: string, network: string): Promise<WithdrawalFeeQuote> {
    const adapter = providers.getCustodyWalletAdapter();
    const ticker = asset.toUpperCase();
    const net = network.toUpperCase();

    const feeEstimate = await adapter.estimateNetworkFee(ticker, net);
    const minAmount = this.MIN_AMOUNTS[ticker] || "5.00";

    return {
      asset: ticker,
      network: net,
      networkFee: feeEstimate.networkFee,
      estimatedGasUsd: feeEstimate.estimatedGasUsd,
      minWithdrawalAmount: minAmount,
      maxDailyAmount: "50000.00", // Standard Tier 1 daily limit
    };
  }

  /**
   * Validates destination address against network standards (EIP-55, Base58, etc.)
   */
  validateDestinationAddress(address: string, network: string): boolean {
    const adapter = providers.getCustodyWalletAdapter();
    return adapter.validateAddress(address, network);
  }

  /**
   * Executes a two-phase external crypto withdrawal:
   * Phase 1: Server-side validation and atomic funds reservation (USER_AVAILABLE -> USER_RESERVED).
   * Phase 2: Custodial broadcast with compensating rollback on rejection.
   */
  async executeWithdrawal(input: RequestWithdrawalInput): Promise<WithdrawalExecutionResult> {
    const asset = input.asset.toUpperCase();
    const network = input.network.toUpperCase();
    const amountNum = parseFloat(input.amount);
    const adapter = providers.getCustodyWalletAdapter();

    // 1. Address Format Verification
    if (!this.validateDestinationAddress(input.destinationAddress, network)) {
      throw new AppError(
        `Invalid ${network} destination address format: ${input.destinationAddress}`,
        "INVALID_DESTINATION_ADDRESS",
        400
      );
    }

    // 2. Minimum Amount Verification
    const minAmount = parseFloat(this.MIN_AMOUNTS[asset] || "1.0");
    if (isNaN(amountNum) || amountNum < minAmount) {
      throw new AppError(
        `Withdrawal amount must be at least ${minAmount} ${asset}`,
        "AMOUNT_BELOW_MINIMUM",
        400
      );
    }

    // 3. Fee calculation & total debit
    const feeQuote = await this.getWithdrawalFeeQuote(asset, network);
    const feeNum = parseFloat(feeQuote.networkFee);
    const totalDebitStr = (amountNum + feeNum).toFixed(6);

    const supabase = await createServerClient();

    // 4. Security Verification: 72-Hour New Device / Registration Cooldown Hold
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("created_at")
      .eq("id", input.userId)
      .maybeSingle();

    if (profile?.created_at) {
      const hoursSinceCreation = (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreation < 72) {
        throw new AppError(
          "can't withdraw on new device wait for 72hrs",
          "NEW_DEVICE_SECURITY_HOLD",
          403
        );
      }
    }

    // Server-enforced account restriction check
    const { checkUserActiveRestriction } = await import("@/lib/admin/restrictions");
    const isWithdrawalRestricted = await checkUserActiveRestriction(input.userId, "EXTERNAL_WITHDRAWAL");
    if (isWithdrawalRestricted) {
      throw new AppError(
        "Account restriction active: External withdrawals are temporarily suspended for this account.",
        "ACCOUNT_RESTRICTED",
        403
      );
    }

    // 5. Idempotency Check
    const { data: existingReq } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();

    if (existingReq) {
      logger.info("Idempotent replay of withdrawal request", {
        id: existingReq.id,
        idempotencyKey: input.idempotencyKey,
      });

      return {
        withdrawalId: existingReq.id,
        referenceId: `WDL-${existingReq.id.slice(0, 8).toUpperCase()}`,
        asset: existingReq.asset_ticker,
        network: existingReq.network_id,
        destinationAddress: existingReq.destination_address,
        netAmount: String(existingReq.amount),
        feeAmount: String(existingReq.network_fee),
        totalDebit: String(existingReq.total_debit),
        status: existingReq.status,
        txHash: existingReq.tx_hash || undefined,
        isSandbox: adapter.isSandbox,
        createdAt: existingReq.created_at,
      };
    }

    // 5. Check User Available Balance
    const balances = await ledgerService.getUserBalances(input.userId);
    const userAssetBal = balances[asset];
    const available = userAssetBal ? parseFloat(userAssetBal.availableBalance) : 0;
    const totalDebitNum = amountNum + feeNum;

    if (available < totalDebitNum) {
      throw new AppError(
        `Insufficient available balance. Required: ${totalDebitNum.toFixed(4)} ${asset} (Amount: ${input.amount} + Fee: ${feeQuote.networkFee}), Available: ${available.toFixed(4)}`,
        "INSUFFICIENT_FUNDS",
        400
      );
    }

    const referenceId = `WDL-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    // 6. Record Withdrawal Intent in Database
    const { data: withdrawalRecord, error: insertError } = await supabase
      .from("withdrawal_requests")
      .insert({
        user_id: input.userId,
        asset_ticker: asset,
        network_id: network,
        destination_address: input.destinationAddress,
        amount: amountNum,
        network_fee: feeNum,
        total_debit: totalDebitNum,
        status: "INITIATED",
        idempotency_key: input.idempotencyKey,
      })
      .select("id, created_at")
      .single();

    if (insertError || !withdrawalRecord) {
      logger.error("Failed to create withdrawal request record", { insertError, userId: input.userId });
      throw new AppError("Failed to initiate withdrawal request", "WITHDRAWAL_INITIATION_FAILED", 500);
    }

    const withdrawalId = withdrawalRecord.id;

    // 7. PHASE 1: Atomic Fund Reservation (USER_AVAILABLE -> USER_RESERVED)
    const reservationKey = `res-${input.idempotencyKey}`;
    const { data: reserveTxId, error: reserveError } = await supabase.rpc("reserve_withdrawal_funds", {
      p_user_id: input.userId,
      p_asset: asset,
      p_total_debit: totalDebitNum,
      p_idempotency_key: reservationKey,
      p_reference_id: referenceId,
    });

    if (reserveError) {
      logger.error("Failed to reserve withdrawal funds in ledger", { reserveError, withdrawalId });
      await supabase
        .from("withdrawal_requests")
        .update({ status: "FAILED", error_reason: "Insufficient funds during reservation lock" })
        .eq("id", withdrawalId);

      throw new AppError("Failed to reserve funds for withdrawal", "RESERVATION_FAILED", 400);
    }

    // Update status to RESERVED
    await supabase
      .from("withdrawal_requests")
      .update({ status: "RESERVED", reservation_tx_id: reserveTxId })
      .eq("id", withdrawalId);

    // 8. PHASE 2: Submit to Custodial Provider
    try {
      const submitResult = await adapter.submitWithdrawal({
        withdrawalId,
        destinationAddress: input.destinationAddress,
        asset,
        network,
        amount: input.amount,
      });

      // 9. PHASE 2a: Final Settlement upon Custodial Broadcast
      const settlementKey = `stl-${input.idempotencyKey}`;
      const { data: settleTxId, error: settleError } = await supabase.rpc("settle_withdrawal_funds", {
        p_user_id: input.userId,
        p_asset: asset,
        p_net_amount: amountNum,
        p_fee_amount: feeNum,
        p_tx_hash: submitResult.txHash || "0x",
        p_idempotency_key: settlementKey,
      });

      if (settleError) {
        logger.error("Settlement ledger call failed after custodial broadcast", { settleError, withdrawalId });
        // Mark as BROADCASTED so background reconciler can investigate
        await supabase
          .from("withdrawal_requests")
          .update({
            status: "BROADCASTED",
            provider_operation_id: submitResult.providerTxId,
            tx_hash: submitResult.txHash,
          })
          .eq("id", withdrawalId);
      } else {
        await supabase
          .from("withdrawal_requests")
          .update({
            status: "CONFIRMED",
            provider_operation_id: submitResult.providerTxId,
            tx_hash: submitResult.txHash,
            settlement_tx_id: settleTxId,
          })
          .eq("id", withdrawalId);
      }

      // In-App Notification
      await notificationService.createNotification({
        userId: input.userId,
        title: "Withdrawal Broadcasted",
        message: `Your withdrawal of ${input.amount} ${asset} on ${network} has been submitted to the blockchain.`,
        type: "WITHDRAWAL_CONFIRMED",
        idempotencyKey: `notif-wdl-conf-${input.idempotencyKey}`,
        metadata: { withdrawalId, txHash: submitResult.txHash, asset, network },
      });

      return {
        withdrawalId,
        referenceId,
        asset,
        network,
        destinationAddress: input.destinationAddress,
        netAmount: input.amount,
        feeAmount: feeQuote.networkFee,
        totalDebit: totalDebitStr,
        status: "CONFIRMED",
        txHash: submitResult.txHash,
        isSandbox: submitResult.isSandbox,
        createdAt: withdrawalRecord.created_at,
      };
    } catch (providerError: unknown) {
      // 10. PHASE 2b: Compensating Rollback if provider rejected
      logger.error("Custody provider rejected withdrawal; initiating compensating rollback", {
        providerError,
        withdrawalId,
      });

      const rollbackKey = `rbk-${input.idempotencyKey}`;
      await supabase.rpc("rollback_withdrawal_funds", {
        p_user_id: input.userId,
        p_asset: asset,
        p_total_debit: totalDebitNum,
        p_idempotency_key: rollbackKey,
      });

      const errorMessage = providerError instanceof Error ? providerError.message : "Provider broadcast failed";

      await supabase
        .from("withdrawal_requests")
        .update({ status: "FAILED", error_reason: errorMessage })
        .eq("id", withdrawalId);

      await notificationService.createNotification({
        userId: input.userId,
        title: "Withdrawal Failed",
        message: `Withdrawal of ${input.amount} ${asset} could not be completed. Your funds have been restored to available balance.`,
        type: "WITHDRAWAL_FAILED",
        idempotencyKey: `notif-wdl-fail-${input.idempotencyKey}`,
        metadata: { withdrawalId, errorReason: errorMessage },
      });

      throw new AppError(
        `Withdrawal failed: ${errorMessage}. Reserved funds have been safely returned to your wallet.`,
        "WITHDRAWAL_FAILED",
        400
      );
    }
  }

  async checkWithdrawalEligibility(userId: string): Promise<{
    eligible: boolean;
    reason?: string;
    remainingHours?: number;
  }> {
    const supabase = await createServerClient();
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("created_at")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.created_at) {
      const hoursSinceCreation = (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceCreation < 72) {
        const remaining = Math.max(1, Math.ceil(72 - hoursSinceCreation));
        return {
          eligible: false,
          reason: "can't withdraw on new device wait for 72hrs",
          remainingHours: remaining,
        };
      }
    }

    const { checkUserActiveRestriction } = await import("@/lib/admin/restrictions");
    const isWithdrawalRestricted = await checkUserActiveRestriction(userId, "EXTERNAL_WITHDRAWAL");
    if (isWithdrawalRestricted) {
      return {
        eligible: false,
        reason: "Account restriction active: External withdrawals are temporarily suspended for this account.",
      };
    }

    return { eligible: true };
  }
}

export const withdrawalService = new WithdrawalService();
