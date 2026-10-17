import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { getAdminNotes, AdminNoteRecord } from "./users";
import { recordAdminAuditLog } from "./audit";
import { AuthenticatedStaff } from "./auth";

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
  const supabase = createAdminClient();
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
  const supabase = createAdminClient();

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

export interface AdminCreateTransactionInput {
  userId: string;
  type: string;
  asset: string;
  amount: string;
  direction: "CREDIT" | "DEBIT";
  status: "POSTED" | "PENDING" | "FAILED" | "REVERSED" | "COMPLETED";
  referenceId?: string;
  providerRef?: string;
  note?: string;
  createdAt?: string;
}

/**
 * Super Admin manually adds a double-entry ledger transaction for any customer account.
 */
export async function adminCreateTransaction(
  staff: AuthenticatedStaff,
  input: AdminCreateTransactionInput
): Promise<{ id: string; referenceId: string }> {
  const amountNum = parseFloat(input.amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    throw new AppError("Transaction amount must be a positive number", "INVALID_AMOUNT", 400);
  }

  const asset = input.asset.toUpperCase();
  const validAssets = ["USD", "USDT", "USDC", "BTC", "ETH", "SOL"];
  if (!validAssets.includes(asset)) {
    throw new AppError(`Unsupported asset: ${asset}`, "INVALID_ASSET", 400);
  }

  const adminSupabase = createAdminClient();

  // 1. Verify target user profile exists
  const { data: userProfile, error: uErr } = await adminSupabase
    .from("user_profiles")
    .select("id")
    .eq("id", input.userId)
    .maybeSingle();

  if (uErr || !userProfile) {
    throw new AppError("Target user not found", "USER_NOT_FOUND", 404);
  }

  // 2. Resolve or create user ledger account
  const { data: userAcctId, error: userAcctErr } = await adminSupabase.rpc(
    "get_or_create_user_account",
    {
      p_user_id: input.userId,
      p_account_type: "USER_AVAILABLE",
      p_asset: asset,
    }
  );

  if (userAcctErr || !userAcctId) {
    throw new AppError(
      `Failed to initialize user ledger account: ${userAcctErr?.message}`,
      "ACCOUNT_INIT_FAILED",
      500
    );
  }

  // 3. Resolve system counterparty reconciliation account
  const { data: systemAcctId, error: sysAcctErr } = await adminSupabase.rpc(
    "get_or_create_system_account",
    {
      p_account_type: "SYSTEM_RECONCILIATION",
      p_asset: asset,
    }
  );

  if (sysAcctErr || !systemAcctId) {
    throw new AppError(
      `Failed to initialize system reconciliation account: ${sysAcctErr?.message}`,
      "SYSTEM_ACCOUNT_FAILED",
      500
    );
  }

  // Map transaction type to DB enum
  let txType = input.type.toUpperCase();
  if (txType === "FUNDING" || txType === "DEPOSIT") txType = asset === "USD" ? "FIAT_DEPOSIT" : "CRYPTO_DEPOSIT";
  if (txType === "WITHDRAWAL") txType = "EXTERNAL_WITHDRAWAL";
  if (txType === "TRANSFER") txType = "INTERNAL_TRANSFER";
  if (txType === "SWAP") txType = "SWAP_CONVERSION";
  if (txType === "ADJUSTMENT") txType = "SYSTEM_RECONCILIATION";

  const validTypes = [
    "FIAT_DEPOSIT",
    "CRYPTO_DEPOSIT",
    "INTERNAL_TRANSFER",
    "EXTERNAL_WITHDRAWAL",
    "SWAP_CONVERSION",
    "FEE_ASSESSMENT",
    "SYSTEM_RECONCILIATION",
  ];
  if (!validTypes.includes(txType)) {
    txType = "SYSTEM_RECONCILIATION";
  }

  let dbStatus = input.status.toUpperCase();
  if (dbStatus === "COMPLETED") dbStatus = "POSTED";

  const refId = input.referenceId?.trim() || `TX-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const nowIso = input.createdAt ? new Date(input.createdAt).toISOString() : new Date().toISOString();

  // 4. Insert ledger transaction header
  const { data: tx, error: txErr } = await adminSupabase
    .from("ledger_transactions")
    .insert({
      transaction_type: txType,
      status: dbStatus,
      reference_id: refId,
      idempotency_key: `adm-${crypto.randomUUID()}`,
      external_provider_ref: input.providerRef?.trim() || null,
      metadata: {
        note: input.note?.trim() || null,
        created_by_admin: staff.email,
        admin_id: staff.id,
        direction: input.direction,
      },
      created_at: nowIso,
      posted_at: dbStatus === "POSTED" ? nowIso : null,
    })
    .select("id, reference_id")
    .single();

  if (txErr || !tx) {
    throw new AppError(`Failed to insert ledger transaction: ${txErr?.message}`, "TX_INSERT_FAILED", 500);
  }

  // 5. Insert double-entry ledger lines
  const userEntryDirection = input.direction;
  const sysEntryDirection = input.direction === "CREDIT" ? "DEBIT" : "CREDIT";

  const { error: entriesErr } = await adminSupabase.from("ledger_entries").insert([
    {
      transaction_id: tx.id,
      account_id: userAcctId,
      direction: userEntryDirection,
      amount: amountNum,
      asset_ticker: asset,
      created_at: nowIso,
    },
    {
      transaction_id: tx.id,
      account_id: systemAcctId,
      direction: sysEntryDirection,
      amount: amountNum,
      asset_ticker: asset,
      created_at: nowIso,
    },
  ]);

  if (entriesErr) {
    throw new AppError(`Failed to insert double-entry ledger entries: ${entriesErr?.message}`, "ENTRIES_FAILED", 500);
  }

  // 6. Update user's wallet_balances if transaction is POSTED
  if (dbStatus === "POSTED") {
    const { data: wb } = await adminSupabase
      .from("wallet_balances")
      .select("available_balance")
      .eq("account_id", userAcctId)
      .maybeSingle();

    const currentBal = parseFloat(wb?.available_balance || "0");
    const delta = input.direction === "CREDIT" ? amountNum : -amountNum;
    const newBal = Math.max(0, currentBal + delta);

    await adminSupabase
      .from("wallet_balances")
      .update({ available_balance: newBal, updated_at: new Date().toISOString() })
      .eq("account_id", userAcctId);
  }

  // 7. Record admin audit trail
  await recordAdminAuditLog({
    actorId: staff.id,
    actorEmail: staff.email,
    actorRole: staff.role,
    actionType: "TRANSACTION_CREATED",
    targetEntityType: "TRANSACTION",
    targetEntityId: tx.id,
    details: {
      userId: input.userId,
      referenceId: tx.reference_id,
      type: txType,
      asset,
      amount: input.amount,
      direction: input.direction,
      status: dbStatus,
    },
    status: "SUCCESS",
  });

  return { id: tx.id, referenceId: tx.reference_id };
}

export interface AdminUpdateTransactionInput {
  transactionId: string;
  status?: string;
  amount?: string;
  referenceId?: string;
  providerRef?: string;
  note?: string;
  createdAt?: string;
}

/**
 * Super Admin edits an existing transaction (status, amount, reference, provider ref, date).
 */
export async function adminUpdateTransaction(
  staff: AuthenticatedStaff,
  input: AdminUpdateTransactionInput
): Promise<{ success: boolean }> {
  const adminSupabase = createAdminClient();

  // 1. Fetch current transaction and its ledger entries
  const { data: tx, error: txErr } = await adminSupabase
    .from("ledger_transactions")
    .select("*, entries:ledger_entries(*, account:account_id(user_id, account_type))")
    .eq("id", input.transactionId)
    .maybeSingle();

  if (txErr || !tx) {
    throw new AppError("Transaction not found", "TRANSACTION_NOT_FOUND", 404);
  }

  const oldStatus = tx.status;
  let newStatus = input.status ? input.status.toUpperCase() : oldStatus;
  if (newStatus === "COMPLETED") newStatus = "POSTED";

  const userEntry = tx.entries?.find((e: any) => e.account?.account_type === "USER_AVAILABLE");
  const oldAmount = userEntry ? parseFloat(userEntry.amount) : 0;
  const newAmount = input.amount !== undefined ? parseFloat(input.amount) : oldAmount;

  if (isNaN(newAmount) || newAmount <= 0) {
    throw new AppError("Transaction amount must be a positive number", "INVALID_AMOUNT", 400);
  }

  // 2. Adjust wallet balance if status or amount changed
  if (userEntry) {
    const userAcctId = userEntry.account_id;
    const direction = userEntry.direction; // 'CREDIT' or 'DEBIT'

    const { data: wb } = await adminSupabase
      .from("wallet_balances")
      .select("available_balance")
      .eq("account_id", userAcctId)
      .maybeSingle();

    let bal = parseFloat(wb?.available_balance || "0");

    // Case A: Was POSTED, becoming non-POSTED -> revert old effect
    if (oldStatus === "POSTED" && newStatus !== "POSTED") {
      bal = direction === "CREDIT" ? Math.max(0, bal - oldAmount) : bal + oldAmount;
    }
    // Case B: Was non-POSTED, becoming POSTED -> apply new effect
    else if (oldStatus !== "POSTED" && newStatus === "POSTED") {
      bal = direction === "CREDIT" ? bal + newAmount : Math.max(0, bal - newAmount);
    }
    // Case C: Remained POSTED, amount changed -> apply delta
    else if (oldStatus === "POSTED" && newStatus === "POSTED" && oldAmount !== newAmount) {
      const delta = newAmount - oldAmount;
      bal = direction === "CREDIT" ? Math.max(0, bal + delta) : Math.max(0, bal - delta);
    }

    if (wb) {
      await adminSupabase
        .from("wallet_balances")
        .update({ available_balance: bal, updated_at: new Date().toISOString() })
        .eq("account_id", userAcctId);
    }

    // Update amount on ledger entries if amount changed
    if (oldAmount !== newAmount) {
      await adminSupabase
        .from("ledger_entries")
        .update({ amount: newAmount })
        .eq("transaction_id", tx.id);
    }
  }

  // 3. Update ledger transaction header
  const updates: Record<string, any> = {
    status: newStatus,
    posted_at: newStatus === "POSTED" ? (tx.posted_at || new Date().toISOString()) : null,
  };

  if (input.referenceId?.trim()) updates.reference_id = input.referenceId.trim();
  if (input.providerRef !== undefined) updates.external_provider_ref = input.providerRef.trim() || null;
  if (input.createdAt) updates.created_at = new Date(input.createdAt).toISOString();

  if (input.note !== undefined) {
    updates.metadata = {
      ...(tx.metadata || {}),
      note: input.note.trim() || null,
      last_edited_by: staff.email,
      last_edited_at: new Date().toISOString(),
    };
  }

  const { error: updateErr } = await adminSupabase
    .from("ledger_transactions")
    .update(updates)
    .eq("id", tx.id);

  if (updateErr) {
    throw new AppError(`Failed to update transaction: ${updateErr.message}`, "TX_UPDATE_FAILED", 500);
  }

  // 4. Audit trail
  await recordAdminAuditLog({
    actorId: staff.id,
    actorEmail: staff.email,
    actorRole: staff.role,
    actionType: "TRANSACTION_UPDATED",
    targetEntityType: "TRANSACTION",
    targetEntityId: tx.id,
    details: {
      oldStatus,
      newStatus,
      oldAmount,
      newAmount,
      referenceId: updates.reference_id || tx.reference_id,
    },
    status: "SUCCESS",
  });

  return { success: true };
}

export interface AdminDeleteTransactionInput {
  transactionId: string;
  reason?: string;
}

/**
 * Super Admin deletes a transaction and its double-entry ledger records, reverting balances cleanly.
 */
export async function adminDeleteTransaction(
  staff: AuthenticatedStaff,
  input: AdminDeleteTransactionInput
): Promise<{ success: boolean }> {
  const adminSupabase = createAdminClient();

  // 1. Fetch transaction and entries
  const { data: tx, error: txErr } = await adminSupabase
    .from("ledger_transactions")
    .select("*, entries:ledger_entries(*, account:account_id(user_id, account_type))")
    .eq("id", input.transactionId)
    .maybeSingle();

  if (txErr || !tx) {
    throw new AppError("Transaction not found", "TRANSACTION_NOT_FOUND", 404);
  }

  // 2. If status was POSTED, revert user's wallet_balance
  if (tx.status === "POSTED") {
    const userEntry = tx.entries?.find((e: any) => e.account?.account_type === "USER_AVAILABLE");
    if (userEntry) {
      const amount = parseFloat(userEntry.amount);
      const direction = userEntry.direction;
      const userAcctId = userEntry.account_id;

      const { data: wb } = await adminSupabase
        .from("wallet_balances")
        .select("available_balance")
        .eq("account_id", userAcctId)
        .maybeSingle();

      if (wb) {
        const cur = parseFloat(wb.available_balance || "0");
        const next = direction === "CREDIT" ? Math.max(0, cur - amount) : cur + amount;
        await adminSupabase
          .from("wallet_balances")
          .update({ available_balance: next, updated_at: new Date().toISOString() })
          .eq("account_id", userAcctId);
      }
    }
  }

  // 3. Nullify any foreign key references from peripheral tables
  await adminSupabase
    .from("balance_adjustments")
    .update({ ledger_transaction_id: null })
    .eq("ledger_transaction_id", tx.id);

  await adminSupabase
    .from("withdrawal_requests")
    .update({ reservation_tx_id: null })
    .eq("reservation_tx_id", tx.id);

  await adminSupabase
    .from("withdrawal_requests")
    .update({ settlement_tx_id: null })
    .eq("settlement_tx_id", tx.id);

  // 4. Delete double-entry ledger lines
  const { error: delEntriesErr } = await adminSupabase
    .from("ledger_entries")
    .delete()
    .eq("transaction_id", tx.id);

  if (delEntriesErr) {
    throw new AppError(`Failed to delete ledger entries: ${delEntriesErr.message}`, "ENTRIES_DELETE_FAILED", 500);
  }

  // 5. Delete transaction header
  const { error: delTxErr } = await adminSupabase
    .from("ledger_transactions")
    .delete()
    .eq("id", tx.id);

  if (delTxErr) {
    throw new AppError(`Failed to delete transaction header: ${delTxErr.message}`, "TX_DELETE_FAILED", 500);
  }

  // 6. Record audit log
  await recordAdminAuditLog({
    actorId: staff.id,
    actorEmail: staff.email,
    actorRole: staff.role,
    actionType: "TRANSACTION_DELETED",
    targetEntityType: "TRANSACTION",
    targetEntityId: tx.id,
    details: {
      referenceId: tx.reference_id,
      transactionType: tx.transaction_type,
      status: tx.status,
      reason: input.reason || "Super Admin manual deletion",
    },
    status: "SUCCESS",
  });

  return { success: true };
}
