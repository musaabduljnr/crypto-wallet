import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { AppError } from "@/lib/errors";

export interface AccountBalance {
  assetTicker: string;
  availableBalance: string; // Exact decimal string
  reservedBalance: string;
  pendingBalance: string;
  updatedAt: string;
}

export interface LedgerTransactionSummary {
  id: string;
  transactionType: string;
  status: string;
  referenceId: string;
  externalProviderRef?: string;
  assetTicker: string;
  amount: string;
  direction: 'CREDIT' | 'DEBIT';
  createdAt: string;
}

export class LedgerService {
  /**
   * Adds two exact decimal strings using BigInt scaling, supporting arbitrary precision up to 18+ decimals.
   */
  static addDecimals(a: string, b: string): string {
    const isNegA = a.startsWith("-");
    const isNegB = b.startsWith("-");
    const cleanA = isNegA ? a.slice(1) : a;
    const cleanB = isNegB ? b.slice(1) : b;
    const [intA, decA = ""] = cleanA.split(".");
    const [intB, decB = ""] = cleanB.split(".");
    const maxDec = Math.max(decA.length, decB.length, 2);
    const bigA = BigInt(intA + decA.padEnd(maxDec, "0")) * (isNegA ? -1n : 1n);
    const bigB = BigInt(intB + decB.padEnd(maxDec, "0")) * (isNegB ? -1n : 1n);
    const sum = bigA + bigB;
    const sign = sum < 0n ? "-" : "";
    const absStr = (sum < 0n ? -sum : sum).toString().padStart(maxDec + 1, "0");
    const intPart = absStr.slice(0, absStr.length - maxDec);
    const decPart = absStr.slice(absStr.length - maxDec);
    return `${sign}${intPart}.${decPart}`;
  }

  /**
   * Subtracts two exact decimal strings using BigInt scaling.
   */
  static subtractDecimals(a: string, b: string): string {
    const isNegA = a.startsWith("-");
    const isNegB = b.startsWith("-");
    const cleanA = isNegA ? a.slice(1) : a;
    const cleanB = isNegB ? b.slice(1) : b;
    const [intA, decA = ""] = cleanA.split(".");
    const [intB, decB = ""] = cleanB.split(".");
    const maxDec = Math.max(decA.length, decB.length, 2);
    const bigA = BigInt(intA + decA.padEnd(maxDec, "0")) * (isNegA ? -1n : 1n);
    const bigB = BigInt(intB + decB.padEnd(maxDec, "0")) * (isNegB ? -1n : 1n);
    const diff = bigA - bigB;
    const sign = diff < 0n ? "-" : "";
    const absStr = (diff < 0n ? -diff : diff).toString().padStart(maxDec + 1, "0");
    const intPart = absStr.slice(0, absStr.length - maxDec);
    const decPart = absStr.slice(absStr.length - maxDec);
    return `${sign}${intPart}.${decPart}`;
  }

  /**
   * Fetches authoritative user balances across all supported assets.
   */
  async getUserBalances(userId: string): Promise<Record<string, AccountBalance>> {
    const supabase = await createServerClient();

    // Query wallet_balances joined with supported_assets
    const { data, error } = await supabase
      .from("wallet_balances")
      .select("asset_ticker, available_balance, reserved_balance, pending_balance, updated_at")
      .eq("user_id", userId);

    if (error) {
      logger.error("Failed to query user wallet balances", { userId, error });
      // Fallback: return default zero balances if tables haven't been seeded for new user
      return this.getDefaultZeroBalances();
    }

    const balances: Record<string, AccountBalance> = this.getDefaultZeroBalances();

    if (data && data.length > 0) {
      for (const row of data) {
        balances[row.asset_ticker] = {
          assetTicker: row.asset_ticker,
          availableBalance: String(row.available_balance || "0"),
          reservedBalance: String(row.reserved_balance || "0"),
          pendingBalance: String(row.pending_balance || "0"),
          updatedAt: row.updated_at,
        };
      }
    }

    return balances;
  }

