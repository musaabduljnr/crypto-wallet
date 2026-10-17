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

  // Verify target user exists
  const { data: targetUser, error: userErr } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("id", input.userId)
    .maybeSingle();

  if (userErr || !targetUser) {
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
 * Reviews and resolves a balance adjustment request under Maker-Checker dual control.
 * STRICT ENFORCEMENT: Requester cannot approve their own adjustment!
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

  // 2. Maker-Checker Invariant Check
  if (record.requested_by === staff.id) {
    throw new AppError(
      "Maker-Checker Violation: The administrator who initiated this adjustment request cannot approve or review it.",
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

  // 3. Approval: Settle via double-entry ledger stored procedure
  const { data: txId, error: settleErr } = await supabase.rpc("settle_approved_balance_adjustment", {
    p_adjustment_id: input.adjustmentId,
    p_reviewer_id: staff.id,
  });

  if (settleErr) {
    throw new AppError(
      `Ledger settlement failed: ${settleErr.message}`,
      "LEDGER_SETTLEMENT_FAILED",
      500
    );
  }

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
      ledgerTransactionId: txId,
    },
    status: "SUCCESS",
  });

  return { status: "POSTED", ledgerTxId: txId };
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
  let query = supabase
    .from("balance_adjustments")
    .select("*, auth_users:user_id(email)", { count: "exact" });

  if (params?.status) {
    query = query.eq("status", params.status);
  }

  const limit = params?.limit || 50;
  const offset = params?.offset || 0;

  const { data, count, error } = await query
    .order("requested_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !data) return { adjustments: [], total: 0 };

  const adjustments: BalanceAdjustmentRecord[] = data.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    userEmail: r.auth_users?.email || undefined,
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
