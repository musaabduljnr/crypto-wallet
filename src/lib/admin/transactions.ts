import { createServerClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { getAdminNotes, AdminNoteRecord } from "./users";

export interface AdminTransactionListItem {
  id: string;
  referenceId: string;
  transactionType: string;
  status: string;
  amount: string;
  asset: string;
  providerRef: string | null;
  createdAt: string;
  postedAt: string | null;
}

export interface AdminTransactionDetail {
  id: string;
  referenceId: string;
  transactionType: string;
  status: string;
  providerRef: string | null;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  postedAt: string | null;
  entries: {
    id: string;
    accountId: string;
    accountType: string;
    userId: string | null;
    userEmail?: string;
    direction: "DEBIT" | "CREDIT";
    amount: string;
    assetTicker: string;
  }[];
  notes: AdminNoteRecord[];
}

/**
 * Lists global platform transactions with filtering across types, assets, and statuses.
 */
export async function listAdminTransactions(params?: {
  type?: string;
  asset?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ transactions: AdminTransactionListItem[]; total: number }> {
  const supabase = await createServerClient();
  const limit = params?.limit || 50;
  const offset = params?.offset || 0;

  let query = supabase
    .from("ledger_transactions")
    .select("*, entries:ledger_entries(amount, asset_ticker, direction)", { count: "exact" });

  if (params?.type) {
    query = query.eq("transaction_type", params.type);
  }
  if (params?.status) {
    query = query.eq("status", params.status);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !data) return { transactions: [], total: 0 };

  const transactions: AdminTransactionListItem[] = data.map((tx: any) => {
    const firstEntry = tx.entries?.[0];
    const amount = firstEntry ? String(firstEntry.amount) : "0.00";
    const asset = firstEntry ? firstEntry.asset_ticker : "USD";

    return {
      id: tx.id,
      referenceId: tx.reference_id || `TX-${tx.id.slice(0, 8).toUpperCase()}`,
      transactionType: tx.transaction_type,
      status: tx.status,
      amount,
      asset,
      providerRef: tx.external_provider_ref,
      createdAt: tx.created_at,
      postedAt: tx.posted_at,
    };
  });

  return { transactions, total: count || transactions.length };
}

/**
 * Retrieves full transaction investigation details including double-entry ledger entries.
 */
export async function getAdminTransactionDetails(transactionId: string): Promise<AdminTransactionDetail> {
  const supabase = await createServerClient();

  const { data: tx, error: txErr } = await supabase
    .from("ledger_transactions")
    .select("*")
    .eq("id", transactionId)
    .maybeSingle();

  if (txErr || !tx) {
    throw new AppError("Transaction not found", "TRANSACTION_NOT_FOUND", 404);
  }

  // Fetch double-entry ledger entries
  const { data: entries, error: entriesErr } = await supabase
    .from("ledger_entries")
    .select("*, account:account_id(account_type, user_id)")
    .eq("transaction_id", transactionId);

  if (entriesErr) {
    throw new AppError("Failed to fetch transaction entries", "ENTRIES_FETCH_FAILED", 500);
  }

  const mappedEntries = (entries || []).map((e: any) => ({
    id: e.id,
    accountId: e.account_id,
    accountType: e.account?.account_type || "UNKNOWN",
    userId: e.account?.user_id || null,
    direction: e.direction,
    amount: String(e.amount),
    assetTicker: e.asset_ticker,
  }));

  const notes = await getAdminNotes("TRANSACTION", transactionId);

  return {
    id: tx.id,
    referenceId: tx.reference_id || `TX-${tx.id.slice(0, 8).toUpperCase()}`,
    transactionType: tx.transaction_type,
    status: tx.status,
    providerRef: tx.external_provider_ref,
    idempotencyKey: tx.idempotency_key,
    metadata: tx.metadata || {},
    createdAt: tx.created_at,
    postedAt: tx.posted_at,
    entries: mappedEntries,
    notes,
  };
}
