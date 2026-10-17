/**
 * Role-Based Access Control (RBAC) & Granular Permission Matrix
 * Enforced strictly server-side for all administrative actions and queries.
 */

export type StaffRole =
  | "super_admin"
  | "admin"
  | "support"
  | "compliance"
  | "finance"
  | "read_only";

export type AdminPermission =
  | "users.read"
  | "users.create"
  | "users.update"
  | "users.restrict"
  | "transactions.read"
  | "transactions.review"
  | "balances.adjust.request"
  | "balances.adjust.approve"
  | "withdrawals.review"
  | "compliance.review"
  | "audit_logs.read"
  | "staff.manage"
  | "settings.manage"
  | "operations.manage"
  | "transactions.manage";

export const ROLE_PERMISSIONS: Record<StaffRole, readonly AdminPermission[]> = {
  super_admin: [
    "users.read",
    "users.create",
    "users.update",
    "users.restrict",
    "transactions.read",
    "transactions.review",
    "transactions.manage",
    "balances.adjust.request",
    "balances.adjust.approve",
    "withdrawals.review",
    "compliance.review",
    "audit_logs.read",
    "staff.manage",
    "settings.manage",
    "operations.manage",
  ],
  admin: [
    "users.read",
    "users.create",
    "users.update",
    "users.restrict",
    "transactions.read",
    "transactions.review",
    "withdrawals.review",
    "audit_logs.read",
    "operations.manage",
  ],
  support: [
    "users.read",
    "users.update",
    "transactions.read",
    "audit_logs.read",
  ],
  compliance: [
    "users.read",
    "users.restrict",
    "transactions.read",
    "transactions.review",
    "compliance.review",
    "audit_logs.read",
  ],
  finance: [
    "users.read",
    "transactions.read",
    "transactions.review",
    "balances.adjust.request",
    "balances.adjust.approve",
    "withdrawals.review",
    "audit_logs.read",
    "operations.manage",
  ],
  read_only: [
    "users.read",
    "transactions.read",
    "audit_logs.read",
  ],
};

/**
 * Validates whether a specific role is granted the requested permission.
 */
export function hasPermission(role: StaffRole, permission: AdminPermission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Returns all granular permissions for a given role.
 */
export function getRolePermissions(role: StaffRole): readonly AdminPermission[] {
  return ROLE_PERMISSIONS[role] || [];
}