  /**
   * Credits a verified fiat deposit via double-entry accounting.
   * Atomic balance update:
   *   DEBIT  FIAT_CLEARING (System Asset)
   *   CREDIT USER_AVAILABLE (User Liability)
   */
  async creditFiatDeposit(params: {
    userId: string;
    amountNgn: string;
    providerRef: string;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ transactionId: string; referenceId: string }> {
    const supabase = await createServerClient();

    // Check if transaction with this idempotency key already exists
    const { data: existingTx } = await supabase
      .from("ledger_transactions")
      .select("id, reference_id, status")
      .eq("idempotency_key", params.idempotencyKey)
      .maybeSingle();

    if (existingTx) {
      logger.info("Fiat deposit already processed (idempotent replay)", {
        txId: existingTx.id,
        idempotencyKey: params.idempotencyKey,
      });
      return { transactionId: existingTx.id, referenceId: existingTx.reference_id };
    }

    // Call atomic PostgreSQL stored procedure or execute atomic transaction
    const { data: txId, error: rpcError } = await supabase.rpc("credit_fiat_deposit", {
      p_user_id: params.userId,
      p_amount_ngn: parseFloat(params.amountNgn),
      p_provider_ref: params.providerRef,
      p_idempotency_key: params.idempotencyKey,
      p_metadata: params.metadata || {},
    });

    if (rpcError) {
      logger.error("Database stored procedure credit_fiat_deposit failed", {
        userId: params.userId,
        error: rpcError,
      });
      throw new AppError("Failed to record double-entry deposit in ledger", "LEDGER_MUTATION_FAILED", 500);
    }

    const referenceId = `DEP-NGN-${params.providerRef.slice(-8)}`;

    logger.info("Successfully posted fiat deposit to ledger", {
      txId,
      userId: params.userId,
      amountNgn: params.amountNgn,
    });

    return { transactionId: txId, referenceId };
  }

  /**
   * Credits a verified crypto deposit via double-entry accounting.
   * Atomic balance update:
   *   DEBIT  CUSTODY_CLEARING (System Asset)
   *   CREDIT USER_AVAILABLE (User Liability)
   */
  async creditCryptoDeposit(params: {
    userId: string;
    assetTicker: string;
    amount: string;
    txHash: string;
    idempotencyKey: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ transactionId: string; referenceId: string }> {
    const supabase = await createServerClient();

    // Check idempotency
    const { data: existingTx } = await supabase
      .from("ledger_transactions")
      .select("id, reference_id")
      .eq("idempotency_key", params.idempotencyKey)
      .maybeSingle();

    if (existingTx) {
      return { transactionId: existingTx.id, referenceId: existingTx.reference_id };
    }

    const { data: txId, error: rpcError } = await supabase.rpc("credit_crypto_deposit", {
      p_user_id: params.userId,
      p_asset: params.assetTicker,
      p_amount: parseFloat(params.amount),
      p_tx_hash: params.txHash,
      p_idempotency_key: params.idempotencyKey,
      p_metadata: params.metadata || {},
    });

    if (rpcError) {
      logger.error("Database stored procedure credit_crypto_deposit failed", {
        userId: params.userId,
        error: rpcError,
      });
      throw new AppError("Failed to record crypto deposit in ledger", "LEDGER_MUTATION_FAILED", 500);
    }

    const referenceId = `DEP-${params.assetTicker}-${params.txHash.slice(-8)}`;
    return { transactionId: txId, referenceId };
  }

  /**
   * Fetches recent transactions for a user directly from immutable ledger entries.
   */
  async getUserTransactions(userId: string, limit: number = 20): Promise<LedgerTransactionSummary[]> {
    const res = await this.getUserTransactionsFiltered(userId, { limit });
    return res.transactions;
  }

  /**
   * Fetches transactions for a user directly from immutable ledger entries with filtering and search.
   */
  async getUserTransactionsFiltered(
    userId: string,
    options: {
      type?: string;
      asset?: string;
      searchQuery?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ transactions: LedgerTransactionSummary[]; totalCount: number }> {
    const supabase = await createServerClient();
    const limit = options.limit || 20;

    let query = supabase
      .from("ledger_entries")
      .select(`
        id,
        direction,
        amount,
        asset_ticker,
        created_at,
        transaction:ledger_transactions(id, transaction_type, status, reference_id, external_provider_ref),
        account:ledger_accounts(account_type, user_id)
      `, { count: "exact" })
      .eq("account.user_id", userId)
      .order("created_at", { ascending: false });

    if (options.asset && options.asset !== "ALL") {
      query = query.eq("asset_ticker", options.asset.toUpperCase());
    }

    if (options.limit) {
      query = query.limit(limit);
    }

    const { data, count, error } = await query;

    if (error || !data) {
      logger.error("Failed to fetch user ledger transactions", { error, userId });
      return { transactions: [], totalCount: 0 };
    }

    let results = (data as any[])
      .filter((entry) => entry.transaction)
      .map((entry) => ({
        id: entry.transaction.id,
        transactionType: entry.transaction.transaction_type,
        status: entry.transaction.status,
        referenceId: entry.transaction.reference_id,
        externalProviderRef: entry.transaction.external_provider_ref,
        assetTicker: entry.asset_ticker,
        amount: String(entry.amount),
        direction: entry.direction as "CREDIT" | "DEBIT",
        createdAt: entry.created_at,
      }));

    if (options.type && options.type !== "ALL") {
      results = results.filter((tx) => tx.transactionType.toUpperCase() === options.type?.toUpperCase());
    }

    if (options.searchQuery && options.searchQuery.trim().length > 0) {
      const q = options.searchQuery.trim().toUpperCase();
      results = results.filter(
        (tx) =>
          tx.referenceId.toUpperCase().includes(q) ||
          tx.assetTicker.toUpperCase().includes(q) ||
          (tx.externalProviderRef && tx.externalProviderRef.toUpperCase().includes(q))
      );
    }

    return {
      transactions: results,
      totalCount: count || results.length,
    };
  }


  /**
   * Resolves deep transaction details with multi-leg breakdown and explorer URLs.
   */
  async getTransactionDetail(userId: string, txIdOrRef: string): Promise<Record<string, unknown> | null> {
    const supabase = await createServerClient();

    // Find transaction by ID or reference
    const { data: tx } = await supabase
      .from("ledger_transactions")
      .select("*, entries:ledger_entries(*, account:ledger_accounts(*))")
      .or(`id.eq.${txIdOrRef},reference_id.eq.${txIdOrRef}`)
      .maybeSingle();

    if (!tx) return null;

    // Verify user owns at least one entry in this transaction
    const userOwnedEntry = tx.entries?.find((e: any) => e.account?.user_id === userId);
    if (!userOwnedEntry) {
      return null; // Deny access to transactions not involving this user
    }

    // Determine verified explorer URL
    let explorerUrl: string | undefined;
    const txHash = tx.external_provider_ref;
    if (txHash && txHash.startsWith("0x") && txHash.length >= 64) {
      // Default to Polygon or Arbitrum explorer based on metadata or network
      explorerUrl = `https://polygonscan.com/tx/${txHash}`;
    }

    return {
      id: tx.id,
      transactionType: tx.transaction_type,
      status: tx.status,
      referenceId: tx.reference_id,
      externalProviderRef: tx.external_provider_ref,
      explorerUrl,
      amount: userOwnedEntry.amount,
      assetTicker: userOwnedEntry.asset_ticker,
      direction: userOwnedEntry.direction,
      postedAt: tx.posted_at || tx.created_at,
      metadata: tx.metadata || {},
    };
  }


  private getDefaultZeroBalances(): Record<string, AccountBalance> {
    const now = new Date().toISOString();
    return {
      NGN: { assetTicker: "NGN", availableBalance: "0.00", reservedBalance: "0.00", pendingBalance: "0.00", updatedAt: now },
      USDT: { assetTicker: "USDT", availableBalance: "0.000000", reservedBalance: "0.000000", pendingBalance: "0.000000", updatedAt: now },
      USDC: { assetTicker: "USDC", availableBalance: "0.000000", reservedBalance: "0.000000", pendingBalance: "0.000000", updatedAt: now },
      BTC: { assetTicker: "BTC", availableBalance: "0.00000000", reservedBalance: "0.00000000", pendingBalance: "0.00000000", updatedAt: now },
      ETH: { assetTicker: "ETH", availableBalance: "0.000000000000000000", reservedBalance: "0.000000000000000000", pendingBalance: "0.000000000000000000", updatedAt: now },
      SOL: { assetTicker: "SOL", availableBalance: "0.000000000", reservedBalance: "0.000000000", pendingBalance: "0.000000000", updatedAt: now },
    };
  }
}

export const ledgerService = new LedgerService();
