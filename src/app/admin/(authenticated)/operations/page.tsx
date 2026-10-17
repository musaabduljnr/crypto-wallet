import React from "react";
import { requireStaffPermission } from "@/lib/admin/auth";
import { createServerClient } from "@/lib/supabase/server";
import { OperationsClient } from "./operations-client";

export const dynamic = "force-dynamic";

export default async function AdminOperationsPage() {
  await requireStaffPermission("audit_logs.read");
  const supabase = await createServerClient();

  const [
    { count: pendingWithdrawals },
    { count: pendingAdjustments },
    { count: totalTransactions },
  ] = await Promise.all([
    supabase
      .from("ledger_transactions")
      .select("*", { count: "exact", head: true })
      .eq("transaction_type", "WITHDRAWAL")
      .eq("status", "PENDING"),
    supabase
      .from("balance_adjustments")
      .select("*", { count: "exact", head: true })
      .eq("status", "PENDING"),
    supabase
      .from("ledger_transactions")
      .select("*", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Platform Operations & Reconciliation</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Provider connectivity health, live double-entry ledger audits, and operational queues.
        </p>
      </div>

      <OperationsClient
        initialMetrics={{
          pendingWithdrawals: pendingWithdrawals || 0,
          pendingAdjustments: pendingAdjustments || 0,
          totalTransactions: totalTransactions || 0,
        }}
      />
    </div>
  );
}
