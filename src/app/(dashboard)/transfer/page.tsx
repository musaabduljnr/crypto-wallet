"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Send,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Coins,
  Receipt,
  ExternalLink,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InlineNotice } from "@/components/feedback/inline-notice";
import {
  resolveRecipientAction,
  executeTransferAction,
} from "@/actions/transaction.actions";
import { getPortfolioAction } from "@/actions/wallet.actions";
import { ResolvedRecipient, TransferResult } from "@/lib/services/transfer.service";

export default function TransferPage() {
  const [identifier, setIdentifier] = useState("");
  const [recipient, setRecipient] = useState<ResolvedRecipient | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const [asset, setAsset] = useState("USDT");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [loadingBalances, setLoadingBalances] = useState(true);

  const [step, setStep] = useState<"INPUT" | "CONFIRM" | "SUCCESS">("INPUT");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<TransferResult | null>(null);

  useEffect(() => {
    async function loadBalances() {
      try {
        setLoadingBalances(true);
        const res = await getPortfolioAction();
        if (res.success && res.data) {
          const balMap: Record<string, string> = {};
          res.data.assets.forEach((a) => {
            balMap[a.ticker] = a.availableBalance;
          });
          setBalances(balMap);
        }
      } finally {
        setLoadingBalances(false);
      }
    }
    loadBalances();
  }, []);

  const handleResolveRecipient = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) return;

    setResolving(true);
    setResolveError(null);
    setRecipient(null);

    try {
      const res = await resolveRecipientAction(identifier.trim());
      if (res.success && res.data) {
        setRecipient(res.data);
      } else {
        setResolveError(res.error || "Recipient not found. Please verify the email or phone number.");
      }
    } catch {
      setResolveError("Network error while resolving recipient.");
    } finally {
      setResolving(false);
    }
  };

  const currentAvailable = balances[asset] || "0.00";
  const numAmount = parseFloat(amount || "0");
  const numAvailable = parseFloat(currentAvailable);
  const isOverBalance = numAmount > numAvailable;

  const handleProceedToConfirm = () => {
    if (!recipient) {
      setResolveError("Please resolve a valid recipient first.");
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setSubmitError("Please enter a valid amount greater than zero.");
      return;
    }
    if (isOverBalance) {
      setSubmitError(`Amount exceeds available ${asset} balance.`);
      return;
    }
    setSubmitError(null);
    setStep("CONFIRM");
  };

  const handleConfirmTransfer = async () => {
    if (!recipient || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    const idempotencyKey = `txf-${crypto.randomUUID()}`;

    try {
      const res = await executeTransferAction({
        recipientId: recipient.recipientId,
        asset,
        amount,
        note: note.trim() || undefined,
        idempotencyKey,
      });

      if (res.success && res.data) {
        setReceipt(res.data);
        setStep("SUCCESS");
      } else {
        setSubmitError(res.error || "Transfer failed. Please try again.");
      }
    } catch {
      setSubmitError("An unexpected server error occurred during transfer settlement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setIdentifier("");
    setRecipient(null);
    setAmount("");
    setNote("");
    setReceipt(null);
    setSubmitError(null);
    setResolveError(null);
    setStep("INPUT");
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center space-x-2">
            <Send className="w-6 h-6 text-primary" />
            <span>Internal User Transfer</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Send fiat or crypto instantly to another ApexWallet user with zero network fees.
          </p>
        </div>
        <Badge variant="outline" className="self-start sm:self-auto bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200">
          Zero Fee • Instant
        </Badge>
      </div>

      {step === "INPUT" && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Recipient & Transfer Details</CardTitle>
            <CardDescription>
              Find a verified recipient using their registered email address or phone number.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 1. Recipient Lookup */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Recipient Email or Phone
              </label>
              <div className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="e.g. user@example.com or +234..."
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setRecipient(null);
                    setResolveError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleResolveRecipient();
                    }
                  }}
                  className="flex-1"
                  id="recipient-input"
                />
                <Button
                  type="button"
                  onClick={() => handleResolveRecipient()}
                  disabled={resolving || !identifier.trim()}
                  variant="secondary"
                  id="resolve-recipient-btn"
                >
                  {resolving ? "Searching..." : "Lookup"}
                </Button>
              </div>

              {resolveError && (
                <div className="flex items-center space-x-2 text-xs text-destructive mt-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{resolveError}</span>
                </div>
              )}

              {recipient && (
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20 flex items-center justify-between mt-2 animate-in fade-in">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{recipient.displayName}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{recipient.maskedIdentifier}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 border-none">
                    Tier {recipient.kycTier} Verified
                  </Badge>
                </div>
              )}
            </div>

            {/* 2. Asset Selection */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Select Asset
                </label>
                <span className="text-xs text-muted-foreground">
                  Available: <strong className="text-foreground">{loadingBalances ? "..." : currentAvailable} {asset}</strong>
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {["USDT", "USDC", "NGN", "BTC", "ETH", "SOL"].map((ticker) => (
                  <button
                    key={ticker}
                    type="button"
                    onClick={() => {
                      setAsset(ticker);
                      setAmount("");
                    }}
                    className={`p-2.5 rounded-xl border text-center font-medium text-xs transition-all ${
                      asset === ticker
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                        : "border-border bg-card hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {ticker}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Amount */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Amount to Send
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setSubmitError(null);
                  }}
                  className={`pr-16 ${isOverBalance ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  id="transfer-amount-input"
                />
                <button
                  type="button"
                  onClick={() => setAmount(currentAvailable)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-primary hover:underline px-1.5 py-0.5 rounded"
                >
                  MAX
                </button>
              </div>

              {isOverBalance && (
                <p className="text-xs text-destructive mt-1">
                  Amount exceeds available balance of {currentAvailable} {asset}
                </p>
              )}
            </div>

            {/* 4. Note (Optional) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Note (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. Lunch split, project invoice"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={60}
              />
            </div>

            {/* Fee summary & Total */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Transfer Fee:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">0.00 {asset} (Zero Fee)</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t border-border">
                <span>Total Debit:</span>
                <span>{amount ? parseFloat(amount).toFixed(4) : "0.0000"} {asset}</span>
              </div>
            </div>

            {submitError && (
              <InlineNotice variant="destructive" title="Validation Error">
                {submitError}
              </InlineNotice>
            )}

            <Button
              type="button"
              onClick={handleProceedToConfirm}
              disabled={!recipient || !amount || isOverBalance || numAmount <= 0}
              className="w-full"
              size="lg"
              id="proceed-transfer-btn"
            >
              Review Transfer
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "CONFIRM" && recipient && (
        <Card className="shadow-sm border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span>Confirm Internal Transfer</span>
            </CardTitle>
            <CardDescription>
              Please review all transfer details before submitting. Internal transfers are committed atomically on the server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-xl border border-border bg-card space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipient Name:</span>
                <span className="font-semibold text-foreground">{recipient.displayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipient Account:</span>
                <span className="font-mono text-foreground">{recipient.maskedIdentifier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Asset:</span>
                <span className="font-semibold text-foreground">{asset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-bold text-foreground text-sm">{amount} {asset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transfer Fee:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">0.00 {asset}</span>
              </div>
              {note && (
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="text-muted-foreground">Note:</span>
                  <span className="italic text-foreground">{note}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 font-bold text-sm text-foreground">
                <span>Total Debit:</span>
                <span className="text-primary">{amount} {asset}</span>
              </div>
            </div>

            {submitError && (
              <InlineNotice variant="destructive" title="Transfer Failed">
                {submitError}
              </InlineNotice>
            )}

            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("INPUT")}
                disabled={submitting}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleConfirmTransfer}
                disabled={submitting}
                className="flex-1"
                id="submit-transfer-confirm-btn"
              >
                {submitting ? "Processing..." : "Authorize & Send"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "SUCCESS" && receipt && (
        <Card className="shadow-sm border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10">
          <CardHeader className="text-center pb-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold text-emerald-900 dark:text-emerald-200">
              Transfer Completed
            </CardTitle>
            <CardDescription>
              Your transfer has been settled atomically on the authoritative ledger.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-xl border border-border bg-card space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction Ref:</span>
                <span className="font-mono font-bold text-foreground">{receipt.referenceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Sent:</span>
                <span className="font-bold text-foreground">{receipt.amount} {receipt.asset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipient:</span>
                <span className="font-semibold text-foreground">{recipient?.displayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Settlement Time:</span>
                <span className="text-foreground">{new Date(receipt.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-none">
                  {receipt.status}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <Button type="button" onClick={handleReset} variant="outline" className="flex-1">
                Make Another Transfer
              </Button>
              <Link href="/history" className="flex-1">
                <Button type="button" className="w-full">
                  View in History
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
