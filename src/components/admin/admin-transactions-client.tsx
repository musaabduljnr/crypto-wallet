"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminTransactionListItem } from "@/lib/admin/transactions";
import { AdminUserListItem } from "@/lib/admin/users";
import {
  adminCreateTransactionAction,
  adminUpdateTransactionAction,
  adminDeleteTransactionAction,
} from "@/actions/admin.actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Pencil,
  Trash2,
  X,
  ShieldAlert,
} from "lucide-react";

interface AdminTransactionsClientProps {
  transactions: AdminTransactionListItem[];
  users: AdminUserListItem[];
}

export function AdminTransactionsClient({
  transactions,
  users,
}: AdminTransactionsClientProps) {
  const router = useRouter();

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTx, setEditingTx] = useState<AdminTransactionListItem | null>(null);
  const [deletingTx, setDeletingTx] = useState<AdminTransactionListItem | null>(null);

  // Form states - Add
  const [addUserId, setAddUserId] = useState(users[0]?.id || "");
  const [addType, setAddType] = useState("FIAT_DEPOSIT");
  const [addAsset, setAddAsset] = useState("USD");
  const [addAmount, setAddAmount] = useState("");
  const [addDirection, setAddDirection] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [addStatus, setAddStatus] = useState<"COMPLETED" | "PENDING" | "FAILED">("COMPLETED");
  const [addRefId, setAddRefId] = useState("");
  const [addProviderRef, setAddProviderRef] = useState("");
  const [addCustomDate, setAddCustomDate] = useState("");
  const [addNote, setAddNote] = useState("");

  // Form states - Edit
  const [editStatus, setEditStatus] = useState("COMPLETED");
  const [editAmount, setEditAmount] = useState("");
  const [editRefId, setEditRefId] = useState("");
  const [editProviderRef, setEditProviderRef] = useState("");
  const [editCustomDate, setEditCustomDate] = useState("");
  const [editNote, setEditNote] = useState("");

  // Form states - Delete
  const [deleteReason, setDeleteReason] = useState("");

  // Loading & error states
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const openEditModal = (tx: AdminTransactionListItem) => {
    setEditingTx(tx);
    setEditStatus(tx.status === "POSTED" ? "COMPLETED" : tx.status);
    setEditAmount(tx.amount);
    setEditRefId(tx.referenceId);
    setEditProviderRef(tx.providerRef || "");
    setEditCustomDate(tx.createdAt ? new Date(tx.createdAt).toISOString().slice(0, 16) : "");
    setEditNote("");
    setErrorMessage(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUserId || !addAmount || parseFloat(addAmount) <= 0) {
      setErrorMessage("Please select a user and enter a valid positive amount.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const res = await adminCreateTransactionAction({
      userId: addUserId,
      type: addType,
      asset: addAsset,
      amount: addAmount,
      direction: addDirection,
      status: addStatus,
      referenceId: addRefId.trim() || undefined,
      providerRef: addProviderRef.trim() || undefined,
      note: addNote.trim() || undefined,
      createdAt: addCustomDate ? new Date(addCustomDate).toISOString() : undefined,
    });

    setSubmitting(false);

    if (res.success) {
      setSuccessMessage("Transaction successfully created and ledger updated!");
      setShowAddModal(false);
      setAddAmount("");
      setAddRefId("");
      setAddProviderRef("");
      setAddNote("");
      router.refresh();
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(res.error || "Failed to create transaction.");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    setSubmitting(true);
    setErrorMessage(null);

    const res = await adminUpdateTransactionAction({
      transactionId: editingTx.id,
      status: editStatus,
      amount: editAmount || undefined,
      referenceId: editRefId.trim() || undefined,
      providerRef: editProviderRef.trim() || undefined,
      note: editNote.trim() || undefined,
      createdAt: editCustomDate ? new Date(editCustomDate).toISOString() : undefined,
    });

    setSubmitting(false);

    if (res.success) {
      setSuccessMessage("Transaction successfully updated!");
      setEditingTx(null);
      router.refresh();
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(res.error || "Failed to update transaction.");
    }
  };

  const handleDelete = async () => {
    if (!deletingTx) return;

    setSubmitting(true);
    setErrorMessage(null);

    const res = await adminDeleteTransactionAction({
      transactionId: deletingTx.id,
      reason: deleteReason.trim() || undefined,
    });

    setSubmitting(false);

    if (res.success) {
      setSuccessMessage(`Transaction ${deletingTx.referenceId} and double-entry ledger journals removed.`);
      setDeletingTx(null);
      setDeleteReason("");
      router.refresh();
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(res.error || "Failed to delete transaction.");
    }
  };

  const getStatusBadge = (txStatus: string) => {
    switch (txStatus) {
      case "COMPLETED":
      case "POSTED":
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
    <div className="space-y-4">
      {/* Action Header Banner */}
      <div className="flex items-center justify-between">
        <div>
          {successMessage && (
            <div className="p-2.5 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="p-2.5 px-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
        <Button
          onClick={() => {
            setShowAddModal(true);
            setErrorMessage(null);
          }}
          size="sm"
          className="text-xs bg-primary text-primary-foreground hover:bg-primary/90 flex items-center space-x-1 ml-auto"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Transaction
        </Button>
      </div>

      {/* Transactions Table */}
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
              <th className="py-3 px-4 text-right">Super Admin Actions</th>
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
                  <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground truncate max-w-[120px]">
                    {tx.providerRef || "—"}
                  </td>
                  <td className="py-3.5 px-4 text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <Link href={`/admin/transactions/${tx.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2" title="Inspect Ledger Details">
                          Inspect
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(tx)}
                        className="h-7 text-xs px-2 text-primary hover:text-primary"
                        title="Edit Transaction"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeletingTx(tx);
                          setErrorMessage(null);
                        }}
                        className="h-7 text-xs px-2 text-destructive hover:bg-destructive/10"
                        title="Delete Transaction"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: ADD TRANSACTION */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg p-6 bg-card border-border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Add Ledger Transaction</h3>
                <p className="text-xs text-muted-foreground">Super Admin manual double-entry posting</p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowAddModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              {/* User Selector */}
              <div>
                <label className="font-semibold block mb-1 text-foreground">Target Customer User</label>
                <select
                  value={addUserId}
                  onChange={(e) => setAddUserId(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
                  required
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Grid: Type & Asset */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-foreground">Transaction Type</label>
                  <select
                    value={addType}
                    onChange={(e) => setAddType(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
                  >
                    <option value="FIAT_DEPOSIT">Fiat Deposit (USD)</option>
                    <option value="CRYPTO_DEPOSIT">Crypto Deposit</option>
                    <option value="INTERNAL_TRANSFER">Internal Transfer</option>
                    <option value="EXTERNAL_WITHDRAWAL">External Withdrawal</option>
                    <option value="SWAP_CONVERSION">Swap Conversion</option>
                    <option value="SYSTEM_RECONCILIATION">Balance Adjustment</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-foreground">Asset</label>
                  <select
                    value={addAsset}
                    onChange={(e) => setAddAsset(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
                  >
                    <option value="USD">USD (US Dollar)</option>
                    <option value="BTC">BTC (Bitcoin)</option>
                    <option value="ETH">ETH (Ethereum)</option>
                    <option value="USDT">USDT (Tether USD)</option>
                    <option value="USDC">USDC (USD Coin)</option>
                    <option value="SOL">SOL (Solana)</option>
                  </select>
                </div>
              </div>

              {/* Grid: Amount & Direction */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-foreground">Amount</label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-foreground">Balance Direction</label>
                  <select
                    value={addDirection}
                    onChange={(e) => setAddDirection(e.target.value as "CREDIT" | "DEBIT")}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
                  >
                    <option value="CREDIT">CREDIT (Add to user)</option>
                    <option value="DEBIT">DEBIT (Deduct from user)</option>
                  </select>
                </div>
              </div>

              {/* Grid: Status & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-foreground">Status</label>
                  <select
                    value={addStatus}
                    onChange={(e) => setAddStatus(e.target.value as "COMPLETED" | "PENDING" | "FAILED")}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
                  >
                    <option value="COMPLETED">COMPLETED (Posted to Ledger)</option>
                    <option value="PENDING">PENDING</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-foreground">Custom Date (Optional)</label>
                  <Input
                    type="datetime-local"
                    value={addCustomDate}
                    onChange={(e) => setAddCustomDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Reference & Provider Ref */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-foreground">Reference ID (Optional)</label>
                  <Input
                    placeholder="Auto-generated if empty"
                    value={addRefId}
                    onChange={(e) => setAddRefId(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-foreground">Tx Hash / Provider Ref (Optional)</label>
                  <Input
                    placeholder="e.g. 0x... or bank ref"
                    value={addProviderRef}
                    onChange={(e) => setAddProviderRef(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="font-semibold block mb-1 text-foreground">Administrative Justification / Note</label>
                <Input
                  placeholder="Reason for manual transaction"
                  value={addNote}
                  onChange={(e) => setAddNote(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? "Posting to Ledger..." : "Create Transaction"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL 2: EDIT TRANSACTION */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg p-6 bg-card border-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Edit Transaction</h3>
                <p className="text-xs text-muted-foreground font-mono">{editingTx.referenceId}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingTx(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {errorMessage}
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
                  <label className="font-semibold block mb-1 text-foreground">Amount ({editingTx.asset})</label>
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
                  placeholder="Explanation of change"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingTx(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL 3: DELETE TRANSACTION */}
      {deletingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md p-6 bg-card border-destructive/40 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-destructive">
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-foreground">Delete Transaction?</h3>
                <p className="text-xs text-muted-foreground font-mono">{deletingTx.referenceId}</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This action will permanently delete transaction <strong className="text-foreground">{deletingTx.referenceId}</strong> ({deletingTx.amount} {deletingTx.asset}) and its double-entry ledger lines. If the transaction was completed, balance changes will be safely reversed.
            </p>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {errorMessage}
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
              <Button type="button" variant="outline" size="sm" onClick={() => setDeletingTx(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={submitting}
              >
                {submitting ? "Deleting & Reversing..." : "Confirm Delete"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
