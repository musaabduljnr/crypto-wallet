import crypto from "crypto";
import { createServerClient } from "@/lib/supabase/server";
import { providers } from "@/lib/providers/registry";
import { ledgerService } from "./ledger.service";
import { notificationService } from "./notification.service";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";

export interface RequestSwapQuoteInput {
  userId: string;
  sourceAsset: string;
  destinationAsset: string;
  sourceAmount: string;
}

export interface SwapQuoteResult {
  quoteId: string;
  sourceAsset: string;
  destinationAsset: string;
  sourceAmount: string;
  grossDestinationAmount: string;
  netReceivedAmount: string;
  platformFeeAmount: string;
  exchangeRate: string; // Rate = 1 Source Asset in Destination Asset
  expiresAt: string; // ISO timestamp (30s TTL)
  ttlSeconds: number;
}

export interface ExecuteSwapInput {
  userId: string;
  quoteId: string;
  idempotencyKey: string;
}

export interface SwapExecutionReceipt {
  swapId: string;
  referenceId: string;
  sourceAsset: string;
  sourceAmount: string;
  destinationAsset: string;
  destinationAmount: string;
  feeAmount: string;
  exchangeRate: string;
  status: "COMPLETED" | "FAILED";
  timestamp: string;
}

export class SwapService {
  private readonly PLATFORM_FEE_BPS = 50; // 0.50% (50 basis points)

  /**
   * Generates a guaranteed 30-second RFQ swap quote based on real-time price feeds.
   */
  async requestQuote(input: RequestSwapQuoteInput): Promise<SwapQuoteResult> {
    const src = input.sourceAsset.toUpperCase();
    const dst = input.destinationAsset.toUpperCase();
    const srcAmountNum = parseFloat(input.sourceAmount);

    if (src === dst) {
      throw new AppError("Source and destination assets must be different", "INVALID_ASSET_PAIR", 400);
    }

    if (isNaN(srcAmountNum) || srcAmountNum <= 0) {
      throw new AppError("Swap amount must be greater than zero", "INVALID_AMOUNT", 400);
    }

    const priceFeed = providers.getPriceFeedAdapter();
    const [srcPriceInfo, dstPriceInfo] = await Promise.all([
      priceFeed.getAssetPrice(src),
      priceFeed.getAssetPrice(dst),
    ]);

    if (!srcPriceInfo || !dstPriceInfo) {
      throw new AppError("Price feed unavailable for requested asset pair", "PRICE_FEED_UNAVAILABLE", 503);
    }

    // Rate: units of destination asset per 1 unit of source asset
    const exchangeRate = srcPriceInfo.priceUsd / dstPriceInfo.priceUsd;
    const grossDestAmount = srcAmountNum * exchangeRate;
    const feeAmount = (grossDestAmount * this.PLATFORM_FEE_BPS) / 10000;
    const netReceived = grossDestAmount - feeAmount;

    // Formatting based on destination asset type
    const isCrypto = dst !== "NGN";
    const decimals = isCrypto ? (["BTC", "ETH"].includes(dst) ? 6 : 4) : 2;

    const rateStr = exchangeRate.toFixed(6);
    const grossStr = grossDestAmount.toFixed(decimals);
    const feeStr = feeAmount.toFixed(decimals);
    const netStr = netReceived.toFixed(decimals);

    // 30-Second TTL guarantee
    const now = Date.now();
    const expiresAt = new Date(now + 30 * 1000).toISOString();

    const supabase = await createServerClient();

    const { data: quoteRecord, error } = await supabase
      .from("swap_quotes")
      .insert({
        user_id: input.userId,
        source_asset: src,
        destination_asset: dst,
        source_amount: srcAmountNum,
        destination_amount: grossDestAmount,
        net_received_amount: netReceived,
        platform_fee_amount: feeAmount,
        exchange_rate: exchangeRate,
        expires_at: expiresAt,
        status: "ACTIVE",
      })
      .select("id")
      .single();

    if (error || !quoteRecord) {
      logger.error("Failed to store swap quote in database", { error, userId: input.userId });
      throw new AppError("Failed to lock swap quote", "QUOTE_GENERATION_FAILED", 500);
    }

    return {
      quoteId: quoteRecord.id,
      sourceAsset: src,
      destinationAsset: dst,
      sourceAmount: input.sourceAmount,
      grossDestinationAmount: grossStr,
      netReceivedAmount: netStr,
      platformFeeAmount: feeStr,
      exchangeRate: rateStr,
      expiresAt,
      ttlSeconds: 30,
    };
  }

