"use client";

import React, { useState } from "react";
import { AdminTransactionDetail } from "@/lib/admin/transactions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { addAdminNoteAction } from "@/actions/admin.actions";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Hash,
  Scale,
  Plus,
} from "lucide-react";
import Link from "next/link";

export function TransactionInvestigationClient({ tx }: { tx: AdminTransactionDetail }) {
  const [notes, setNotes] = useState(tx.notes);
  const [noteText, setNoteText] = useState("");
  const [isConfidential, setIsConfidential] = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);

  // Calculate sum of debits and sum of credits to verify ledger balance invariant
  let totalDebits = 0;
  let totalCredits = 0;
  tx.entries.forEach((e) => {
    const val = parseFloat(e.amount) || 0;
    if (e.direction === "DEBIT") totalDebits += val;
    if (e.direction === "CREDIT") totalCredits += val;
  });

  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.00000001;

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setSubmittingNote(true);
    const res = await addAdminNoteAction({
      targetEntityType: "TRANSACTION",
      targetEntityId: tx.id,
      noteText: noteText.trim(),
      isConfidential,
    });
    setSubmittingNote(false);

    if (res.success && res.data) {
      const noteData = res.data as any;
      setNotes((prev) => [
        {
          id: noteData.id,
          targetEntityType: "TRANSACTION",
          targetEntityId: tx.id,
          authorId: "current-admin",
          authorEmail: "Current Staff",
          noteText: noteData.noteText,
          isConfidential: noteData.isConfidential,
          createdAt: noteData.createdAt,
        },
        ...prev,
      ]);
      setNoteText("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Financial & Ledger Invariant Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-card/60 border-border/60">
          <div className="flex items-center space-x-2 text-muted-foreground mb-1">
            <Scale className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">Ledger Invariant Status</span>
          </div>
          <div className="flex items-center space-x-2 mt-2">
            {isBalanced ? (
              <Badge variant="secondary" className="text-xs text-emerald-500 border-emerald-500/20 bg-emerald-500/10">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Double-Entry Balanced (∑D = ∑C)
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="h-3.5 w-3.5 mr-1" />
                Ledger Imbalance Detected
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Total Debits: <span className="font-mono text-foreground">{totalDebits.toFixed(4)}</span> | Total Credits:{" "}
            <span className="font-mono text-foreground">{totalCredits.toFixed(4)}</span>
          </p>
        </Card>

        <Card className="p-4 bg-card/60 border-border/60">
          <div className="flex items-center space-x-2 text-muted-foreground mb-1">
            <Hash className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">Idempotency & Provider</span>
          </div>
          <div className="mt-2 space-y-1">
            <p className="text-[11px] text-muted-foreground">
              Provider Ref:{" "}
              <span className="font-mono text-foreground font-medium">{tx.providerRef || "Internal Ledger"}</span>
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              Key: <span className="font-mono text-foreground">{tx.idempotencyKey}</span>
            </p>
          </div>
        </Card>

        <Card className="p-4 bg-card/60 border-border/60">
          <div className="flex items-center space-x-2 text-muted-foreground mb-1">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">Execution Timeline</span>
          </div>
          <div className="mt-2 space-y-1 text-[11px]">
            <p className="text-muted-foreground">
              Created: <span className="text-foreground">{new Date(tx.createdAt).toLocaleString()}</span>
            </p>
            <p className="text-muted-foreground">
              Posted:{" "}
              <span className="text-foreground">
                {tx.postedAt ? new Date(tx.postedAt).toLocaleString() : "Awaiting Settlement"}
              </span>
            </p>
          </div>
        </Card>
      </div>

      {/* Double-Entry Ledger Entries Breakdown */}
      <Card className="border-border/60 bg-card/40 overflow-hidden">
        <CardHeader className="py-4 border-b border-border/40">
          <CardTitle className="text-sm font-semibold flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Double-Entry Journal Postings</span>
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/30 border-b border-border/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Account ID</th>
                <th className="py-3 px-4">Account Type</th>
                <th className="py-3 px-4">User Scope</th>
                <th className="py-3 px-4">Direction</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Asset</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 font-mono">
              {tx.entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/10">
                  <td className="py-3 px-4 text-muted-foreground text-[11px]">{entry.accountId}</td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className="text-[10px] font-sans">
                      {entry.accountType}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    {entry.userId ? (
                      <Link
                        href={`/admin/users/${entry.userId}`}
                        className="text-primary hover:underline font-sans text-xs"
                      >
                        {entry.userId.slice(0, 8)}...
                      </Link>
                    ) : (
                      <span className="text-muted-foreground font-sans">Platform Account</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {entry.direction === "DEBIT" ? (
                      <span className="text-blue-400 font-semibold">DEBIT</span>
                    ) : (
                      <span className="text-emerald-400 font-semibold">CREDIT</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-foreground">{entry.amount}</td>
                  <td className="py-3 px-4 text-muted-foreground">{entry.assetTicker}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Investigation Notes & Case History */}
      <Card className="border-border/60 bg-card/40">
        <CardHeader className="py-4 border-b border-border/40">
          <CardTitle className="text-sm font-semibold flex items-center space-x-2">
            <FileText className="h-4 w-4 text-primary" />
            <span>Administrative Investigation Notes</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <form onSubmit={handleAddNote} className="space-y-3">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Record forensic observations, provider correspondence, or reconciliation rationale..."
              rows={3}
              className="w-full bg-background border border-border rounded-xl p-3 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={isConfidential}
                  onChange={(e) => setIsConfidential(e.target.checked)}
                  className="rounded border-border"
                />
                <span>Confidential Note (Restricted to Compliance & Super Admin)</span>
              </label>
              <Button type="submit" size="sm" disabled={submittingNote || !noteText.trim()} className="text-xs">
                <Plus className="h-3 w-3 mr-1" />
                {submittingNote ? "Saving..." : "Add Note"}
              </Button>
            </div>
          </form>

          <div className="space-y-3 pt-2">
            {notes.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                No investigation notes logged for this transaction.
              </p>
            ) : (
              notes.map((n) => (
                <div key={n.id} className="p-3 rounded-xl border border-border/40 bg-background/50 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{n.authorEmail}</span>
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-foreground whitespace-pre-wrap">{n.noteText}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
