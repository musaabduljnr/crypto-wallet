import React from "react";
import Link from "next/link";
import { requireStaffPermission } from "@/lib/admin/auth";
import { listAdminTransactions } from "@/lib/admin/transactions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
} from "lucide-react";

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

  const { transactions, total } = await listAdminTransactions({
    type: type || undefined,
    status: status || undefined,
    limit,
    offset,
  });

  const totalPages = Math.ceil(total / limit) || 1;

  const getStatusBadge = (txStatus: string) => {
    switch (txStatus) {
      case "COMPLETED":
        return (
          <Badge variant="secondary" className="text-[10px] text-emerald-500 border-emerald-500/20 bg-emerald-500/10">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            COMPLETED
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="secondary" className="text-[10px] text-amber-500 border-amber-500/20 bg-amber-500/10">
            <Clock className="h-3 w-3 mr-1" />
            PENDING
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive" className="text-[10px]">
            <AlertCircle className="h-3 w-3 mr-1" />
            FAILED
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {txStatus}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Transaction Monitoring</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit-grade visibility into double-entry ledger journals, transfers, swaps, and funding operations.
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
            <option value="FUNDING">Funding</option>
            <option value="WITHDRAWAL">Withdrawal</option>
            <option value="INTERNAL_TRANSFER">Internal Transfer</option>
            <option value="SWAP">Swap</option>
            <option value="ADJUSTMENT">Balance Adjustment</option>
          </select>

          <select
            name="status"
            defaultValue={status}
            className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
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

      {/* Transactions Table */}
      <Card className="border border-border/60 bg-card/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/30 border-b border-border/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Amount / Asset</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Provider Ref</th>
                <th className="py-3 px-4">Created At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No transactions found matching current criteria.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                      {tx.referenceId}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="text-[10px] font-mono uppercase">
                        {tx.transactionType.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {tx.amount} <span className="font-mono text-[10px] text-muted-foreground">{tx.asset}</span>
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(tx.status)}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                      {tx.providerRef || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/admin/transactions/${tx.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          Inspect
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