  /**
   * Executes a locked swap quote atomically.
   * Rejects expired quotes, verifies available balance, and executes double-entry settlement.
   */
  async executeSwap(input: ExecuteSwapInput): Promise<SwapExecutionReceipt> {
    // Server-enforced account restriction check
    const { checkUserActiveRestriction } = await import("@/lib/admin/restrictions");
    const isSwapRestricted = await checkUserActiveRestriction(input.userId, "SWAP");
    if (isSwapRestricted) {
      throw new AppError(
        "Account restriction active: Asset conversions and swaps are temporarily disabled for this account.",
        "ACCOUNT_RESTRICTED",
        403
      );
    }

    const supabase = await createServerClient();

    // 1. Fetch quote
    const { data: quote, error: fetchError } = await supabase
      .from("swap_quotes")
      .select("*")
      .eq("id", input.quoteId)
      .eq("user_id", input.userId)
      .single();

    if (fetchError || !quote) {
      throw new AppError("Invalid or missing swap quote", "QUOTE_NOT_FOUND", 404);
    }

    // 2. Idempotency check
    if (quote.status === "EXECUTED") {
      logger.info("Idempotent replay of executed swap quote", { quoteId: quote.id });
      return {
        swapId: quote.id,
        referenceId: `SWP-${quote.id.slice(0, 8).toUpperCase()}`,
        sourceAsset: quote.source_asset,
        sourceAmount: String(quote.source_amount),
        destinationAsset: quote.destination_asset,
        destinationAmount: String(quote.net_received_amount),
        feeAmount: String(quote.platform_fee_amount),
        exchangeRate: String(quote.exchange_rate),
        status: "COMPLETED",
        timestamp: quote.created_at,
      };
    }

    // 3. Expiration Check
    const expiryTime = new Date(quote.expires_at).getTime();
    if (Date.now() > expiryTime) {
      await supabase.from("swap_quotes").update({ status: "EXPIRED" }).eq("id", quote.id);
      throw new AppError(
        "Swap quote has expired. Rate guarantees last for 30 seconds. Please request a fresh quote.",
        "ERR_QUOTE_EXPIRED",
        400
      );
    }

    // 4. Source Balance Check
    const balances = await ledgerService.getUserBalances(input.userId);
    const srcBal = balances[quote.source_asset];
    const available = srcBal ? parseFloat(srcBal.availableBalance) : 0;
    const required = parseFloat(quote.source_amount);

    if (available < required) {
      throw new AppError(
        `Insufficient ${quote.source_asset} balance to complete swap. Available: ${available.toFixed(4)}, Required: ${required.toFixed(4)}`,
        "INSUFFICIENT_FUNDS",
        400
      );
    }

    const referenceId = `SWP-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    // 5. Atomic Double-Entry Settlement via stored procedure
    const { data: txId, error: rpcError } = await supabase.rpc("execute_swap_settlement", {
      p_user_id: input.userId,
      p_source_asset: quote.source_asset,
      p_source_amount: quote.source_amount,
      p_destination_asset: quote.destination_asset,
      p_destination_amount: quote.net_received_amount,
      p_fee_amount: quote.platform_fee_amount,
      p_reference_id: referenceId,
      p_idempotency_key: input.idempotencyKey,
    });

    if (rpcError) {
      logger.error("Failed to execute swap settlement in ledger", { rpcError, quoteId: quote.id });
      await supabase.from("swap_quotes").update({ status: "FAILED" }).eq("id", quote.id);
      throw new AppError("Failed to settle swap in ledger", "SWAP_SETTLEMENT_FAILED", 500);
    }

    // 6. Update quote status to EXECUTED
    await supabase
      .from("swap_quotes")
      .update({
        status: "EXECUTED",
        idempotency_key: input.idempotencyKey,
        ledger_transaction_id: txId,
      })
      .eq("id", quote.id);

    const timestamp = new Date().toISOString();

    // 7. In-App Notification
    await notificationService.createNotification({
      userId: input.userId,
      title: "Swap Completed",
      message: `Successfully swapped ${quote.source_amount} ${quote.source_asset} for ${quote.net_received_amount} ${quote.destination_asset}.`,
      type: "SWAP_COMPLETED",
      idempotencyKey: `notif-swp-${input.idempotencyKey}`,
      metadata: {
        referenceId,
        sourceAsset: quote.source_asset,
        sourceAmount: quote.source_amount,
        destinationAsset: quote.destination_asset,
        netReceived: quote.net_received_amount,
      },
    });

    logger.info("Swap executed successfully", {
      quoteId: quote.id,
      referenceId,
      sourceAsset: quote.source_asset,
      destinationAsset: quote.destination_asset,
    });

    return {
      swapId: quote.id,
      referenceId,
      sourceAsset: quote.source_asset,
      sourceAmount: String(quote.source_amount),
      destinationAsset: quote.destination_asset,
      destinationAmount: String(quote.net_received_amount),
      feeAmount: String(quote.platform_fee_amount),
      exchangeRate: String(quote.exchange_rate),
      status: "COMPLETED",
      timestamp,
    };
  }
}

export const swapService = new SwapService();
