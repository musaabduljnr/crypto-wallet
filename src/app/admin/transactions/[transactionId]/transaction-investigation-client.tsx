"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminTransactionDetail } from "@/lib/admin/transactions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  addAdminNoteAction,
  adminUpdateTransactionAction,
  adminDeleteTransactionAction,
} from "@/actions/admin.actions";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Hash,
  Scale,
  Plus,
  Pencil,
  Trash2,
  X,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";

export function TransactionInvestigationClient({ tx }: { tx: AdminTransactionDetail }) {
  const router = useRouter();
  const [notes, setNotes] = useState(tx.notes);
  const [noteText, setNoteText] = useState("");
  const [isConfidential, setIsConfidential] = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);

  // Super Admin Edit & Delete States
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [editStatus, setEditStatus] = useState(tx.status === "POSTED" ? "COMPLETED" : tx.status);
  const [editAmount, setEditAmount] = useState(tx.entries[0]?.amount || "0");
  const [editRefId, setEditRefId] = useState(tx.referenceId);
  const [editProviderRef, setEditProviderRef] = useState(tx.providerRef || "");
  const [editCustomDate, setEditCustomDate] = useState(
    tx.createdAt ? new Date(tx.createdAt).toISOString().slice(0, 16) : ""
  );
  const [editNote, setEditNote] = useState((tx.metadata?.note as string) || "");

  const [deleteReason, setDeleteReason] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Calculate sum of debits and sum of credits to verify ledger balance invariant
  let totalDebits = 0;
  let totalCredits = 0;
  tx.entries.forEach((e) => {
    const val = parseFloat(e.amount) || 0;
    if (e.direction === "DEBIT") totalDebits += val;
    if (e.direction === "CREDIT") totalCredits += val;
  });

  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.00000001;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAction(true);
    setActionError(null);

    const res = await adminUpdateTransactionAction({
      transactionId: tx.id,
      status: editStatus,
      amount: editAmount || undefined,
      referenceId: editRefId.trim() || undefined,
      providerRef: editProviderRef.trim() || undefined,
      note: editNote.trim() || undefined,
      createdAt: editCustomDate ? new Date(editCustomDate).toISOString() : undefined,
    });

    setSubmittingAction(false);

    if (res.success) {
      setActionSuccess("Transaction updated successfully!");
      setShowEditModal(false);
      router.refresh();
      setTimeout(() => setActionSuccess(null), 4000);
    } else {
      setActionError(res.error || "Failed to update transaction.");
    }
  };

  const handleDelete = async () => {
    setSubmittingAction(true);
    setActionError(null);

    const res = await adminDeleteTransactionAction({
      transactionId: tx.id,
      reason: deleteReason.trim() || undefined,
    });

    setSubmittingAction(false);

    if (res.success) {
      router.push("/admin/transactions");
    } else {
      setActionError(res.error || "Failed to delete transaction.");
    }
  };

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
      {/* Super Admin Management Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl bg-card/60 border border-border">
        <div>
          <span className="text-xs font-semibold text-foreground">Super Admin Ledger Control:</span>
          <span className="text-xs text-muted-foreground ml-2">Edit journal records or reverse transaction entries.</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowEditModal(true);
              setActionError(null);
            }}
            className="text-xs h-8"
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit Transaction
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setShowDeleteModal(true);
              setActionError(null);
            }}
            className="text-xs h-8"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete Transaction
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
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

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg p-6 bg-card border-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Edit Transaction</h3>
                <p className="text-xs text-muted-foreground font-mono">{tx.referenceId}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowEditModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-foreground">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
                  >
                    <option value="COMPLETED">COMPLETED (POSTED)</option>
                    <option value="PENDING">PENDING</option>
                    <option value="FAILED">FAILED</option>
                    <option value="REVERSED">REVERSED</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-foreground">Amount ({tx.entries[0]?.assetTicker || "USD"})</label>
                  <Input
                    type="number"
                    step="any"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    required
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-foreground">Reference ID</label>
                  <Input
                    value={editRefId}
                    onChange={(e) => setEditRefId(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-foreground">Custom Date</label>
                  <Input
                    type="datetime-local"
                    value={editCustomDate}
                    onChange={(e) => setEditCustomDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-foreground">Provider Ref / Hash</label>
                <Input
                  value={editProviderRef}
                  onChange={(e) => setEditProviderRef(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-foreground">Super Admin Note</label>
                <Input
                  placeholder="Reason for change"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submittingAction}>
                  {submittingAction ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md p-6 bg-card border-destructive/40 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-destructive">
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-foreground">Delete Transaction?</h3>
                <p className="text-xs text-muted-foreground font-mono">{tx.referenceId}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This action will permanently delete transaction <strong className="text-foreground">{tx.referenceId}</strong> and all its associated double-entry ledger lines. If the transaction was posted, customer balances will be safely reversed.
            </p>

            {actionError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {actionError}
              </div>
            )}

            <div>
              <label className="font-semibold block mb-1 text-xs text-foreground">Audit Reason</label>
              <Input
                placeholder="Reason for deletion"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={submittingAction}
              >
                {submittingAction ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
