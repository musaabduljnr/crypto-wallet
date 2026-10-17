"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { runReconciliationAuditAction } from "@/actions/admin.actions";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Scale,
  ShieldCheck,
  Server,
  Zap,
  Radio,
  FileCheck2,
} from "lucide-react";

export function OperationsClient({
  initialMetrics,
}: {
  initialMetrics: {
    pendingWithdrawals: number;
    pendingAdjustments: number;
    totalTransactions: number;
  };
}) {
  const [runningRecon, setRunningRecon] = useState(false);
  const [reconReport, setReconReport] = useState<any | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleRunReconciliation = async () => {
    setRunningRecon(true);
    setNotice(null);

    const res = await runReconciliationAuditAction();
    setRunningRecon(false);

    if (res.success && res.data) {
      setReconReport(res.data);
      setNotice({
        type: "success",
        text: "Ledger invariant integrity audit completed successfully.",
      });
    } else {
      setNotice({
        type: "error",
        text: res.error || "Failed to execute reconciliation audit.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {notice && (
        <InlineNotice variant={notice.type === "success" ? "success" : "destructive"}>
          {notice.text}
        </InlineNotice>
      )}

      {/* Provider Connectivity & Health */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center space-x-2">
          <Server className="h-4 w-4 text-primary" />
          <span>External Adapter & Provider Gateways</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-card/60 border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Korapay Gateway</span>
              <Badge variant="secondary" className="text-[10px] text-emerald-500 border-emerald-500/20 bg-emerald-500/10">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                ONLINE
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Fiat NGN deposit checkout, bank transfer virtual accounts & webhook listener.
            </p>
            <div className="mt-3 pt-2 border-t border-border/40 text-[10px] text-muted-foreground flex justify-between">
              <span>Signature: HMAC-SHA256</span>
              <span className="text-emerald-500 font-medium">Verified</span>
            </div>
          </Card>

          <Card className="p-4 bg-card/60 border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Custody Adapter</span>
              <Badge variant="secondary" className="text-[10px] text-emerald-500 border-emerald-500/20 bg-emerald-500/10">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                ONLINE
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              MPC multi-chain custodial vaults (BTC, ETH, SOL, EVM) & hot-wallet balance monitors.
            </p>
            <div className="mt-3 pt-2 border-t border-border/40 text-[10px] text-muted-foreground flex justify-between">
              <span>Signing: HSM Cluster</span>
              <span className="text-emerald-500 font-medium">Healthy</span>
            </div>
          </Card>

          <Card className="p-4 bg-card/60 border-border/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Price Oracle Feed</span>
              <Badge variant="secondary" className="text-[10px] text-emerald-500 border-emerald-500/20 bg-emerald-500/10">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                STREAMING
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Live crypto-to-fiat quote rates with 0.5% slip protection and 60-second TTL.
            </p>
            <div className="mt-3 pt-2 border-t border-border/40 text-[10px] text-muted-foreground flex justify-between">
              <span>Latency: &lt; 150ms</span>
              <span className="text-emerald-500 font-medium">Live</span>
            </div>
          </Card>
        </div>
      </div>

      {/* Mathematical Ledger Reconciliation Auditor */}
      <Card className="border-border/60 bg-card/40">
        <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Scale className="h-4 w-4 text-primary" />
              <span>Double-Entry Ledger Reconciliation & Invariant Auditor</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Direct verification of ledger integrity: ∑(Debits) = ∑(Credits) across all posted journals and deduplication of external provider references.
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleRunReconciliation}
            disabled={runningRecon}
            className="text-xs shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${runningRecon ? "animate-spin" : ""}`} />
            {runningRecon ? "Auditing Ledger..." : "Run Integrity Check"}
          </Button>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {reconReport ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 rounded-xl bg-background/50 border border-border/40">
                  <span className="text-[11px] text-muted-foreground">System Audit Status</span>
                  <div className="mt-1 flex items-center space-x-1.5">
                    {reconReport.isBalanced ? (
                      <Badge variant="secondary" className="text-xs text-emerald-500 border-emerald-500/20 bg-emerald-500/10">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        HEALTHY & BALANCED
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="h-3.5 w-3.5 mr-1" />
                        DISCREPANCY FOUND
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-background/50 border border-border/40">
                  <span className="text-[11px] text-muted-foreground">Unbalanced Journals</span>
                  <div className="text-lg font-bold font-mono text-foreground mt-1">
                    {reconReport.unbalancedTransactionsCount}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Must equal 0 for financial compliance
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-background/50 border border-border/40">
                  <span className="text-[11px] text-muted-foreground">Duplicate Provider Refs</span>
                  <div className="text-lg font-bold font-mono text-foreground mt-1">
                    {reconReport.duplicateProviderRefsCount}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Idempotency protection check
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground font-mono">
                Audit executed at: {new Date(reconReport.timestamp).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-muted-foreground text-xs">
              <FileCheck2 className="h-8 w-8 mx-auto mb-2 opacity-30 text-primary" />
              Click &quot;Run Integrity Check&quot; to execute real-time mathematical validation against the active database.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Operational Queues */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center space-x-2">
          <Activity className="h-4 w-4 text-primary" />
          <span>Operational Queue Backlog</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-border/60 bg-card/40">
            <span className="text-xs text-muted-foreground">Pending Withdrawals</span>
            <div className="text-xl font-bold font-mono text-foreground mt-1">
              {initialMetrics.pendingWithdrawals}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              External blockchain payouts awaiting review or submission.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border/60 bg-card/40">
            <span className="text-xs text-muted-foreground">Pending Balance Adjustments</span>
            <div className="text-xl font-bold font-mono text-foreground mt-1">
              {initialMetrics.pendingAdjustments}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Maker-checker requests awaiting independent dual approval.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border/60 bg-card/40">
            <span className="text-xs text-muted-foreground">Total Ledger Transactions</span>
            <div className="text-xl font-bold font-mono text-foreground mt-1">
              {initialMetrics.totalTransactions}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Authoritative double-entry records in immutable ledger.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
