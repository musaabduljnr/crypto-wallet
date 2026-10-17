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

  const [
    { data: staffRows, error },
    { data: authUsersData },
    { data: profiles }
  ] = await Promise.all([
    supabase.from("staff_users").select("*").order("created_at", { ascending: true }),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    supabase.from("user_profiles").select("id, first_name, last_name")
  ]);

  if (error || !staffRows) return [];

  const emailMap = new Map((authUsersData?.users || []).map((u) => [u.id, u.email || ""]));
  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  return staffRows.map((s: any) => {
    const prof = profileMap.get(s.id);
    return {
      id: s.id,
      email: emailMap.get(s.id) || "staff@apexwallet.io",
      firstName: prof?.first_name || "Staff",
      lastName: prof?.last_name || "",
      role: s.role as StaffRole,
      isActive: s.is_active,
      assignedBy: s.assigned_by,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    };
  });
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

  // Find target user by email from auth users
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const matchedAuth = (authData?.users || []).find(
    (u: any) => u.email?.toLowerCase() === params.email.trim().toLowerCase()
  );
  const targetUserId = matchedAuth?.id;

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
