"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminUserDetails } from "@/lib/admin/users";
import { LedgerTransactionSummary } from "@/lib/services/ledger.service";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InlineNotice } from "@/components/feedback/inline-notice";
import {
  addAdminNoteAction,
  updateAdminUserProfileAction,
  liftRestrictionAction,
  requestBalanceAdjustmentAction,
  directBalanceAdjustmentAction,
  adminCreateTransactionAction,
  adminUpdateTransactionAction,
  adminDeleteTransactionAction,
} from "@/actions/admin.actions";
import {
  SlidersHorizontal,
  ShieldAlert,
  FileText,
  Activity,
  UserCheck,
  CheckCircle2,
  Clock,
  Plus,
  Pencil,
  Trash2,
  X,
  ArrowRight,
  AlertCircle,
  Zap,
} from "lucide-react";

export function UserDetailClient({ user }: { user: AdminUserDetails }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"balances" | "restrictions" | "transactions" | "notes" | "edit" | "adjust">("balances");

  // Note State
  const [noteText, setNoteText] = useState("");
  const [isConfidential, setIsConfidential] = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);

  // Profile Edit State
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber);
  const [kycTier, setKycTier] = useState(String(user.kycTier));
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Balance Adjustment State
  const [adjAsset, setAdjAsset] = useState("USDT");
  const [adjDirection, setAdjDirection] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("ACCOUNTING_CORRECTION");
  const [adjJustification, setAdjJustification] = useState("");
  const [adjExecutionMode, setAdjExecutionMode] = useState<"DIRECT" | "QUEUE">("DIRECT");
  const [submittingAdj, setSubmittingAdj] = useState(false);
  const [adjMsg, setAdjMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Lifting Restriction State
  const [liftingId, setLiftingId] = useState<string | null>(null);
  const [liftReason, setLiftReason] = useState("");
  const [submittingLift, setSubmittingLift] = useState(false);

  // Transaction Management State
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [editingTx, setEditingTx] = useState<LedgerTransactionSummary | null>(null);
  const [deletingTx, setDeletingTx] = useState<LedgerTransactionSummary | null>(null);

  // Add Tx Form
  const [addTxType, setAddTxType] = useState("FIAT_DEPOSIT");
  const [addTxAsset, setAddTxAsset] = useState("USD");
  const [addTxAmount, setAddTxAmount] = useState("");
  const [addTxDirection, setAddTxDirection] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [addTxStatus, setAddTxStatus] = useState<"COMPLETED" | "PENDING" | "FAILED">("COMPLETED");
  const [addTxRefId, setAddTxRefId] = useState("");
  const [addTxProviderRef, setAddTxProviderRef] = useState("");
  const [addTxCustomDate, setAddTxCustomDate] = useState("");
  const [addTxNote, setAddTxNote] = useState("");

  // Edit Tx Form
  const [editTxStatus, setEditTxStatus] = useState("COMPLETED");
  const [editTxAmount, setEditTxAmount] = useState("");
  const [editTxRefId, setEditTxRefId] = useState("");
  const [editTxProviderRef, setEditTxProviderRef] = useState("");
  const [editTxCustomDate, setEditTxCustomDate] = useState("");
  const [editTxNote, setEditTxNote] = useState("");

  // Delete Tx Form
  const [deleteTxReason, setDeleteTxReason] = useState("");

  // Submitting / Error States
  const [submittingTx, setSubmittingTx] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);

  const openEditTxModal = (tx: LedgerTransactionSummary) => {
    setEditingTx(tx);
    setEditTxStatus(tx.status === "POSTED" ? "COMPLETED" : tx.status);
    setEditTxAmount(tx.amount);
    setEditTxRefId(tx.referenceId);
    setEditTxProviderRef(tx.externalProviderRef || "");
    setEditTxCustomDate(tx.createdAt ? new Date(tx.createdAt).toISOString().slice(0, 16) : "");
    setEditTxNote("");
    setTxError(null);
  };

  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTxAmount || parseFloat(addTxAmount) <= 0) {
      setTxError("Please enter a valid positive amount.");
      return;
    }
    setSubmittingTx(true);
    setTxError(null);
    const res = await adminCreateTransactionAction({
      userId: user.id,
      type: addTxType,
      asset: addTxAsset,
      amount: addTxAmount,
      direction: addTxDirection,
      status: addTxStatus,
      referenceId: addTxRefId.trim() || undefined,
      providerRef: addTxProviderRef.trim() || undefined,
      note: addTxNote.trim() || undefined,
      createdAt: addTxCustomDate ? new Date(addTxCustomDate).toISOString() : undefined,
    });
    setSubmittingTx(false);
    if (res.success) {
      setTxSuccess("Transaction successfully posted to ledger.");
      setShowAddTxModal(false);
      setAddTxAmount("");
      setAddTxRefId("");
      setAddTxProviderRef("");
      setAddTxNote("");
      router.refresh();
      setTimeout(() => setTxSuccess(null), 4000);
    } else {
      setTxError(res.error || "Failed to create transaction.");
    }
  };

  const handleUpdateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    setSubmittingTx(true);
    setTxError(null);
    const res = await adminUpdateTransactionAction({
      transactionId: editingTx.id,
      status: editTxStatus,
      amount: editTxAmount || undefined,
      referenceId: editTxRefId.trim() || undefined,
      providerRef: editTxProviderRef.trim() || undefined,
      note: editTxNote.trim() || undefined,
      createdAt: editTxCustomDate ? new Date(editTxCustomDate).toISOString() : undefined,
      userId: user.id,
    });
    setSubmittingTx(false);
    if (res.success) {
      setTxSuccess("Transaction updated successfully.");
      setEditingTx(null);
      router.refresh();
      setTimeout(() => setTxSuccess(null), 4000);
    } else {
      setTxError(res.error || "Failed to update transaction.");
    }
  };

  const handleDeleteTx = async () => {
    if (!deletingTx) return;
    setSubmittingTx(true);
    setTxError(null);
    const res = await adminDeleteTransactionAction({
      transactionId: deletingTx.id,
      reason: deleteTxReason.trim() || undefined,
      userId: user.id,
    });
    setSubmittingTx(false);
    if (res.success) {
      setTxSuccess(`Transaction ${deletingTx.referenceId} deleted and ledger reversed.`);
      setDeletingTx(null);
      setDeleteTxReason("");
      router.refresh();
      setTimeout(() => setTxSuccess(null), 4000);
    } else {
      setTxError(res.error || "Failed to delete transaction.");
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setSubmittingNote(true);
    await addAdminNoteAction({
      targetEntityType: "USER",
      targetEntityId: user.id,
      noteText: noteText.trim(),
      isConfidential,
    });
    setSubmittingNote(false);
    setNoteText("");
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProfile(true);
    setProfileMsg(null);

    const res = await updateAdminUserProfileAction({
      userId: user.id,
      firstName,
      lastName,
      phoneNumber,
      kycTier: parseInt(kycTier, 10),
    });

    setSubmittingProfile(false);
    if (res.success) {
      setProfileMsg({ type: "success", text: "Profile details updated successfully." });
    } else {
      setProfileMsg({ type: "error", text: res.error || "Update failed." });
    }
  };

  const handleRequestAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjAmount || parseFloat(adjAmount) <= 0 || !adjJustification.trim()) {
      setAdjMsg({ type: "error", text: "Please provide a valid amount and detailed justification." });
      return;
    }

    setSubmittingAdj(true);
    setAdjMsg(null);

    if (adjExecutionMode === "DIRECT") {
      const res = await directBalanceAdjustmentAction({
        userId: user.id,
        assetTicker: adjAsset,
        direction: adjDirection,
        amount: adjAmount,
        reasonCategory: adjReason,
        justification: adjJustification.trim(),
      });

      setSubmittingAdj(false);
      if (res.success) {
        const data = res.data as any;
        setAdjMsg({
          type: "success",
          text: `Balance adjusted successfully! New balance of ${data?.newBalance || adjAmount} ${adjAsset} is active and posted to user ledger.`,
        });
        setAdjAmount("");
        setAdjJustification("");
        router.refresh();
      } else {
        setAdjMsg({ type: "error", text: res.error || "Adjustment failed." });
      }
    } else {
      const res = await requestBalanceAdjustmentAction({
        userId: user.id,
        assetTicker: adjAsset,
        direction: adjDirection,
        amount: adjAmount,
        reasonCategory: adjReason,
        justification: adjJustification.trim(),
      });

      setSubmittingAdj(false);
      if (res.success) {
        setAdjMsg({
          type: "success",
          text: "Adjustment request submitted successfully to the Maker-Checker queue. Awaiting secondary approval.",
        });
        setAdjAmount("");
        setAdjJustification("");
      } else {
        setAdjMsg({ type: "error", text: res.error || "Submission failed." });
      }
    }
  };

  const handleLiftRestriction = async (restrictionId: string) => {
    if (!liftReason.trim()) {
      alert("Please provide an explanation for lifting this restriction.");
      return;
    }

    setSubmittingLift(true);
    const res = await liftRestrictionAction({
      restrictionId,
      liftReason: liftReason.trim(),
      userId: user.id,
    });
    setSubmittingLift(false);

    if (res.success) {
      setLiftingId(null);
      setLiftReason("");
    } else {
      alert(res.error || "Failed to lift restriction.");
    }
  };

  const tabs = [
    { id: "balances", label: "Ledger Balances", icon: Activity },
    { id: "restrictions", label: `Restrictions (${user.restrictions.filter(r => r.status === "ACTIVE").length})`, icon: ShieldAlert },
    { id: "transactions", label: `Transactions (${user.transactions.length})`, icon: Clock },
    { id: "adjust", label: "Request Adjustment", icon: SlidersHorizontal },
    { id: "notes", label: `Notes (${user.notes.length})`, icon: FileText },
    { id: "edit", label: "Edit Profile", icon: UserCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === t.id
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: LEDGER BALANCES */}
      {activeTab === "balances" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {["USDT", "USDC", "BTC", "ETH", "SOL", "USD"].map((ticker) => {
            const b = user.balances[ticker] || { available: "0.000000", reserved: "0.000000", pending: "0.000000" };
            return (
              <Card key={ticker} className="p-3.5 space-y-1 bg-card/60">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{ticker}</span>
                <p className="text-base font-bold font-mono text-foreground truncate">{b.available}</p>
                <div className="flex justify-between text-[10px] text-muted-foreground pt-1 border-t border-border">
                  <span>Reserved:</span>
                  <span className="font-mono">{b.reserved}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* TAB 2: RESTRICTIONS */}
      {activeTab === "restrictions" && (
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border">
            <CardTitle className="text-xs font-semibold">Account Restrictions Registry</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase">
                <tr>
                  <th className="py-2.5 px-4">Restriction Type</th>
                  <th className="py-2.5 px-4">Reason</th>
                  <th className="py-2.5 px-4">Explanation</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Date Applied</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {user.restrictions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground text-xs">
                      No restrictions recorded on this account.
                    </td>
                  </tr>
                ) : (
                  user.restrictions.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2.5 px-4 font-mono font-bold text-foreground text-[11px]">
                        {r.restrictionType}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">{r.reasonCategory}</td>
                      <td className="py-2.5 px-4 text-muted-foreground max-w-xs truncate">{r.internalExplanation}</td>
                      <td className="py-2.5 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            r.status === "ACTIVE"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none"
                              : "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-[11px] text-muted-foreground font-mono">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {r.status === "ACTIVE" && (
                          liftingId === r.id ? (
                            <div className="flex items-center space-x-1 justify-end">
                              <input
                                type="text"
                                placeholder="Reason for lifting..."
                                value={liftReason}
                                onChange={(e) => setLiftReason(e.target.value)}
                                className="bg-background border border-border rounded px-2 py-1 text-xs w-36"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-[10px]"
                                onClick={() => handleLiftRestriction(r.id)}
                                disabled={submittingLift}
                              >
                                Lift
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[10px]"
                                onClick={() => setLiftingId(null)}
                              >
                                ✕
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[11px]"
                              onClick={() => setLiftingId(r.id)}
                            >
                              Lift
                            </Button>
                          )
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: TRANSACTIONS */}
      {activeTab === "transactions" && (
        <Card className="shadow-xs overflow-hidden">
          <div className="p-3 bg-muted/20 border-b border-border flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-foreground">Double-Entry Ledger Transactions</h4>
              <p className="text-[11px] text-muted-foreground">Manage customer transaction history (Add, Edit, Delete)</p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setShowAddTxModal(true);
                setTxError(null);
              }}
              className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90 flex items-center space-x-1"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Transaction
            </Button>
          </div>

          {txSuccess && (
            <div className="m-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{txSuccess}</span>
            </div>
          )}
          {txError && (
            <div className="m-3 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{txError}</span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase">
                <tr>
                  <th className="py-2.5 px-4">Reference</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Amount</th>
                  <th className="py-2.5 px-4">Direction</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {user.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      No double-entry transactions recorded for this user.
                    </td>
                  </tr>
                ) : (
                  user.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/20">
                      <td className="py-2.5 px-4 font-mono font-bold text-foreground text-[11px]">
                        {tx.referenceId}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-foreground">{tx.transactionType}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-foreground">
                        {tx.amount} {tx.assetTicker}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`font-mono text-[11px] font-bold ${tx.direction === "CREDIT" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                           {tx.direction}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-[11px] text-muted-foreground font-mono">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <Link href={`/admin/transactions/${tx.id}`}>
                            <Button variant="ghost" size="sm" className="h-6 text-[11px] px-2" title="Inspect">
                              Inspect
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditTxModal(tx)}
                            className="h-6 text-[11px] px-2 text-primary"
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
                              setTxError(null);
                            }}
                            className="h-6 text-[11px] px-1.5 text-destructive hover:bg-destructive/10"
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
        </Card>
      )}

      {/* TAB 4: BALANCE ADJUSTMENT */}
      {activeTab === "adjust" && (
        <Card className="max-w-xl shadow-xs">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <span>Institutional Wallet Balance Adjustment</span>
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleRequestAdjustment}>
            <CardContent className="space-y-4 pt-4">
              {adjMsg && (
                <InlineNotice variant={adjMsg.type === "success" ? "success" : "destructive"} title={adjMsg.type === "success" ? "Success" : "Error"}>
                  {adjMsg.text}
                </InlineNotice>
              )}

              {/* Execution Mode Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">Execution Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjExecutionMode("DIRECT")}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      adjExecutionMode === "DIRECT"
                        ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    <div className="font-bold flex items-center space-x-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Instant Ledger Post</span>
                    </div>
                    <span className="text-[10px] opacity-80 block mt-0.5">Immediately updates balance & user ledger</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjExecutionMode("QUEUE")}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      adjExecutionMode === "QUEUE"
                        ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    <div className="font-bold flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Maker-Checker Queue</span>
                    </div>
                    <span className="text-[10px] opacity-80 block mt-0.5">Submit for secondary admin review</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Asset</label>
                  <select
                    value={adjAsset}
                    onChange={(e) => setAdjAsset(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  >
                    {["USD", "USDT", "USDC", "BTC", "ETH", "SOL"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Adjustment Direction</label>
                  <select
                    value={adjDirection}
                    onChange={(e) => setAdjDirection(e.target.value as "CREDIT" | "DEBIT")}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary font-mono font-bold"
                  >
                    <option value="CREDIT">CREDIT (+ Add User Balance)</option>
                    <option value="DEBIT">DEBIT (- Deduct User Balance)</option>
                  </select>
                </div>
              </div>

              <Input
                label="Adjustment Amount"
                type="number"
                step="any"
                placeholder="0.00"
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
                required
              />

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Reason Category</label>
                <select
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                >
                  <option value="ACCOUNTING_CORRECTION">Accounting Discrepancy Correction</option>
                  <option value="PROVIDER_RECONCILIATION">Provider Webhook Replay Discrepancy</option>
                  <option value="CUSTOMER_COMPENSATION">Authorized Support Compensation</option>
                  <option value="OPERATIONAL_CORRECTION">Operational Reversal Correction</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Detailed Justification & Audit Context *
                </label>
                <textarea
                  rows={3}
                  value={adjJustification}
                  onChange={(e) => setAdjJustification(e.target.value)}
                  placeholder="Explain why this adjustment is required, attaching reference ticket numbers..."
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="p-3 rounded-xl border border-border bg-muted/20 text-[11px] text-muted-foreground space-y-1">
                <span className="font-semibold text-foreground block">
                  {adjExecutionMode === "DIRECT" ? "Instant Settlement Notice:" : "Maker-Checker Notice:"}
                </span>
                <p>
                  {adjExecutionMode === "DIRECT"
                    ? "Applying this adjustment will immediately credit or debit the customer's available balance in the database and create a permanent double-entry ledger journal record."
                    : "Submitting this request will place it into the pending queue. A separate authorized staff member must review and approve it before the double-entry ledger settlement is posted."}
                </p>
              </div>

              <Button type="submit" size="sm" className="w-full" isLoading={submittingAdj}>
                {adjExecutionMode === "DIRECT" ? "Apply Balance Adjustment Now" : "Submit Adjustment Request"}
              </Button>
            </CardContent>
          </form>
        </Card>
      )}

      {/* TAB 5: STAFF NOTES */}
      {activeTab === "notes" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-3">
            {user.notes.length === 0 ? (
              <Card className="p-8 text-center text-xs text-muted-foreground">
                No internal staff notes on this account.
              </Card>
            ) : (
              user.notes.map((n) => (
                <Card key={n.id} className="p-3.5 space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-foreground">{n.authorEmail}</span>
                    <span className="text-muted-foreground font-mono">{new Date(n.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-foreground/90 whitespace-pre-wrap">{n.noteText}</p>
                </Card>
              ))
            )}
          </div>

          <Card className="p-4 space-y-3 h-fit shadow-xs">
            <h4 className="text-xs font-semibold text-foreground">Add Staff Case Note</h4>
            <form onSubmit={handleAddNote} className="space-y-3">
              <textarea
                rows={4}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Enter internal investigation or support notes..."
                className="w-full bg-background border border-border rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-primary"
                required
              />
              <Button type="submit" size="sm" className="w-full text-xs" isLoading={submittingNote}>
                Append Note
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* TAB 6: EDIT PROFILE */}
      {activeTab === "edit" && (
        <Card className="max-w-md shadow-xs">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold">Update Customer Profile</CardTitle>
          </CardHeader>
          <form onSubmit={handleUpdateProfile}>
            <CardContent className="space-y-3 pt-4">
              {profileMsg && (
                <InlineNotice variant={profileMsg.type === "success" ? "success" : "destructive"} title={profileMsg.type === "success" ? "Updated" : "Error"}>
                  {profileMsg.text}
                </InlineNotice>
              )}

              <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
              <Input label="Phone Number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">KYC Tier</label>
                <select
                  value={kycTier}
                  onChange={(e) => setKycTier(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                >
                  <option value="1">Tier 1 (Basic)</option>
                  <option value="2">Tier 2 (Standard)</option>
                  <option value="3">Tier 3 (Institutional)</option>
                </select>
              </div>

              <Button type="submit" size="sm" className="w-full" isLoading={submittingProfile}>
                Save Changes
              </Button>
            </CardContent>
          </form>
        </Card>
      )}

      {/* MODAL 1: ADD TRANSACTION */}
      {showAddTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg p-6 bg-card border-border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Add Ledger Transaction</h3>
                <p className="text-xs text-muted-foreground">Posting directly for {user.firstName} {user.lastName}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowAddTxModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {txError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {txError}
              </div>
            )}

            <form onSubmit={handleCreateTx} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-foreground">Transaction Type</label>
                  <select
                    value={addTxType}
                    onChange={(e) => setAddTxType(e.target.value)}
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
                    value={addTxAsset}
                    onChange={(e) => setAddTxAsset(e.target.value)}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-foreground">Amount</label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={addTxAmount}
                    onChange={(e) => setAddTxAmount(e.target.value)}
                    required
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-foreground">Direction</label>
                  <select
                    value={addTxDirection}
                    onChange={(e) => setAddTxDirection(e.target.value as "CREDIT" | "DEBIT")}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
                  >
                    <option value="CREDIT">CREDIT (+ Add to user)</option>
                    <option value="DEBIT">DEBIT (- Deduct from user)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-foreground">Status</label>
                  <select
                    value={addTxStatus}
                    onChange={(e) => setAddTxStatus(e.target.value as "COMPLETED" | "PENDING" | "FAILED")}
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
                    value={addTxCustomDate}
                    onChange={(e) => setAddTxCustomDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-foreground">Reference ID (Optional)</label>
                  <Input
                    placeholder="Auto-generated if empty"
                    value={addTxRefId}
                    onChange={(e) => setAddTxRefId(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-foreground">Tx Hash / Provider Ref</label>
                  <Input
                    placeholder="0x... or bank ref"
                    value={addTxProviderRef}
                    onChange={(e) => setAddTxProviderRef(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-foreground">Note / Justification</label>
                <Input
                  placeholder="Administrative reason"
                  value={addTxNote}
                  onChange={(e) => setAddTxNote(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddTxModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submittingTx}>
                  {submittingTx ? "Posting..." : "Create Transaction"}
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

            {txError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {txError}
              </div>
            )}

            <form onSubmit={handleUpdateTx} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-foreground">Status</label>
                  <select
                    value={editTxStatus}
                    onChange={(e) => setEditTxStatus(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
                  >
                    <option value="COMPLETED">COMPLETED (POSTED)</option>
                    <option value="PENDING">PENDING</option>
                    <option value="FAILED">FAILED</option>
                    <option value="REVERSED">REVERSED</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-foreground">Amount ({editingTx.assetTicker})</label>
                  <Input
                    type="number"
                    step="any"
                    value={editTxAmount}
                    onChange={(e) => setEditTxAmount(e.target.value)}
                    required
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1 text-foreground">Reference ID</label>
                  <Input
                    value={editTxRefId}
                    onChange={(e) => setEditTxRefId(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1 text-foreground">Custom Date</label>
                  <Input
                    type="datetime-local"
                    value={editTxCustomDate}
                    onChange={(e) => setEditTxCustomDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-foreground">Provider Ref / Hash</label>
                <Input
                  value={editTxProviderRef}
                  onChange={(e) => setEditTxProviderRef(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-foreground">Super Admin Note</label>
                <Input
                  placeholder="Reason for change"
                  value={editTxNote}
                  onChange={(e) => setEditTxNote(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingTx(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submittingTx}>
                  {submittingTx ? "Saving..." : "Save Changes"}
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
              This will permanently delete transaction <strong className="text-foreground">{deletingTx.referenceId}</strong> ({deletingTx.amount} {deletingTx.assetTicker}) from this user&apos;s ledger. If the transaction was completed, balances will be reversed automatically.
            </p>

            {txError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                {txError}
              </div>
            )}

            <div>
              <label className="font-semibold block mb-1 text-xs text-foreground">Audit Reason</label>
              <Input
                placeholder="Reason for deletion"
                value={deleteTxReason}
                onChange={(e) => setDeleteTxReason(e.target.value)}
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
                onClick={handleDeleteTx}
                disabled={submittingTx}
              >
                {submittingTx ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
