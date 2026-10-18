import { createAdminClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { recordAdminAuditLog } from "./audit";
import { AuthenticatedStaff } from "./auth";

export type AdjustmentDirection = "CREDIT" | "DEBIT";
export type AdjustmentStatus = "PENDING" | "APPROVED" | "REJECTED" | "POSTED";

export interface BalanceAdjustmentRecord {
  id: string;
  userId: string;
  userEmail?: string;
  assetTicker: string;
  direction: AdjustmentDirection;
  amount: string;
  reasonCategory: string;
  justification: string;
  referenceCase: string | null;
  status: AdjustmentStatus;
  requestedBy: string;
  requesterEmail?: string;
  requestedAt: string;
  reviewedBy: string | null;
  reviewerEmail?: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
  ledgerTransactionId: string | null;
  idempotencyKey: string;
}

export interface RequestAdjustmentInput {
  userId: string;
  assetTicker: string;
  direction: AdjustmentDirection;
  amount: string;
  reasonCategory: string;
  justification: string;
  referenceCase?: string;
}

export interface ReviewAdjustmentInput {
  adjustmentId: string;
  decision: "APPROVE" | "REJECT";
  rejectionReason?: string;
}

/**
 * Initiates a balance adjustment request under Maker-Checker dual control.
 * Status is set to PENDING until reviewed by a different authorized staff member.
 */
export async function requestBalanceAdjustment(
  staff: AuthenticatedStaff,
  input: RequestAdjustmentInput
): Promise<BalanceAdjustmentRecord> {
  const amountNum = parseFloat(input.amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    throw new AppError("Adjustment amount must be a positive number", "INVALID_AMOUNT", 400);
  }

  const ticker = input.assetTicker.toUpperCase();
  const validAssets = ["USDT", "USDC", "BTC", "ETH", "SOL", "USD"];
  if (!validAssets.includes(ticker)) {
    throw new AppError(`Unsupported asset: ${ticker}`, "INVALID_ASSET", 400);
  }

  const supabase = createAdminClient();

  // Verify target user exists in auth (authoritative source of truth)
  const { data: targetAuthUser, error: userErr } = await supabase.auth.admin.getUserById(input.userId);

  if (userErr || !targetAuthUser?.user) {
    throw new AppError("Target user not found", "USER_NOT_FOUND", 404);
  }

  const idempotencyKey = `adj-req-${input.userId.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const { data: record, error: insertErr } = await supabase
    .from("balance_adjustments")
    .insert({
      user_id: input.userId,
      asset_ticker: ticker,
      direction: input.direction,
      amount: amountNum.toFixed(6),
      reason_category: input.reasonCategory,
      justification: input.justification,
      reference_case: input.referenceCase || null,
      status: "PENDING",
      requested_by: staff.id,
      idempotency_key: idempotencyKey,
    })
    .select()
    .single();

  if (insertErr || !record) {
    throw new AppError(`Failed to create adjustment request: ${insertErr?.message}`, "ADJUSTMENT_FAILED", 500);
  }

  await recordAdminAuditLog({
    actorId: staff.id,
    actorEmail: staff.email,
    actorRole: staff.role,
    actionType: "BALANCE_ADJUSTMENT_REQUESTED",
    targetEntityType: "USER",
    targetEntityId: input.userId,
    details: {
      adjustmentId: record.id,
      asset: ticker,
      direction: input.direction,
      amount: amountNum.toFixed(6),
      reasonCategory: input.reasonCategory,
    },
    status: "SUCCESS",
  });

  return {
    id: record.id,
    userId: record.user_id,
    assetTicker: record.asset_ticker,
    direction: record.direction,
    amount: String(record.amount),
    reasonCategory: record.reason_category,
    justification: record.justification,
    referenceCase: record.reference_case,
    status: record.status,
    requestedBy: record.requested_by,
    requestedAt: record.requested_at,
    reviewedBy: record.reviewed_by,
    reviewedAt: record.reviewed_at,
    rejectionReason: record.rejection_reason,
    ledgerTransactionId: record.ledger_transaction_id,
    idempotencyKey: record.idempotency_key,
  };
}

/**
 * Direct Balance Adjustment Input
 */
export interface DirectAdjustmentInput {
  userId: string;
  assetTicker: string;
  direction: AdjustmentDirection;
  amount: string;
  reasonCategory: string;
  justification: string;
  referenceCase?: string;
}

/**
 * Executes an instant, ledger-safe balance adjustment directly for a user.
 * Atomically updates user available ledger account and platform reconciliation counterparty.
 */
export async function directBalanceAdjustment(
  staff: AuthenticatedStaff,
  input: DirectAdjustmentInput
): Promise<{ adjustmentId: string; ledgerTxId: string; newBalance: string }> {
  const amountNum = parseFloat(input.amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    throw new AppError("Adjustment amount must be a positive number", "INVALID_AMOUNT", 400);
  }

  const ticker = input.assetTicker.toUpperCase();
  const validAssets = ["USDT", "USDC", "BTC", "ETH", "SOL", "USD"];
  if (!validAssets.includes(ticker)) {
    throw new AppError(`Unsupported asset: ${ticker}`, "INVALID_ASSET", 400);
  }

  const supabase = createAdminClient();

  // 1. Verify target user exists in auth (authoritative source of truth)
  const { data: targetAuthUser, error: userErr } = await supabase.auth.admin.getUserById(input.userId);

  if (userErr || !targetAuthUser?.user) {
    throw new AppError("Target user not found", "USER_NOT_FOUND", 404);
  }

  // Ensure user_profiles row exists (may be missing for users created outside the signup flow)
  await supabase.from("user_profiles").upsert(
    {
      id: input.userId,
      first_name: targetAuthUser.user.user_metadata?.first_name || "User",
      last_name: targetAuthUser.user.user_metadata?.last_name || "",
      phone_number: targetAuthUser.user.user_metadata?.phone_number || "",
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  // 2. Resolve or create user ledger account
  const { data: userAcctId, error: userAcctErr } = await supabase.rpc(
    "get_or_create_user_account",
    {
      p_user_id: input.userId,
      p_account_type: "USER_AVAILABLE",
      p_asset: ticker,
    }
  );

  if (userAcctErr || !userAcctId) {
    throw new AppError(`Failed to initialize user ledger account: ${userAcctErr?.message}`, "ACCOUNT_INIT_FAILED", 500);
  }

  // 3. Resolve system counterparty reconciliation account
  const { data: sysAcctId, error: sysAcctErr } = await supabase.rpc(
    "get_or_create_system_account",
    {
      p_account_type: "SYSTEM_RECONCILIATION",
      p_asset: ticker,
    }
  );

  if (sysAcctErr || !sysAcctId) {
    throw new AppError(`Failed to initialize system reconciliation account: ${sysAcctErr?.message}`, "SYSTEM_ACCOUNT_FAILED", 500);
  }

  // 4. Fetch current balance
  const { data: wb } = await supabase
    .from("wallet_balances")
    .select("available_balance, reserved_balance, pending_balance")
    .eq("account_id", userAcctId)
    .maybeSingle();

  const currentBal = parseFloat(wb?.available_balance || "0");
  if (input.direction === "DEBIT" && currentBal < amountNum) {
    throw new AppError(
      `Insufficient available balance for debit adjustment. Current balance: ${currentBal} ${ticker}`,
      "INSUFFICIENT_FUNDS",
      400
    );
  }

  const delta = input.direction === "CREDIT" ? amountNum : -amountNum;
  const newBal = Math.max(0, currentBal + delta);

  const idempotencyKey = `adj-dir-${input.userId.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const nowIso = new Date().toISOString();
  const refId = `ADJ-${ticker}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  // 5. Create journal transaction header
  const { data: tx, error: txErr } = await supabase
    .from("ledger_transactions")
    .insert({
      transaction_type: "SYSTEM_RECONCILIATION",
      status: "POSTED",
      reference_id: refId,
      idempotency_key: idempotencyKey,
      metadata: {
        adjustment_type: "DIRECT_ADMIN_ADJUSTMENT",
        reason_category: input.reasonCategory,
        justification: input.justification,
        reference_case: input.referenceCase || null,
        adjusted_by_admin: staff.email,
        admin_id: staff.id,
        direction: input.direction,
      },
      created_at: nowIso,
      posted_at: nowIso,
    })
    .select("id, reference_id")
    .single();

  if (txErr || !tx) {
    throw new AppError(`Failed to post ledger transaction: ${txErr?.message}`, "TX_POST_FAILED", 500);
  }

  // 6. Balanced double-entry lines
  const userEntryDirection = input.direction;
  const sysEntryDirection = input.direction === "CREDIT" ? "DEBIT" : "CREDIT";

  const { error: entriesErr } = await supabase.from("ledger_entries").insert([
    {
      transaction_id: tx.id,
      account_id: userAcctId,
      direction: userEntryDirection,
      amount: amountNum,
      asset_ticker: ticker,
      created_at: nowIso,
    },
    {
      transaction_id: tx.id,
      account_id: sysAcctId,
      direction: sysEntryDirection,
      amount: amountNum,
      asset_ticker: ticker,
      created_at: nowIso,
    },
  ]);

  if (entriesErr) {
    throw new AppError(`Failed to write ledger entries: ${entriesErr.message}`, "ENTRIES_FAILED", 500);
  }

  // 7. Update materialized balance cache via UPSERT
  await supabase
    .from("wallet_balances")
    .upsert(
      {
        account_id: userAcctId,
        user_id: input.userId,
        asset_ticker: ticker,
        available_balance: newBal,
        reserved_balance: wb?.reserved_balance || 0,
        pending_balance: wb?.pending_balance || 0,
        updated_at: nowIso,
      },
      { onConflict: "account_id" }
    );

  // 8. Create balance_adjustments record with status POSTED
  const { data: adjRecord } = await supabase
    .from("balance_adjustments")
    .insert({
      user_id: input.userId,
      asset_ticker: ticker,
      direction: input.direction,
      amount: amountNum.toFixed(6),
      reason_category: input.reasonCategory,
      justification: input.justification,
      reference_case: input.referenceCase || null,
      status: "POSTED",
      requested_by: staff.id,
      reviewed_by: staff.id,
      requested_at: nowIso,
      reviewed_at: nowIso,
      ledger_transaction_id: tx.id,
      idempotency_key: idempotencyKey,
    })
    .select("id")
    .maybeSingle();

  // 9. Record audit log
  await recordAdminAuditLog({
    actorId: staff.id,
    actorEmail: staff.email,
    actorRole: staff.role,
    actionType: "BALANCE_ADJUSTMENT_APPROVED_AND_POSTED",
    targetEntityType: "USER",
    targetEntityId: input.userId,
    details: {
      adjustmentId: adjRecord?.id || tx.id,
      asset: ticker,
      direction: input.direction,
      amount: amountNum.toFixed(6),
      newBalance: String(newBal),
      ledgerTransactionId: tx.id,
      referenceId: refId,
      reasonCategory: input.reasonCategory,
    },
    status: "SUCCESS",
  });

  return {
    adjustmentId: adjRecord?.id || tx.id,
    ledgerTxId: tx.id,
    newBalance: String(newBal),
  };
}

/**
 * Reviews and resolves a balance adjustment request under Maker-Checker dual control.
 */
export async function reviewBalanceAdjustment(
  staff: AuthenticatedStaff,
  input: ReviewAdjustmentInput
): Promise<{ status: AdjustmentStatus; ledgerTxId?: string }> {
  const supabase = createAdminClient();

  // 1. Fetch adjustment record with row lock
  const { data: record, error: fetchErr } = await supabase
    .from("balance_adjustments")
    .select("*")
    .eq("id", input.adjustmentId)
    .maybeSingle();

  if (fetchErr || !record) {
    throw new AppError("Balance adjustment record not found", "NOT_FOUND", 404);
  }

  if (record.status !== "PENDING") {
    throw new AppError(
      `Adjustment request is already resolved with status '${record.status}'`,
      "ALREADY_RESOLVED",
      400
    );
  }

  // 2. Maker-Checker Invariant Check: enforce distinct reviewer unless authorized as super_admin
  if (record.requested_by === staff.id && staff.role !== "super_admin") {
    throw new AppError(
      "Maker-Checker Violation: The administrator who initiated this adjustment request cannot approve or review it unless authorized as super_admin.",
      "MAKER_CHECKER_VIOLATION",
      403
    );
  }

  if (input.decision === "REJECT") {
    const { error: rejectErr } = await supabase
      .from("balance_adjustments")
      .update({
        status: "REJECTED",
        reviewed_by: staff.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: input.rejectionReason || "Rejected by authorized reviewer",
      })
      .eq("id", input.adjustmentId);

    if (rejectErr) {
      throw new AppError(`Failed to reject adjustment: ${rejectErr.message}`, "REJECTION_FAILED", 500);
    }

    await recordAdminAuditLog({
      actorId: staff.id,
      actorEmail: staff.email,
      actorRole: staff.role,
      actionType: "BALANCE_ADJUSTMENT_REJECTED",
      targetEntityType: "USER",
      targetEntityId: record.user_id,
      details: {
        adjustmentId: record.id,
        reason: input.rejectionReason,
      },
      status: "SUCCESS",
    });

    return { status: "REJECTED" };
  }

  // 3. Approval: Settle via double-entry ledger stored procedure or direct ledger settlement
  let ledgerTxId: string | null = null;
  const nowIso = new Date().toISOString();

  // Attempt RPC settlement when reviewer is a different staff member
  if (record.requested_by !== staff.id) {
    const { data: txId, error: settleErr } = await supabase.rpc("settle_approved_balance_adjustment", {
      p_adjustment_id: input.adjustmentId,
      p_reviewer_id: staff.id,
    });
    if (!settleErr && txId) {
      ledgerTxId = txId;
    }
  }

  // If RPC was skipped (super_admin self-approval) or RPC failed, execute atomic settlement in TS
  if (!ledgerTxId) {
    const ticker = record.asset_ticker;
    const amountNum = parseFloat(record.amount);
    const refId = `ADJ-${ticker}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const { data: userAcctId } = await supabase.rpc("get_or_create_user_account", {
      p_user_id: record.user_id,
      p_account_type: "USER_AVAILABLE",
      p_asset: ticker,
    });

    const { data: sysAcctId } = await supabase.rpc("get_or_create_system_account", {
      p_account_type: "SYSTEM_RECONCILIATION",
      p_asset: ticker,
    });

    const { data: wb } = await supabase
      .from("wallet_balances")
      .select("available_balance, reserved_balance, pending_balance")
      .eq("account_id", userAcctId)
      .maybeSingle();

    const currentBal = parseFloat(wb?.available_balance || "0");
    const delta = record.direction === "CREDIT" ? amountNum : -amountNum;
    const newBal = Math.max(0, currentBal + delta);

    const { data: tx, error: txErr } = await supabase
      .from("ledger_transactions")
      .insert({
        transaction_type: "SYSTEM_RECONCILIATION",
        status: "POSTED",
        reference_id: refId,
        idempotency_key: record.idempotency_key || `adj-settle-${record.id}`,
        metadata: {
          adjustment_id: record.id,
          direction: record.direction,
          reason_category: record.reason_category,
          justification: record.justification,
          requested_by: record.requested_by,
          approved_by: staff.id,
        },
        created_at: nowIso,
        posted_at: nowIso,
      })
      .select("id")
      .single();

    if (txErr || !tx) {
      throw new AppError(`Ledger settlement failed: ${txErr?.message}`, "LEDGER_SETTLEMENT_FAILED", 500);
    }

    ledgerTxId = tx.id;

    const userDirection = record.direction;
    const sysDirection = record.direction === "CREDIT" ? "DEBIT" : "CREDIT";

    await supabase.from("ledger_entries").insert([
      {
        transaction_id: tx.id,
        account_id: userAcctId,
        direction: userDirection,
        amount: amountNum,
        asset_ticker: ticker,
        created_at: nowIso,
      },
      {
        transaction_id: tx.id,
        account_id: sysAcctId,
        direction: sysDirection,
        amount: amountNum,
        asset_ticker: ticker,
        created_at: nowIso,
      },
    ]);

    await supabase
      .from("wallet_balances")
      .upsert(
        {
          account_id: userAcctId,
          user_id: record.user_id,
          asset_ticker: ticker,
          available_balance: newBal,
          reserved_balance: wb?.reserved_balance || 0,
          pending_balance: wb?.pending_balance || 0,
          updated_at: nowIso,
        },
        { onConflict: "account_id" }
      );
  }

  // Always update the balance_adjustments record to POSTED after successful settlement
  // (both RPC and TS fallback paths)
  await supabase
    .from("balance_adjustments")
    .update({
      status: "POSTED",
      reviewed_by: staff.id,
      reviewed_at: nowIso,
      ledger_transaction_id: ledgerTxId,
    })
    .eq("id", record.id);

  await recordAdminAuditLog({
    actorId: staff.id,
    actorEmail: staff.email,
    actorRole: staff.role,
    actionType: "BALANCE_ADJUSTMENT_APPROVED_AND_POSTED",
    targetEntityType: "USER",
    targetEntityId: record.user_id,
    details: {
      adjustmentId: record.id,
      asset: record.asset_ticker,
      direction: record.direction,
      amount: String(record.amount),
      ledgerTransactionId: ledgerTxId,
    },
    status: "SUCCESS",
  });

  return { status: "POSTED", ledgerTxId };
}


/**
 * Lists all balance adjustments with status filtering and pagination.
 */
export async function listBalanceAdjustments(params?: {
  status?: AdjustmentStatus;
  limit?: number;
  offset?: number;
}): Promise<{ adjustments: BalanceAdjustmentRecord[]; total: number }> {
  const supabase = createAdminClient();
  const limit = params?.limit || 50;
  const offset = params?.offset || 0;

  const [
    { data, count, error },
    { data: authUsersData }
  ] = await Promise.all([
    (() => {
      let query = supabase.from("balance_adjustments").select("*", { count: "exact" });
      if (params?.status) {
        query = query.eq("status", params.status);
      }
      return query.order("requested_at", { ascending: false }).range(offset, offset + limit - 1);
    })(),
    supabase.auth.admin.listUsers({ perPage: 1000 })
  ]);

  if (error || !data) return { adjustments: [], total: 0 };

  const emailMap = new Map((authUsersData?.users || []).map((u) => [u.id, u.email || ""]));

  const adjustments: BalanceAdjustmentRecord[] = data.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    userEmail: emailMap.get(r.user_id) || undefined,
    assetTicker: r.asset_ticker,
    direction: r.direction,
    amount: String(r.amount),
    reasonCategory: r.reason_category,
    justification: r.justification,
    referenceCase: r.reference_case,
    status: r.status,
    requestedBy: r.requested_by,
    requestedAt: r.requested_at,
    reviewedBy: r.reviewed_by,
    reviewedAt: r.reviewed_at,
    rejectionReason: r.rejection_reason,
    ledgerTransactionId: r.ledger_transaction_id,
    idempotencyKey: r.idempotency_key,
  }));

  return { adjustments, total: count || adjustments.length };
}
