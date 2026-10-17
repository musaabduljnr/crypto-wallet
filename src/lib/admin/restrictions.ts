import { createAdminClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { recordAdminAuditLog } from "./audit";
import { AuthenticatedStaff } from "./auth";

export type RestrictionType =
  | "FULL_SUSPENSION"
  | "SIGN_IN"
  | "FIAT_FUNDING"
  | "CRYPTO_DEPOSIT"
  | "INTERNAL_TRANSFER"
  | "EXTERNAL_WITHDRAWAL"
  | "SWAP"
  | "TEMPORARY_HOLD";

export type RestrictionStatus = "ACTIVE" | "LIFTED" | "EXPIRED";

export interface AccountRestrictionRecord {
  id: string;
  userId: string;
  userEmail?: string;
  restrictionType: RestrictionType;
  reasonCategory: string;
  internalExplanation: string;
  status: RestrictionStatus;
  createdBy: string;
  creatorEmail?: string;
  createdAt: string;
  expiresAt: string | null;
  liftedBy: string | null;
  liftedAt: string | null;
  liftReason: string | null;
}

export interface ApplyRestrictionInput {
  userId: string;
  restrictionType: RestrictionType;
  reasonCategory: string;
  internalExplanation: string;
  expiresAt?: string;
}

export interface LiftRestrictionInput {
  restrictionId: string;
  liftReason: string;
}

/**
 * Checks whether a user has an active restriction matching the requested type,
 * or has a FULL_SUSPENSION active.
 */
export async function checkUserActiveRestriction(
  userId: string,
  restrictionType: RestrictionType
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("check_user_active_restriction", {
    p_user_id: userId,
    p_restriction_type: restrictionType,
  });

  if (error) {
    // Fallback query
    const { data: records } = await supabase
      .from("account_restrictions")
      .select("id, expires_at")
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .or(`restriction_type.eq.${restrictionType},restriction_type.eq.FULL_SUSPENSION`);

    if (!records || records.length === 0) return false;
    const now = Date.now();
    return records.some((r) => !r.expires_at || new Date(r.expires_at).getTime() > now);
  }

  return Boolean(data);
}

/**
 * Applies a new account restriction and records an immutable audit trail.
 */
export async function applyAccountRestriction(
  staff: AuthenticatedStaff,
  input: ApplyRestrictionInput
): Promise<AccountRestrictionRecord> {
  const supabase = createAdminClient();

  // Validate target user exists
  const { data: targetProfile, error: profileErr } = await supabase
    .from("user_profiles")
    .select("id, first_name, last_name")
    .eq("id", input.userId)
    .maybeSingle();

  if (profileErr || !targetProfile) {
    throw new AppError("Target user not found", "USER_NOT_FOUND", 404);
  }

  const { data: record, error: insertErr } = await supabase
    .from("account_restrictions")
    .insert({
      user_id: input.userId,
      restriction_type: input.restrictionType,
      reason_category: input.reasonCategory,
      internal_explanation: input.internalExplanation,
      expires_at: input.expiresAt || null,
      created_by: staff.id,
      status: "ACTIVE",
    })
    .select()
    .single();

  if (insertErr || !record) {
    throw new AppError(`Failed to apply restriction: ${insertErr?.message}`, "RESTRICTION_FAILED", 500);
  }

  // Record audit log
  await recordAdminAuditLog({
    actorId: staff.id,
    actorEmail: staff.email,
    actorRole: staff.role,
    actionType: "ACCOUNT_RESTRICTION_APPLIED",
    targetEntityType: "USER",
    targetEntityId: input.userId,
    details: {
      restrictionId: record.id,
      restrictionType: input.restrictionType,
      reasonCategory: input.reasonCategory,
      expiresAt: input.expiresAt || null,
    },
    status: "SUCCESS",
  });

  return {
    id: record.id,
    userId: record.user_id,
    restrictionType: record.restriction_type,
    reasonCategory: record.reason_category,
    internalExplanation: record.internal_explanation,
    status: record.status,
    createdBy: record.created_by,
    createdAt: record.created_at,
    expiresAt: record.expires_at,
    liftedBy: record.lifted_by,
    liftedAt: record.lifted_at,
    liftReason: record.lift_reason,
  };
}

/**
 * Lifts an active account restriction with documented justification.
 */
export async function liftAccountRestriction(
  staff: AuthenticatedStaff,
  input: LiftRestrictionInput
): Promise<void> {
  const supabase = createAdminClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("account_restrictions")
    .select("*")
    .eq("id", input.restrictionId)
    .maybeSingle();

  if (fetchErr || !existing) {
    throw new AppError("Restriction record not found", "NOT_FOUND", 404);
  }

  if (existing.status !== "ACTIVE") {
    throw new AppError("Restriction is not active", "INVALID_STATE", 400);
  }

  const { error: updateErr } = await supabase
    .from("account_restrictions")
    .update({
      status: "LIFTED",
      lifted_by: staff.id,
      lifted_at: new Date().toISOString(),
      lift_reason: input.liftReason,
    })
    .eq("id", input.restrictionId);

  if (updateErr) {
    throw new AppError(`Failed to lift restriction: ${updateErr.message}`, "RESTRICTION_UPDATE_FAILED", 500);
  }

  await recordAdminAuditLog({
    actorId: staff.id,
    actorEmail: staff.email,
    actorRole: staff.role,
    actionType: "ACCOUNT_RESTRICTION_LIFTED",
    targetEntityType: "USER",
    targetEntityId: existing.user_id,
    details: {
      restrictionId: existing.id,
      restrictionType: existing.restriction_type,
      liftReason: input.liftReason,
    },
    status: "SUCCESS",
  });
}

/**
 * Retrieves all restrictions for a given user.
 */
export async function getUserRestrictions(userId: string): Promise<AccountRestrictionRecord[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("account_restrictions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    userId: r.user_id,
    restrictionType: r.restriction_type,
    reasonCategory: r.reason_category,
    internalExplanation: r.internal_explanation,
    status: r.status,
    createdBy: r.created_by,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    liftedBy: r.lifted_by,
    liftedAt: r.lifted_at,
    liftReason: r.lift_reason,
  }));
}

/**
 * Retrieves all account restrictions across the platform with pagination and status filtering.
 */
export async function listAllRestrictions(params?: {
  status?: RestrictionStatus;
  limit?: number;
  offset?: number;
}): Promise<{ restrictions: AccountRestrictionRecord[]; total: number }> {
  const supabase = createAdminClient();
  let query = supabase
    .from("account_restrictions")
    .select("*, auth_users:user_id(email)", { count: "exact" });

  if (params?.status) {
    query = query.eq("status", params.status);
  }

  const limit = params?.limit || 50;
  const offset = params?.offset || 0;

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !data) return { restrictions: [], total: 0 };

  const restrictions: AccountRestrictionRecord[] = data.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    userEmail: r.auth_users?.email || undefined,
    restrictionType: r.restriction_type,
    reasonCategory: r.reason_category,
    internalExplanation: r.internal_explanation,
    status: r.status,
    createdBy: r.created_by,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    liftedBy: r.lifted_by,
    liftedAt: r.lifted_at,
    liftReason: r.lift_reason,
  }));

  return { restrictions, total: count || restrictions.length };
}
