"use client";

import React, { useState } from "react";
import { BalanceAdjustmentRecord, AdjustmentStatus } from "@/lib/admin/adjustments";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { reviewBalanceAdjustmentAction } from "@/actions/admin.actions";
import {
  Scale,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  User,
} from "lucide-react";
import Link from "next/link";

export function BalanceAdjustmentsClient({
  adjustments: initialAdjustments,
  currentStaffId,
  canApprove,
}: {
  adjustments: BalanceAdjustmentRecord[];
  currentStaffId: string;
  canApprove: boolean;
}) {
  const [adjustments, setAdjustments] = useState<BalanceAdjustmentRecord[]>(initialAdjustments);
  const [selectedAdj, setSelectedAdj] = useState<BalanceAdjustmentRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleReview = async (decision: "APPROVE" | "REJECT") => {
    if (!selectedAdj) return;
    if (decision === "REJECT" && !rejectionReason.trim()) {
      setActionNotice({ type: "error", text: "Please provide a rejection reason." });
      return;
    }

    setProcessing(true);
    setActionNotice(null);

    const res = await reviewBalanceAdjustmentAction({
      adjustmentId: selectedAdj.id,
      decision,
      rejectionReason: decision === "REJECT" ? rejectionReason.trim() : undefined,
    });

    setProcessing(false);

    if (res.success) {
      const resData = res.data as any;
      setActionNotice({
        type: "success",
        text:
          decision === "APPROVE"
            ? `Adjustment approved and posted to the double-entry ledger (Tx: ${resData?.ledgerTxId || "Settled"}).`
            : "Adjustment request rejected.",
      });

      setAdjustments((prev) =>
        prev.map((a) =>
          a.id === selectedAdj.id
            ? {
                ...a,
                status: decision === "APPROVE" ? ("POSTED" as AdjustmentStatus) : ("REJECTED" as AdjustmentStatus),
                reviewedBy: currentStaffId,
                reviewedAt: new Date().toISOString(),
                rejectionReason: decision === "REJECT" ? rejectionReason.trim() : a.rejectionReason,
                ledgerTransactionId: resData?.ledgerTxId || a.ledgerTransactionId,
              }
            : a
        )
      );

      setSelectedAdj(null);
      setRejectionReason("");
    } else {
      setActionNotice({
        type: "error",
        text: res.error || "Failed to process review decision.",
      });
    }
  };

  const getStatusBadge = (status: AdjustmentStatus) => {
    switch (status) {
      case "POSTED":
      case "APPROVED":
        return (
          <Badge variant="secondary" className="text-[10px] text-emerald-500 border-emerald-500/20 bg-emerald-500/10">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="secondary" className="text-[10px] text-amber-500 border-amber-500/20 bg-amber-500/10">
            <Clock className="h-3 w-3 mr-1" />
            PENDING REVIEW
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive" className="text-[10px]">
            <XCircle className="h-3 w-3 mr-1" />
            REJECTED
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {actionNotice && (
        <InlineNotice variant={actionNotice.type === "success" ? "success" : "destructive"}>
          {actionNotice.text}
        </InlineNotice>
      )}

      {/* Review Modal Dialog */}
      {selectedAdj && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border border-border shadow-2xl bg-card">
            <CardHeader className="border-b border-border/40 py-4">
              <CardTitle className="text-sm font-semibold flex items-center space-x-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Maker-Checker Adjustment Review</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/40 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target User:</span>
                  <span className="font-mono font-medium">{selectedAdj.userId.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Adjustment Direction:</span>
                  <span className={selectedAdj.direction === "CREDIT" ? "text-emerald-400 font-bold" : "text-blue-400 font-bold"}>
                    {selectedAdj.direction} ({selectedAdj.amount} {selectedAdj.assetTicker})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reason Category:</span>
                  <span>{selectedAdj.reasonCategory}</span>
                </div>
                <div className="flex flex-col space-y-1 pt-1 border-t border-border/40">
                  <span className="text-muted-foreground">Justification:</span>
                  <p className="text-foreground italic">{selectedAdj.justification}</p>
                </div>
              </div>

              {/* Invariant Check Notice */}
              {selectedAdj.requestedBy === currentStaffId ? (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Self-Approval Prohibited</p>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      You initiated this adjustment request. Under the platform maker-checker governance rule, a different authorized staff member must independently review and approve it.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-muted-foreground">
                    Approving this request will atomically post a double-entry journal entry between the platform reconciliation clearing account and the user&apos;s available ledger account.
                  </p>
                  <div>
                    <label className="block text-muted-foreground mb-1">Rejection Reason (required only if rejecting):</label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain why this request is being rejected..."
                      rows={2}
                      className="w-full bg-background border border-border rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border/40">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedAdj(null);
                    setRejectionReason("");
                  }}
                  disabled={processing}
                >
                  Cancel
                </Button>
                {selectedAdj.requestedBy !== currentStaffId && canApprove && (
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleReview("REJECT")}
                      disabled={processing}
                    >
                      Reject Request
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleReview("APPROVE")}
                      disabled={processing}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      {processing ? "Posting to Ledger..." : "Approve & Post Ledger"}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Adjustments Table */}
      <Card className="border border-border/60 bg-card/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/30 border-b border-border/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Effect</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Requested At</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {adjustments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Scale className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No balance adjustment requests found.
                  </td>
                </tr>
              ) : (
                adjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                      {adj.id.slice(0, 8)}...
                    </td>
                    <td className="py-3.5 px-4">
                      <Link href={`/admin/users/${adj.userId}`} className="text-primary hover:underline font-mono">
                        {adj.userId.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={adj.direction === "CREDIT" ? "text-emerald-400 font-semibold" : "text-blue-400 font-semibold"}>
                        {adj.direction} {adj.amount} <span className="font-mono text-[10px]">{adj.assetTicker}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground max-w-[200px] truncate">
                      {adj.reasonCategory.replace("_", " ")}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(adj.status)}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {new Date(adj.requestedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {adj.status === "PENDING" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAdj(adj)}
                          className="h-7 text-xs"
                        >
                          Review
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      ) : adj.ledgerTransactionId ? (
                        <Link href={`/admin/transactions/${adj.ledgerTransactionId}`}>
                          <Button variant="ghost" size="sm" className="h-7 text-xs font-mono">
                            Ledger Tx
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
