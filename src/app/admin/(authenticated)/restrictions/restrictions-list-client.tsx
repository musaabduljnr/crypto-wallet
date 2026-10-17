"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AccountRestrictionRecord, RestrictionStatus } from "@/lib/admin/restrictions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { liftRestrictionAction } from "@/actions/admin.actions";
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";

export function RestrictionsListClient({
  restrictions: initialRestrictions,
}: {
  restrictions: AccountRestrictionRecord[];
}) {
  const [restrictions, setRestrictions] = useState<AccountRestrictionRecord[]>(initialRestrictions);
  const [liftingRecord, setLiftingRecord] = useState<AccountRestrictionRecord | null>(null);
  const [liftReason, setLiftReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleLift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liftingRecord) return;
    if (!liftReason.trim()) {
      setNotice({ type: "error", text: "A documented lift rationale is required." });
      return;
    }

    setProcessing(true);
    setNotice(null);

    const res = await liftRestrictionAction({
      restrictionId: liftingRecord.id,
      liftReason: liftReason.trim(),
    });

    setProcessing(false);

    if (res.success) {
      setNotice({
        type: "success",
        text: `Restriction on user ${liftingRecord.userId.slice(0, 8)} lifted successfully.`,
      });
      setRestrictions((prev) =>
        prev.map((r) =>
          r.id === liftingRecord.id
            ? {
                ...r,
                status: "LIFTED" as RestrictionStatus,
                liftedAt: new Date().toISOString(),
                liftReason: liftReason.trim(),
              }
            : r
        )
      );
      setLiftingRecord(null);
      setLiftReason("");
    } else {
      setNotice({ type: "error", text: res.error || "Failed to lift restriction." });
    }
  };

  const getStatusBadge = (status: RestrictionStatus) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="destructive" className="text-[10px]">
            <ShieldAlert className="h-3 w-3 mr-1" />
            ACTIVE
          </Badge>
        );
      case "LIFTED":
        return (
          <Badge variant="secondary" className="text-[10px] text-emerald-500 border-emerald-500/20 bg-emerald-500/10">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            LIFTED
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            EXPIRED
          </Badge>
        );
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {notice && (
        <InlineNotice variant={notice.type === "success" ? "success" : "destructive"}>
          {notice.text}
        </InlineNotice>
      )}

      {/* Lift Dialog Modal */}
      {liftingRecord && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md border border-border shadow-2xl bg-card">
            <form onSubmit={handleLift} className="p-4 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-border/40">
                <span className="font-semibold text-sm flex items-center text-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 mr-1.5" />
                  Lift Account Restriction
                </span>
                <button
                  type="button"
                  onClick={() => setLiftingRecord(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border/40 space-y-1.5">
                <p className="text-muted-foreground">
                  User ID: <span className="font-mono text-foreground">{liftingRecord.userId}</span>
                </p>
                <p className="text-muted-foreground">
                  Restriction: <span className="text-foreground font-semibold">{liftingRecord.restrictionType}</span>
                </p>
                <p className="text-muted-foreground">
                  Applied Reason: <span className="text-foreground">{liftingRecord.reasonCategory}</span>
                </p>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">
                  Removal Justification & Case Reference (Required):
                </label>
                <textarea
                  value={liftReason}
                  onChange={(e) => setLiftReason(e.target.value)}
                  placeholder="Record verification outcome or authorization to lift this restriction..."
                  rows={3}
                  className="w-full bg-background border border-border rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLiftingRecord(null)}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={processing || !liftReason.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  {processing ? "Removing..." : "Confirm & Lift"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card className="border border-border/60 bg-card/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/30 border-b border-border/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Internal Explanation</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created At</th>
                <th className="py-3 px-4">Expires At</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {restrictions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-30 text-emerald-500" />
                    No active or historical restrictions found.
                  </td>
                </tr>
              ) : (
                restrictions.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium">
                      <Link href={`/admin/users/${r.userId}`} className="text-primary hover:underline">
                        {r.userId.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {r.restrictionType}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">{r.reasonCategory.replace("_", " ")}</td>
                    <td className="py-3.5 px-4 max-w-[220px] truncate text-foreground">{r.internalExplanation}</td>
                    <td className="py-3.5 px-4">{getStatusBadge(r.status)}</td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : "Permanent"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {r.status === "ACTIVE" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLiftingRecord(r)}
                          className="h-7 text-xs text-emerald-500 hover:text-emerald-400"
                        >
                          Lift
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">Resolved</span>
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
