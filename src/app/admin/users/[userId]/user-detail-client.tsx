"use client";

import React, { useState } from "react";
import { AdminUserDetails } from "@/lib/admin/users";
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
} from "lucide-react";

export function UserDetailClient({ user }: { user: AdminUserDetails }) {
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
  const [submittingAdj, setSubmittingAdj] = useState(false);
  const [adjMsg, setAdjMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Lifting Restriction State
  const [liftingId, setLiftingId] = useState<string | null>(null);
  const [liftReason, setLiftReason] = useState("");
  const [submittingLift, setSubmittingLift] = useState(false);

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
          {["USDT", "USDC", "BTC", "ETH", "SOL", "NGN"].map((ticker) => {
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
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {user.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 4: REQUEST BALANCE ADJUSTMENT (Maker-Checker) */}
      {activeTab === "adjust" && (
        <Card className="max-w-xl shadow-xs">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <span>Request Ledger-Safe Balance Adjustment</span>
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleRequestAdjustment}>
            <CardContent className="space-y-4 pt-4">
              {adjMsg && (
                <InlineNotice variant={adjMsg.type === "success" ? "success" : "destructive"} title={adjMsg.type === "success" ? "Submitted" : "Error"}>
                  {adjMsg.text}
                </InlineNotice>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Asset</label>
                  <select
                    value={adjAsset}
                    onChange={(e) => setAdjAsset(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                  >
                    {["USDT", "USDC", "BTC", "ETH", "SOL", "NGN"].map((t) => (
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
                type="text"
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
                <span className="font-semibold text-foreground block">Maker-Checker Notice:</span>
                <p>
                  Submitting this request will place it into the pending queue. A separate authorized staff member must review and approve it before the double-entry ledger settlement is posted.
                </p>
              </div>

              <Button type="submit" size="sm" className="w-full" isLoading={submittingAdj}>
                Submit Adjustment Request
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
    </div>
  );
}
