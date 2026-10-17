import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPermission } from "@/lib/admin/auth";
import { getAdminUserDetails } from "@/lib/admin/users";
import { UserDetailClient } from "./user-detail-client";
import { ApplyRestrictionDialog } from "./apply-restriction-dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShieldAlert, CheckCircle2, User } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireStaffPermission("users.read");
  const { userId } = await params;

  let user;
  try {
    user = await getAdminUserDetails(userId);
  } catch (err: any) {
    if (err?.code === "USER_NOT_FOUND" || err?.status === 404) {
      notFound();
    }
    throw err;
  }

  const hasActiveRestrictions = user.restrictions.some((r) => r.status === "ACTIVE");

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/users"
            className="p-1.5 rounded-lg border border-border bg-card/60 text-muted-foreground hover:text-foreground hover:bg-card transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {user.firstName} {user.lastName}
              </h1>
              {hasActiveRestrictions ? (
                <Badge variant="destructive" className="text-[10px] uppercase">
                  <ShieldAlert className="h-3 w-3 mr-1" />
                  Restricted
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] text-emerald-500 border-emerald-500/20 bg-emerald-500/10">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] font-mono">
                Tier {user.kycTier}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              ID: <span className="font-mono text-[11px]">{user.id}</span> · Email: {user.email}
            </p>
          </div>
        </div>

        {/* Quick Action: Apply Restriction */}
        <div className="flex items-center space-x-2">
          <ApplyRestrictionDialog userId={user.id} userEmail={user.email} />
        </div>
      </div>

      {/* Main Tabbed Details View */}
      <UserDetailClient user={user} />
    </div>
  );
}
