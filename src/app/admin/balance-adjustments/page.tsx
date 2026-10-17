import React from "react";
import Link from "next/link";
import { requireStaffPermission } from "@/lib/admin/auth";
import { listBalanceAdjustments, AdjustmentStatus } from "@/lib/admin/adjustments";
import { BalanceAdjustmentsClient } from "./balance-adjustments-client";
import { hasPermission } from "@/lib/admin/permissions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter, Scale } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminBalanceAdjustmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const staff = await requireStaffPermission("balances.adjust.request");
  const params = await searchParams;
  const statusFilter = params.status as AdjustmentStatus | undefined;

  const { adjustments, total } = await listBalanceAdjustments({
    status: statusFilter,
    limit: 50,
  });

  const canApprove = hasPermission(staff.role, "balances.adjust.approve");

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Balance Adjustment Requests</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Maker-Checker dual-control workflow for accounting corrections and reconciliation credits/debits.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <Card className="p-3 bg-card/60">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-2 mr-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">Status Filter:</span>
          </div>

          <Link href="/admin/balance-adjustments">
            <Button
              variant={!statusFilter ? "primary" : "outline"}
              size="sm"
              className="text-xs h-7"
            >
              All Requests ({total})
            </Button>
          </Link>
          <Link href="/admin/balance-adjustments?status=PENDING">
            <Button
              variant={statusFilter === "PENDING" ? "primary" : "outline"}
              size="sm"
              className="text-xs h-7"
            >
              Pending Approval
            </Button>
          </Link>
          <Link href="/admin/balance-adjustments?status=POSTED">
            <Button
              variant={statusFilter === "POSTED" ? "primary" : "outline"}
              size="sm"
              className="text-xs h-7"
            >
              Posted (Settled)
            </Button>
          </Link>
          <Link href="/admin/balance-adjustments?status=REJECTED">
            <Button
              variant={statusFilter === "REJECTED" ? "primary" : "outline"}
              size="sm"
              className="text-xs h-7"
            >
              Rejected
            </Button>
          </Link>
        </div>
      </Card>

      {/* Main Table and Dialogs */}
      <BalanceAdjustmentsClient
        adjustments={adjustments}
        currentStaffId={staff.id}
        canApprove={canApprove}
      />
    </div>
  );
}
