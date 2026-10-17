"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { applyRestrictionAction } from "@/actions/admin.actions";
import { RestrictionType } from "@/lib/admin/restrictions";
import { ShieldAlert, X } from "lucide-react";

export function ApplyRestrictionDialog({
  userId,
  userEmail,
}: {
  userId: string;
  userEmail: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [restrictionType, setRestrictionType] = useState<RestrictionType>("INTERNAL_TRANSFER");
  const [reasonCategory, setReasonCategory] = useState("SUSPECTED_FRAUD");
  const [explanation, setExplanation] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("3");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!explanation.trim()) {
      setErrorMsg("A detailed internal explanation is required to apply an account restriction.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    let expiresAt: string | undefined;
    if (expiresInDays && parseInt(expiresInDays, 10) > 0) {
      const d = new Date();
      d.setDate(d.getDate() + parseInt(expiresInDays, 10));
      expiresAt = d.toISOString();
    }

    const res = await applyRestrictionAction({
      userId,
      restrictionType,
      reasonCategory,
      internalExplanation: explanation.trim(),
      expiresAt,
    });

    setSubmitting(false);

    if (res.success) {
      setIsOpen(false);
      setExplanation("");
    } else {
      setErrorMsg(res.error || "Failed to apply restriction");
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setIsOpen(true)} className="text-xs text-amber-600 dark:text-amber-400 border-amber-500/30">
        <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />
        Apply Restriction
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg shadow-xl border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
              <CardTitle className="text-sm font-semibold flex items-center space-x-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                <span>Apply Account Restriction ({userEmail})</span>
              </CardTitle>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-4">
                {errorMsg && (
                  <InlineNotice variant="destructive" title="Action Failed">
                    {errorMsg}
                  </InlineNotice>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Restriction Type
                    </label>
                    <select
                      value={restrictionType}
                      onChange={(e) => setRestrictionType(e.target.value as RestrictionType)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                    >
                      <option value="INTERNAL_TRANSFER">Internal Transfers</option>
                      <option value="EXTERNAL_WITHDRAWAL">External Withdrawals</option>
                      <option value="SWAP">Asset Swaps / RFQ</option>
                      <option value="FIAT_FUNDING">Fiat Funding</option>
                      <option value="CRYPTO_DEPOSIT">Crypto Deposits</option>
                      <option value="SIGN_IN">Sign In Block</option>
                      <option value="FULL_SUSPENSION">Full Account Suspension</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Reason Category
                    </label>
                    <select
                      value={reasonCategory}
                      onChange={(e) => setReasonCategory(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                    >
                      <option value="SUSPECTED_FRAUD">Suspected Fraud / Phishing</option>
                      <option value="AML_COMPLIANCE">AML / Sanctions Inquest</option>
                      <option value="CHARGEBACK_DISPUTE">Chargeback Dispute</option>
                      <option value="ACCOUNT_TAKEOVER_RISK">Account Takeover Risk</option>
                      <option value="CUSTOMER_REQUEST">Customer Request</option>
                      <option value="OPERATIONAL_HOLD">Operational Hold</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Duration (Days)
                  </label>
                  <Input
                    type="number"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                    placeholder="Leave 0 for indefinite hold"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    Temporary holds expire automatically without balance forfeiture.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Internal Case Explanation & Justification *
                  </label>
                  <textarea
                    rows={3}
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Provide detailed compliance/support notes explaining the grounds for this restriction..."
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </CardContent>

              <CardFooter className="flex justify-end space-x-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  isLoading={submitting}
                >
                  Confirm Restriction
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
