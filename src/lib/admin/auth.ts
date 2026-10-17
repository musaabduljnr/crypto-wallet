import { createServerClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { StaffRole, AdminPermission, hasPermission, getRolePermissions } from "./permissions";

export interface AuthenticatedStaff {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  permissions: readonly AdminPermission[];
  isActive: boolean;
}

/**
 * Resolves the authenticated user and verifies active staff membership.
 * Never trusts client headers or query parameters.
 * Throws 401 if unauthenticated, 403 if user is not an active staff member.
 */
export async function getAuthenticatedStaff(): Promise<AuthenticatedStaff> {
  const supabase = await createServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();

  if (authErr || !user) {
    throw new AppError("Authentication required to access administrative resources", "UNAUTHENTICATED", 401);
  }

  // Resolve staff role record from database
  const { data: staff, error: staffErr } = await supabase
    .from("staff_users")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (staffErr || !staff || !staff.is_active) {
    throw new AppError("Administrative access denied: Staff account not found or inactive", "FORBIDDEN", 403);
  }

  // Resolve user profile for display identity
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  const role = staff.role as StaffRole;

  return {
    id: user.id,
    email: user.email || "staff@apexwallet.io",
    firstName: profile?.first_name || "Staff",
    lastName: profile?.last_name || "",
    role,
    permissions: getRolePermissions(role),
    isActive: staff.is_active,
  };
}

/**
 * Enforces that the authenticated staff member has the requested granular permission.
 * Throws AppError 403 if permission is lacking.
 */
export async function requireStaffPermission(permission: AdminPermission): Promise<AuthenticatedStaff> {
  const staff = await getAuthenticatedStaff();

  if (!hasPermission(staff.role, permission)) {
    throw new AppError(
      `Access denied: Staff role '${staff.role}' lacks required permission '${permission}'`,
      "PERMISSION_DENIED",
      403
    );
  }

  return staff;
}
