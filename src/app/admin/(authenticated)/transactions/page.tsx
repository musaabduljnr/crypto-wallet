import React from "react";
import Link from "next/link";
import { requireStaffPermission } from "@/lib/admin/auth";
import { listAdminTransactions } from "@/lib/admin/transactions";
import { listAdminUsers } from "@/lib/admin/users";
import { AdminTransactionsClient } from "@/components/admin/admin-transactions-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; page?: string }>;
}) {
  await requireStaffPermission("transactions.read");
  const params = await searchParams;
  const type = params.type || "";
  const status = params.status || "";
  const page = parseInt(params.page || "1", 10);
  const limit = 25;
  const offset = (page - 1) * limit;

  const [{ transactions, total }, { users }] = await Promise.all([
    listAdminTransactions({
      type: type || undefined,
      status: status || undefined,
      limit,
      offset,
    }),
    listAdminUsers({ limit: 100 }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Transaction Management &amp; Monitoring</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit-grade visibility and full administrative control (add, edit, delete) across double-entry ledger journals.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-3 bg-card/60">
        <form method="GET" action="/admin/transactions" className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">Filters:</span>
          </div>

          <select
            name="type"
            defaultValue={type}
            className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
          >
            <option value="">All Types</option>
            <option value="FIAT_DEPOSIT">Fiat Deposit (USD)</option>
            <option value="CRYPTO_DEPOSIT">Crypto Deposit</option>
            <option value="EXTERNAL_WITHDRAWAL">Withdrawal</option>
            <option value="INTERNAL_TRANSFER">Internal Transfer</option>
            <option value="SWAP_CONVERSION">Swap Conversion</option>
            <option value="SYSTEM_RECONCILIATION">Balance Adjustment</option>
          </select>

          <select
            name="status"
            defaultValue={status}
            className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
          >
            <option value="">All Statuses</option>
            <option value="POSTED">Completed (Posted)</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="REVERSED">Reversed</option>
          </select>

          <Button type="submit" size="sm" variant="outline" className="text-xs">
            Apply Filters
          </Button>

          {(type || status) && (
            <Link href="/admin/transactions">
              <Button type="button" size="sm" variant="ghost" className="text-xs text-muted-foreground">
                Reset
              </Button>
            </Link>
          )}

          <div className="ml-auto text-xs text-muted-foreground font-mono">
            {total} total records
          </div>
        </form>
      </Card>

      {/* Transactions Management Table with Add / Edit / Delete */}
      <Card className="border border-border/60 bg-card/40 overflow-hidden p-4">
        <AdminTransactionsClient transactions={transactions} users={users} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border/40 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center space-x-2">
              {page > 1 && (
                <Link href={`/admin/transactions?page=${page - 1}&type=${type}&status=${status}`}>
                  <Button variant="outline" size="sm" className="text-xs">
                    Previous
                  </Button>
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/admin/transactions?page=${page + 1}&type=${type}&status=${status}`}>
                  <Button variant="outline" size="sm" className="text-xs">
                    Next
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
