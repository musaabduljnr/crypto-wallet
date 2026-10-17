"use server";

import { revalidatePath } from "next/cache";
import { requireStaffPermission } from "@/lib/admin/auth";
import {
  applyAccountRestriction,
  liftAccountRestriction,
  RestrictionType,
} from "@/lib/admin/restrictions";
import {
  requestBalanceAdjustment,
  reviewBalanceAdjustment,
  AdjustmentDirection,
} from "@/lib/admin/adjustments";
import {
  createAdminUser,
  updateAdminUserProfile,
  addAdminNote,
} from "@/lib/admin/users";
import { updateStaffRole, toggleStaffStatus, assignStaffMember } from "@/lib/admin/staff";
import { StaffRole } from "@/lib/admin/permissions";
import { createServerClient } from "@/lib/supabase/server";
import { recordAdminAuditLog } from "@/lib/admin/audit";

export interface AdminActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Applies a granular account restriction to a customer account.
 */
export async function applyRestrictionAction(params: {
  userId: string;
  restrictionType: RestrictionType;
  reasonCategory: string;
  internalExplanation: string;
  expiresAt?: string;
}): Promise<AdminActionResponse> {
  try {
    const staff = await requireStaffPermission("users.restrict");
    const result = await applyAccountRestriction(staff, params);
    revalidatePath(`/admin/users/${params.userId}`);
    revalidatePath("/admin/restrictions");
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to apply restriction" };
  }
}

/**
 * Lifts an active account restriction.
 */
export async function liftRestrictionAction(params: {
  restrictionId: string;
  liftReason: string;
  userId?: string;
}): Promise<AdminActionResponse> {
  try {
    const staff = await requireStaffPermission("users.restrict");
    await liftAccountRestriction(staff, params);
    if (params.userId) revalidatePath(`/admin/users/${params.userId}`);
    revalidatePath("/admin/restrictions");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to lift restriction" };
  }
}

/**
 * Initiates a balance adjustment request under Maker-Checker dual control.
 */
export async function requestBalanceAdjustmentAction(params: {
  userId: string;
  assetTicker: string;
  direction: AdjustmentDirection;
  amount: string;
  reasonCategory: string;
  justification: string;
  referenceCase?: string;
}): Promise<AdminActionResponse> {
  try {
    const staff = await requireStaffPermission("balances.adjust.request");
    const result = await requestBalanceAdjustment(staff, params);
    revalidatePath("/admin/balance-adjustments");
    revalidatePath(`/admin/users/${params.userId}`);
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to submit adjustment request" };
  }
}

/**
 * Reviews (approves/rejects) a balance adjustment request under Maker-Checker dual control.
 */
export async function reviewBalanceAdjustmentAction(params: {
  adjustmentId: string;
  decision: "APPROVE" | "REJECT";
  rejectionReason?: string;
}): Promise<AdminActionResponse> {
  try {
    const staff = await requireStaffPermission("balances.adjust.approve");
    const result = await reviewBalanceAdjustment(staff, params);
    revalidatePath("/admin/balance-adjustments");
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to review adjustment" };
  }
}

/**
 * Administrative customer account provisioning.
 */
export async function createAdminUserAction(params: {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  password?: string;
  kycTier?: number;
}): Promise<AdminActionResponse> {
  try {
    const staff = await requireStaffPermission("users.create");
    const result = await createAdminUser(staff, params);
    revalidatePath("/admin/users");
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create user" };
  }
}

/**
 * Updates approved user profile fields with audit diff.
 */
export async function updateAdminUserProfileAction(params: {
  userId: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  stateOfResidence?: string;
  kycTier?: number;
}): Promise<AdminActionResponse> {
  try {
    const staff = await requireStaffPermission("users.update");
    await updateAdminUserProfile(staff, params);
    revalidatePath(`/admin/users/${params.userId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update profile" };
  }
}

/**
 * Appends an internal administrative case note.
 */
export async function addAdminNoteAction(params: {
  targetEntityType: "USER" | "TRANSACTION" | "ADJUSTMENT";
  targetEntityId: string;
  noteText: string;
  isConfidential?: boolean;
}): Promise<AdminActionResponse> {
  try {
    const staff = await requireStaffPermission("users.read");
    const result = await addAdminNote(staff, params);
    if (params.targetEntityType === "USER") {
      revalidatePath(`/admin/users/${params.targetEntityId}`);
    } else if (params.targetEntityType === "TRANSACTION") {
      revalidatePath(`/admin/transactions/${params.targetEntityId}`);
    }
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to add note" };
  }
}

/**
 * Modifies a staff role. Requires staff.manage permission.
 */
export async function updateStaffRoleAction(params: {
  targetUserId: string;
  newRole: StaffRole;
}): Promise<AdminActionResponse> {
  try {
    const staff = await requireStaffPermission("staff.manage");
    await updateStaffRole(staff, params);
    revalidatePath("/admin/staff");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update staff role" };
  }
}

/**
 * Activates or deactivates a staff member. Requires staff.manage permission.
 */
export async function toggleStaffStatusAction(params: {
  targetUserId: string;
  isActive: boolean;
}): Promise<AdminActionResponse> {
  try {
    const staff = await requireStaffPermission("staff.manage");
    await toggleStaffStatus(staff, params);
    revalidatePath("/admin/staff");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to toggle staff status" };
  }
}

/**
 * Assigns or invites a new staff member. Requires staff.manage permission.
 */
export async function assignStaffMemberAction(params: {
  email: string;
  role: StaffRole;
}): Promise<AdminActionResponse> {
  try {
    const staff = await requireStaffPermission("staff.manage");
    await assignStaffMember(staff, params);
    revalidatePath("/admin/staff");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to assign staff role" };
  }
}

/**
 * Updates platform operational settings (e.g. cooling off hours, maintenance mode).
 */
export async function updatePlatformSettingsAction(params: {
  key: string;
  value: Record<string, unknown>;
  description?: string;
}): Promise<AdminActionResponse> {
  try {
    const staff = await requireStaffPermission("settings.manage");
    const supabase = await createServerClient();

    const { error } = await supabase.from("platform_settings").upsert({
      key: params.key,
      value: params.value,
      description: params.description,
      updated_by: staff.id,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    await recordAdminAuditLog({
      actorId: staff.id,
      actorEmail: staff.email,
      actorRole: staff.role,
      actionType: "PLATFORM_SETTING_UPDATED",
      targetEntityType: "SETTING",
      targetEntityId: params.key,
      details: { value: params.value },
      status: "SUCCESS",
    });

    revalidatePath("/admin/settings");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update platform setting" };
  }
}

/**
 * Executes double-entry mathematical ledger integrity and provider reference audit.
 */
export async function runReconciliationAuditAction(): Promise<AdminActionResponse> {
  try {
    const staff = await requireStaffPermission("audit_logs.read");
    const { ReconciliationService } = await import("@/lib/services/reconciliation.service");
    const reconService = new ReconciliationService();
    const report = await reconService.runIntegrityAudit();

    await recordAdminAuditLog({
      actorId: staff.id,
      actorEmail: staff.email,
      actorRole: staff.role,
      actionType: "RECONCILIATION_AUDIT_EXECUTED",
      targetEntityType: "SYSTEM",
      targetEntityId: "LEDGER_INTEGRITY",
      details: {
        isBalanced: report.isBalanced,
        status: report.status,
        unbalancedCount: report.unbalancedTransactionsCount,
      },
      status: "SUCCESS",
    });

    revalidatePath("/admin/operations");
    return { success: true, data: report };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to run reconciliation audit" };
  }
}
