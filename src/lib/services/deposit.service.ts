import { createServerClient } from "@/lib/supabase/server";
import { providers } from "@/lib/providers/registry";
import { ledgerService } from "./ledger.service";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";

export interface GetDepositAddressInput {
  userId: string;
  asset: string;
  network: string;
}

export interface DepositAddressOutput {
  address: string;
  asset: string;
  network: string;
  confirmationDepth: number;
  memoOrTag?: string;
  isSandbox: boolean;
}

export interface CryptoDepositRecord {
  id: string;
  assetTicker: string;
  networkId: string;
  txHash: string;
  amount: string;
  confirmations: number;
  requiredConfirmations: number;
  status: "DETECTED" | "CONFIRMED" | "FAILED";
  createdAt: string;
}

export class DepositService {
  async getOrCreateDepositAddress(input: GetDepositAddressInput): Promise<DepositAddressOutput> {
    const asset = input.asset.toUpperCase();
    const network = input.network.toUpperCase();
    const adapter = providers.getCustodyWalletAdapter();
    const supabase = await createServerClient();

    // Check if user already has an assigned address for this asset and network
    const { data: existing } = await supabase
      .from("crypto_deposit_addresses")
      .select("address, memo_or_tag")
      .eq("user_id", input.userId)
      .eq("asset_ticker", asset)
      .eq("network_id", network)
      .eq("is_active", true)
      .maybeSingle();

    const confirmationDepth = adapter.getConfirmationDepth(network);

    if (existing) {
      return {
        address: existing.address,
        asset,
        network,
        confirmationDepth,
        memoOrTag: existing.memo_or_tag || undefined,
        isSandbox: adapter.isSandbox,
      };
    }

    // Call custody adapter to provision address
    const result = await adapter.generateDepositAddress({
      userId: input.userId,
      asset,
      network,
    });

    // Validate format
    if (!adapter.validateAddress(result.address, network)) {
      throw new AppError("Invalid generated address format", "ADDRESS_VALIDATION_FAILED", 500);
    }

    // Store persistently in database
    await supabase
      .from("crypto_deposit_addresses")
      .insert({
        user_id: input.userId,
        asset_ticker: asset,
        network_id: network,
        address: result.address,
        memo_or_tag: result.memoOrTag,
      })
      .select()
      .maybeSingle();

    return {
      address: result.address,
      asset,
      network,
      confirmationDepth,
      memoOrTag: result.memoOrTag,
      isSandbox: result.isSandbox,
    };
  }

  /**
   * Processes inbound blockchain deposit events (from custody provider or blockchain indexer).
   * Enforces confirmation depth policy before releasing funds into ledger available balance.
   */
  async processDepositWebhook(rawBody: string, signature: string): Promise<{ success: boolean; status: string }> {
    const adapter = providers.getCustodyWalletAdapter();

    // 1. Signature check
    const isValid = adapter.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      throw new AppError("Invalid custody webhook signature", "UNAUTHORIZED_WEBHOOK", 401);
    }

    const event = adapter.parseDepositWebhook(rawBody);
    const supabase = await createServerClient();

    // 2. Identify recipient user from deposit address
    const { data: addressRecord } = await supabase
      .from("crypto_deposit_addresses")
      .select("user_id, asset_ticker, network_id")
      .eq("address", event.toAddress)
      .eq("network_id", event.network)
      .maybeSingle();

    if (!addressRecord) {
      logger.warn("Received deposit for unknown recipient address", { address: event.toAddress, network: event.network });
      return { success: false, status: "UNKNOWN_ADDRESS" };
    }

    // 3. Record or update crypto_deposits entry
    const { data: existingDeposit } = await supabase
      .from("crypto_deposits")
      .select("id, status, ledger_transaction_id")
      .eq("network_id", event.network)
      .eq("tx_hash", event.externalTxHash)
      .maybeSingle();

    let depositId = existingDeposit?.id;

    if (!existingDeposit) {
      const { data: newDeposit } = await supabase
        .from("crypto_deposits")
        .insert({
          user_id: addressRecord.user_id,
          asset_ticker: event.asset,
          network_id: event.network,
          tx_hash: event.externalTxHash,
          from_address: event.fromAddress,
          to_address: event.toAddress,
          amount: parseFloat(event.amount),
          confirmations: event.confirmations,
          required_confirmations: event.requiredConfirmations,
          status: event.status,
          metadata: event.rawPayload,
        })
        .select("id")
        .single();
      depositId = newDeposit?.id;
    } else {
      await supabase
        .from("crypto_deposits")
        .update({
          confirmations: event.confirmations,
          status: event.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingDeposit.id);
    }

    // 4. Double-Entry Settlement when CONFIRMED
    if (event.status === "CONFIRMED" && (!existingDeposit || existingDeposit.status !== "CONFIRMED")) {
      const ledgerTx = await ledgerService.creditCryptoDeposit({
        userId: addressRecord.user_id,
        assetTicker: event.asset,
        amount: event.amount,
        txHash: event.externalTxHash,
        idempotencyKey: `LEDGER-CRYPTO-${event.network}-${event.externalTxHash}`,
        metadata: {
          from: event.fromAddress,
          to: event.toAddress,
          network: event.network,
          block: event.blockNumber,
        },
      });

      // Link ledger transaction
      if (depositId) {
        await supabase
          .from("crypto_deposits")
          .update({ ledger_transaction_id: ledgerTx.transactionId })
          .eq("id", depositId);
      }

      logger.info("Inbound crypto deposit confirmed and posted to ledger", {
        txHash: event.externalTxHash,
        asset: event.asset,
        amount: event.amount,
        userId: addressRecord.user_id,
      });

      return { success: true, status: "CONFIRMED_AND_CREDITED" };
    }

    return { success: true, status: "DETECTED_PENDING_CONFIRMATIONS" };
  }

  async getUserDeposits(userId: string): Promise<CryptoDepositRecord[]> {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("crypto_deposits")
      .select("id, asset_ticker, network_id, tx_hash, amount, confirmations, required_confirmations, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error || !data) return [];

    return data.map((d: any) => ({
      id: d.id,
      assetTicker: d.asset_ticker,
      networkId: d.network_id,
      txHash: d.tx_hash,
      amount: String(d.amount),
      confirmations: d.confirmations,
      requiredConfirmations: d.required_confirmations,
      status: d.status,
      createdAt: d.created_at,
    }));
  }
}

export const depositService = new DepositService();
