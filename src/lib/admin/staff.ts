import { createAdminClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { StaffRole } from "./permissions";
import { AuthenticatedStaff } from "./auth";
import { recordAdminAuditLog } from "./audit";

export interface StaffMemberRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  isActive: boolean;
  assignedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Lists all staff members with profile details.
 */
export async function listStaffMembers(): Promise<StaffMemberRecord[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("staff_users")
    .select("*, profile:user_profiles(first_name, last_name), auth_users:id(email)")
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((s: any) => ({
    id: s.id,
    email: s.auth_users?.email || "staff@apexwallet.io",
    firstName: s.profile?.first_name || "Staff",
    lastName: s.profile?.last_name || "",
    role: s.role as StaffRole,
    isActive: s.is_active,
    assignedBy: s.assigned_by,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }));
}

/**
 * Updates a staff member's role with protection against super_admin lockout.
 */
export async function updateStaffRole(
  staff: AuthenticatedStaff,
  params: { targetUserId: string; newRole: StaffRole }
): Promise<void> {
  const supabase = createAdminClient();

  // 1. Fetch target staff
  const { data: target, error: targetErr } = await supabase
    .from("staff_users")
    .select("*")
    .eq("id", params.targetUserId)
    .maybeSingle();

  if (targetErr || !target) {
    throw new AppError("Target staff record not found", "STAFF_NOT_FOUND", 404);
  }

  // 2. Prevent demoting the last active super_admin
  if (target.role === "super_admin" && params.newRole !== "super_admin") {
    const { count } = await supabase
      .from("staff_users")
      .select("*", { count: "exact", head: true })
      .eq("role", "super_admin")
      .eq("is_active", true);

    if ((count || 0) <= 1) {
      throw new AppError(
        "Critical Invariant: Cannot demote the last remaining active Super Administrator.",
        "LAST_SUPER_ADMIN_PROTECTED",
        400
      );
    }
  }

  const { error: updateErr } = await supabase
    .from("staff_users")
    .update({
      role: params.newRole,
      assigned_by: staff.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.targetUserId);

  if (updateErr) {
    throw new AppError(`Failed to update staff role: ${updateErr.message}`, "UPDATE_FAILED", 500);
  }

  await recordAdminAuditLog({
    actorId: staff.id,
    actorEmail: staff.email,
    actorRole: staff.role,
    actionType: "STAFF_ROLE_MODIFIED",
    targetEntityType: "STAFF_USER",
    targetEntityId: params.targetUserId,
    details: {
      previousRole: target.role,
      newRole: params.newRole,
    },
    status: "SUCCESS",
  });
}

/**
 * Activates or deactivates a staff member with protection against deactivating the last super_admin.
 */
export async function toggleStaffStatus(
  staff: AuthenticatedStaff,
  params: { targetUserId: string; isActive: boolean }
): Promise<void> {
  const supabase = createAdminClient();

  const { data: target, error: targetErr } = await supabase
    .from("staff_users")
    .select("*")
    .eq("id", params.targetUserId)
    .maybeSingle();

  if (targetErr || !target) {
    throw new AppError("Target staff record not found", "STAFF_NOT_FOUND", 404);
  }

  if (target.role === "super_admin" && !params.isActive) {
    const { count } = await supabase
      .from("staff_users")
      .select("*", { count: "exact", head: true })
      .eq("role", "super_admin")
      .eq("is_active", true);

    if ((count || 0) <= 1) {
      throw new AppError(
        "Critical Invariant: Cannot deactivate the last remaining active Super Administrator.",
        "LAST_SUPER_ADMIN_PROTECTED",
        400
      );
    }
  }

  const { error: updateErr } = await supabase
    .from("staff_users")
    .update({
      is_active: params.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.targetUserId);

  if (updateErr) {
    throw new AppError(`Failed to toggle staff status: ${updateErr.message}`, "UPDATE_FAILED", 500);
  }

  await recordAdminAuditLog({
    actorId: staff.id,
    actorEmail: staff.email,
    actorRole: staff.role,
    actionType: params.isActive ? "STAFF_ACTIVATED" : "STAFF_DEACTIVATED",
    targetEntityType: "STAFF_USER",
    targetEntityId: params.targetUserId,
    details: { isActive: params.isActive },
    status: "SUCCESS",
  });
}

/**
 * Assigns a staff role to an existing user by email.
 */
export async function assignStaffMember(
  staff: AuthenticatedStaff,
  params: { email: string; role: StaffRole }
): Promise<void> {
  const supabase = createAdminClient();

  // Find target user by email
  const { data: userRecord, error: userErr } = await supabase
    .from("user_profiles")
    .select("id, auth_users:id(email)")
    .filter("auth_users.email", "eq", params.email.trim().toLowerCase())
    .maybeSingle();

  let targetUserId = userRecord?.id;

  // Fallback direct auth query if joined filter returns empty
  if (!targetUserId) {
    const { data: directUser } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", params.email.trim().toLowerCase())
      .maybeSingle();
    targetUserId = directUser?.id;
  }

  // If still not found, check staff_users or user_profiles
  if (!targetUserId) {
    const { data: allProfiles } = await supabase.from("user_profiles").select("id, email");
    const matched = allProfiles?.find((p) => p.email?.toLowerCase() === params.email.trim().toLowerCase());
    targetUserId = matched?.id;
  }

  if (!targetUserId) {
    throw new AppError(
      `No user found with email ${params.email}. The user must have a valid account before being assigned a staff role.`,
      "USER_NOT_FOUND",
      404
    );
  }

  const { error: upsertErr } = await supabase.from("staff_users").upsert({
    id: targetUserId,
    role: params.role,
    assigned_by: staff.id,
    is_active: true,
    updated_at: new Date().toISOString(),
  });

  if (upsertErr) {
    throw new AppError(`Failed to assign staff role: ${upsertErr.message}`, "STAFF_ASSIGN_FAILED", 500);
  }

  await recordAdminAuditLog({
    actorId: staff.id,
    actorEmail: staff.email,
    actorRole: staff.role,
    actionType: "STAFF_ROLE_ASSIGNED",
    targetEntityType: "STAFF_USER",
    targetEntityId: targetUserId,
    details: {
      targetEmail: params.email,
      assignedRole: params.role,
    },
    status: "SUCCESS",
  });
}
