"use client";

import React, { useState } from "react";
import { StaffMemberRecord } from "@/lib/admin/staff";
import { StaffRole, ROLE_PERMISSIONS } from "@/lib/admin/permissions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InlineNotice } from "@/components/feedback/inline-notice";
import {
  updateStaffRoleAction,
  toggleStaffStatusAction,
  assignStaffMemberAction,
} from "@/actions/admin.actions";
import {
  ShieldCheck,
  UserCheck,
  UserX,
  UserPlus,
  ShieldAlert,
  Lock,
  CheckCircle2,
  X,
} from "lucide-react";

export function StaffClient({
  staffList: initialStaff,
  currentStaffId,
  canManage,
}: {
  staffList: StaffMemberRecord[];
  currentStaffId: string;
  canManage: boolean;
}) {
  const [staffList, setStaffList] = useState<StaffMemberRecord[]>(initialStaff);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<StaffRole>("support");
  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const activeSuperAdmins = staffList.filter((s) => s.role === "super_admin" && s.isActive);

  const handleRoleChange = async (targetUserId: string, newRole: StaffRole) => {
    setProcessing(true);
    setNotice(null);

    const res = await updateStaffRoleAction({ targetUserId, newRole });
    setProcessing(false);

    if (res.success) {
      setNotice({ type: "success", text: "Staff role updated successfully." });
      setStaffList((prev) =>
        prev.map((s) => (s.id === targetUserId ? { ...s, role: newRole } : s))
      );
    } else {
      setNotice({ type: "error", text: res.error || "Failed to update staff role." });
    }
  };

  const handleToggleStatus = async (targetUserId: string, currentActive: boolean) => {
    setProcessing(true);
    setNotice(null);

    const res = await toggleStaffStatusAction({ targetUserId, isActive: !currentActive });
    setProcessing(false);

    if (res.success) {
      setNotice({
        type: "success",
        text: `Staff member ${!currentActive ? "activated" : "deactivated"} successfully.`,
      });
      setStaffList((prev) =>
        prev.map((s) => (s.id === targetUserId ? { ...s, isActive: !currentActive } : s))
      );
    } else {
      setNotice({ type: "error", text: res.error || "Failed to toggle staff status." });
    }
  };

  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setProcessing(true);
    setNotice(null);

    const res = await assignStaffMemberAction({
      email: inviteEmail.trim(),
      role: inviteRole,
    });

    setProcessing(false);

    if (res.success) {
      setNotice({
        type: "success",
        text: `Staff role (${inviteRole}) successfully assigned to ${inviteEmail}.`,
      });
      setIsInviteOpen(false);
      setInviteEmail("");
    } else {
      setNotice({ type: "error", text: res.error || "Failed to assign staff member." });
    }
  };

  return (
    <div className="space-y-6">
      {notice && (
        <InlineNotice variant={notice.type === "success" ? "success" : "destructive"}>
          {notice.text}
        </InlineNotice>
      )}

      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Active Staff Roster</h2>
          <p className="text-xs text-muted-foreground">
            {activeSuperAdmins.length} active Super Administrator(s) provisioned.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setIsInviteOpen(true)} className="text-xs">
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Assign Staff Member
          </Button>
        )}
      </div>

      {/* Assign Staff Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md border border-border shadow-2xl bg-card">
            <form onSubmit={handleAssignStaff} className="p-4 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <span className="font-semibold text-sm flex items-center text-foreground">
                  <UserPlus className="h-4 w-4 text-primary mr-1.5" />
                  Assign Staff Permissions
                </span>
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">User Account Email:</label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@apexwallet.io"
                  required
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Administrative Role:</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as StaffRole)}
                  className="w-full bg-background border border-border rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
                >
                  <option value="super_admin">super_admin (Full Operational & Security Control)</option>
                  <option value="admin">admin (User & Transaction Operations)</option>
                  <option value="support">support (Customer Inquiry & Read Access)</option>
                  <option value="compliance">compliance (KYC & Risk Restrictions)</option>
                  <option value="finance">finance (Balance Adjustments & Maker-Checker)</option>
                  <option value="read_only">read_only (Forensic Read Only)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsInviteOpen(false)}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={processing || !inviteEmail.trim()}>
                  {processing ? "Assigning..." : "Assign Role"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Staff Roster Table */}
      <Card className="border border-border/60 bg-card/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/30 border-b border-border/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Current Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Granted Permissions</th>
                <th className="py-3 px-4">Added On</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {staffList.map((staff) => {
                const isOnlySuperAdmin =
                  staff.role === "super_admin" && staff.isActive && activeSuperAdmins.length <= 1;

                return (
                  <tr key={staff.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground">
                        {staff.firstName} {staff.lastName}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">{staff.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {canManage && !isOnlySuperAdmin ? (
                        <select
                          value={staff.role}
                          onChange={(e) => handleRoleChange(staff.id, e.target.value as StaffRole)}
                          disabled={processing}
                          className="bg-background border border-border rounded-xl px-2 py-1 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
                        >
                          <option value="super_admin">super_admin</option>
                          <option value="admin">admin</option>
                          <option value="support">support</option>
                          <option value="compliance">compliance</option>
                          <option value="finance">finance</option>
                          <option value="read_only">read_only</option>
                        </select>
                      ) : (
                        <div className="flex items-center space-x-1.5">
                          <Badge variant="outline" className="font-mono text-[10px] uppercase">
                            {staff.role}
                          </Badge>
                          {isOnlySuperAdmin && (
                            <Badge variant="secondary" className="text-[9px] text-amber-500 border-amber-500/20 bg-amber-500/10">
                              <Lock className="h-2.5 w-2.5 mr-0.5" />
                              Protected (Last Super Admin)
                            </Badge>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {staff.isActive ? (
                        <Badge variant="secondary" className="text-[10px] text-emerald-500 border-emerald-500/20 bg-emerald-500/10">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          ACTIVE
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          SUSPENDED
                        </Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {ROLE_PERMISSIONS[staff.role]?.length || 0} permissions
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {new Date(staff.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {canManage && !isOnlySuperAdmin && staff.id !== currentStaffId ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(staff.id, staff.isActive)}
                          disabled={processing}
                          className={`h-7 text-xs ${
                            staff.isActive ? "text-destructive hover:text-destructive" : "text-emerald-500 hover:text-emerald-400"
                          }`}
                        >
                          {staff.isActive ? "Suspend" : "Activate"}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
