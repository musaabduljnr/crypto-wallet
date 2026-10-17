import React from "react";
import { requireStaffPermission } from "@/lib/admin/auth";
import { listStaffMembers } from "@/lib/admin/staff";
import { StaffClient } from "./staff-client";
import { hasPermission } from "@/lib/admin/permissions";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const staff = await requireStaffPermission("staff.manage");
  const staffList = await listStaffMembers();
  const canManage = hasPermission(staff.role, "staff.manage");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Staff & Role Governance</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage administrative personnel, assign granular security roles, and enforce dual-control privileges.
        </p>
      </div>

      <StaffClient staffList={staffList} currentStaffId={staff.id} canManage={canManage} />
    </div>
  );
}
