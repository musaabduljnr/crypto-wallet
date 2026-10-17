import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPermission } from "@/lib/admin/auth";
import { getAdminTransactionDetails } from "@/lib/admin/transactions";
import { TransactionInvestigationClient } from "./transaction-investigation-client";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminTransactionDetailPage({
  params,
}: {
  params: Promise<{ transactionId: string }>;
}) {
  await requireStaffPermission("transactions.read");
  const { transactionId } = await params;

  let tx;
  try {
    tx = await getAdminTransactionDetails(transactionId);
  } catch (err: any) {
    if (err?.code === "TRANSACTION_NOT_FOUND" || err?.status === 404) {
      notFound();
    }
    throw err;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge variant="secondary" className="text-xs text-emerald-500 border-emerald-500/20 bg-emerald-500/10">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            COMPLETED
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="secondary" className="text-xs text-amber-500 border-amber-500/20 bg-amber-500/10">
            <Clock className="h-3.5 w-3.5 mr-1" />
            PENDING
          </Badge>
        );
      case "FAILED":
        return (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="h-3.5 w-3.5 mr-1" />
            FAILED
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/transactions"
            className="p-1.5 rounded-lg border border-border bg-card/60 text-muted-foreground hover:text-foreground hover:bg-card transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground font-mono">
                {tx.referenceId}
              </h1>
              {getStatusBadge(tx.status)}
              <Badge variant="outline" className="text-xs font-mono uppercase">
                {tx.transactionType.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Internal Ledger ID: <span className="font-mono text-[11px]">{tx.id}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Investigation View */}
      <TransactionInvestigationClient tx={tx} />
    </div>
  );
}
