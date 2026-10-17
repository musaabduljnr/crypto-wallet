import React from "react";
import Link from "next/link";
import { requireStaffPermission } from "@/lib/admin/auth";
import { listAllRestrictions, RestrictionStatus } from "@/lib/admin/restrictions";
import { RestrictionsListClient } from "./restrictions-list-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminRestrictionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireStaffPermission("users.restrict");
  const params = await searchParams;
  const statusFilter = params.status as RestrictionStatus | undefined;

  const { restrictions, total } = await listAllRestrictions({
    status: statusFilter,
    limit: 50,
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Account Restrictions Registry</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Server-enforced operational locks, transaction holds, and account suspensions.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <Card className="p-3 bg-card/60">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-2 mr-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">Filter:</span>
          </div>

          <Link href="/admin/restrictions">
            <Button
              variant={!statusFilter ? "primary" : "outline"}
              size="sm"
              className="text-xs h-7"
            >
              All Records ({total})
            </Button>
          </Link>
          <Link href="/admin/restrictions?status=ACTIVE">
            <Button
              variant={statusFilter === "ACTIVE" ? "primary" : "outline"}
              size="sm"
              className="text-xs h-7"
            >
              Active Restrictions
            </Button>
          </Link>
          <Link href="/admin/restrictions?status=LIFTED">
            <Button
              variant={statusFilter === "LIFTED" ? "primary" : "outline"}
              size="sm"
              className="text-xs h-7"
            >
              Lifted
            </Button>
          </Link>
          <Link href="/admin/restrictions?status=EXPIRED">
            <Button
              variant={statusFilter === "EXPIRED" ? "primary" : "outline"}
              size="sm"
              className="text-xs h-7"
            >
              Expired
            </Button>
          </Link>
        </div>
      </Card>

      {/* Main List Client */}
      <RestrictionsListClient restrictions={restrictions} />
    </div>
  );
}
