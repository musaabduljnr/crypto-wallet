"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Info,
  Clock,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InlineNotice } from "@/components/feedback/inline-notice";
import {
  getWithdrawalFeeQuoteAction,
  executeWithdrawalAction,
} from "@/actions/transaction.actions";
import { getPortfolioAction } from "@/actions/wallet.actions";
import { WithdrawalExecutionResult, WithdrawalFeeQuote } from "@/lib/services/withdrawal.service";

export default function WithdrawPage() {
  const [asset, setAsset] = useState("USDT");
  const [network, setNetwork] = useState("POLYGON");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [amount, setAmount] = useState("");

  const [feeQuote, setFeeQuote] = useState<WithdrawalFeeQuote | null>(null);
  const [loadingFee, setLoadingFee] = useState(false);

  const [balances, setBalances] = useState<Record<string, string>>({});
  const [loadingBalances, setLoadingBalances] = useState(true);

  const [step, setStep] = useState<"INPUT" | "CONFIRM" | "SUCCESS">("INPUT");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<WithdrawalExecutionResult | null>(null);

  // Network compatibility per asset
  const networkOptions: Record<string, string[]> = {
    USDT: ["POLYGON", "ARBITRUM", "BASE", "TRON", "ETHEREUM"],
    USDC: ["POLYGON", "ARBITRUM", "BASE", "ETHEREUM", "SOLANA"],
    BTC: ["BITCOIN"],
    ETH: ["ETHEREUM", "ARBITRUM", "BASE"],
    SOL: ["SOLANA"],
  };

  useEffect(() => {
    async function loadBalances() {
      try {
        setLoadingBalances(true);
        const res = await getPortfolioAction();
        if (res.success && res.data) {
          const b: Record<string, string> = {};
          res.data.assets.forEach((a) => {
            b[a.ticker] = a.availableBalance;
          });
          setBalances(b);
        }
      } finally {
        setLoadingBalances(false);
      }
    }
    loadBalances();
  }, []);

  // Update available networks when asset changes
  useEffect(() => {
    const availableNets = networkOptions[asset] || ["POLYGON"];
    if (!availableNets.includes(network)) {
      setNetwork(availableNets[0]);
    }
  }, [asset]);

  // Fetch fee quote when asset or network changes
  useEffect(() => {
    async function fetchFee() {
      try {
        setLoadingFee(true);
        const res = await getWithdrawalFeeQuoteAction(asset, network);
        if (res.success && res.data) {
          setFeeQuote(res.data);
        }
      } finally {
        setLoadingFee(false);
      }
    }
    fetchFee();
  }, [asset, network]);

  const currentAvailable = balances[asset] || "0.00";
  const numAmount = parseFloat(amount || "0");
  const numFee = feeQuote ? parseFloat(feeQuote.networkFee) : 0;
  const totalDebit = (numAmount + numFee).toFixed(4);
  const numAvailable = parseFloat(currentAvailable);
  const isOverBalance = numAmount + numFee > numAvailable;

  const validateAddressLocally = (addr: string, net: string) => {
    if (!addr) return false;
    if (["POLYGON", "ARBITRUM", "BASE", "ETHEREUM"].includes(net)) {
      return /^0x[a-fA-F0-9]{40}$/.test(addr);
    }
    if (net === "TRON") {
      return /^T[1-9A-HJ-NP-za-km-z]{33}$/.test(addr);
    }
    if (net === "SOLANA") {
      return /^[1-9A-HJ-NP-za-km-z]{32,44}$/.test(addr);
    }
    if (net === "BITCOIN") {
      return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/.test(addr);
    }
    return addr.length >= 26;
  };

  const isAddressValid = validateAddressLocally(destinationAddress.trim(), network);

  const handleProceedToReview = () => {
    setErrorMsg(null);
    if (!destinationAddress.trim()) {
      setErrorMsg("Please enter a destination address.");
      return;
    }
    if (!isAddressValid) {
      setErrorMsg(`Invalid ${network} destination address format.`);
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("Please enter a valid amount greater than zero.");
      return;
    }
    if (feeQuote && numAmount < parseFloat(feeQuote.minWithdrawalAmount)) {
      setErrorMsg(`Amount is below the minimum withdrawal requirement of ${feeQuote.minWithdrawalAmount} ${asset}.`);
      return;
    }
    if (isOverBalance) {
      setErrorMsg(`Total debit (${totalDebit} ${asset}) exceeds available balance (${currentAvailable} ${asset}).`);
      return;
    }
    setStep("CONFIRM");
  };

  const handleExecuteWithdrawal = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg(null);

    const idempotencyKey = `wdl-${crypto.randomUUID()}`;

    try {
      const res = await executeWithdrawalAction({
        asset,
        network,
        destinationAddress: destinationAddress.trim(),
        amount,
        idempotencyKey,
      });

      if (res.success && res.data) {
        setReceipt(res.data);
        setStep("SUCCESS");
      } else {
        setErrorMsg(res.error || "Withdrawal failed. Please try again.");
      }
    } catch {
      setErrorMsg("An unexpected server error occurred during withdrawal processing.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setDestinationAddress("");
    setAmount("");
    setReceipt(null);
    setErrorMsg(null);
    setStep("INPUT");
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center space-x-2">
            <ArrowUpRight className="w-6 h-6 text-primary" />
            <span>External Crypto Withdrawal</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Transfer crypto assets securely from your ApexWallet to any external on-chain address.
          </p>
        </div>
        <Badge variant="outline" className="self-start sm:self-auto bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200">
          Two-Phase Settlement
        </Badge>
      </div>

      {step === "INPUT" && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Withdrawal Details</CardTitle>
            <CardDescription>
              Select your asset, destination network, and verify the external recipient address carefully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 1. Asset Selection */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Select Asset
                </label>
                <span className="text-xs text-muted-foreground">
                  Available: <strong className="text-foreground">{loadingBalances ? "..." : currentAvailable} {asset}</strong>
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {["USDT", "USDC", "BTC", "ETH", "SOL"].map((ticker) => (
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

            {/* 2. Network Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Destination Network
              </label>
              <div className="flex flex-wrap gap-2">
                {(networkOptions[asset] || ["POLYGON"]).map((net) => (
                  <button
                    key={net}
                    type="button"
                    onClick={() => setNetwork(net)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                      network === net
                        ? "border-primary bg-primary text-primary-foreground font-bold shadow-2xs"
                        : "border-border bg-card hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {net}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Destination Address */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Destination {network} Address
                </label>
                {destinationAddress && (
                  <span className={`text-[11px] font-medium flex items-center space-x-1 ${
                    isAddressValid ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                  }`}>
                    {isAddressValid ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Valid Format</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Invalid {network} Address</span>
                      </>
                    )}
                  </span>
                )}
              </div>
              <Input
                type="text"
                placeholder={`Enter valid ${network} recipient address`}
                value={destinationAddress}
                onChange={(e) => {
                  setDestinationAddress(e.target.value);
                  setErrorMsg(null);
                }}
                className={`font-mono text-xs ${
                  destinationAddress && !isAddressValid ? "border-destructive focus-visible:ring-destructive" : ""
                }`}
                id="destination-address-input"
              />
            </div>

            {/* Security Notice */}
            <InlineNotice variant="warning" title="Irreversible Blockchain Transaction">
              Crypto withdrawals sent to the wrong address or incompatible network cannot be recovered. Ensure the destination supports {asset} on {network}.
            </InlineNotice>

            {/* 4. Amount */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Withdrawal Amount
                </label>
                {feeQuote && (
                  <span className="text-[11px] text-muted-foreground">
                    Min: {feeQuote.minWithdrawalAmount} {asset}
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setErrorMsg(null);
                  }}
                  className={`pr-16 ${isOverBalance ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  id="withdrawal-amount-input"
                />
                <button
                  type="button"
                  onClick={() => {
                    const maxAllowed = Math.max(0, numAvailable - numFee);
                    setAmount(maxAllowed.toFixed(4));
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-primary hover:underline px-1.5 py-0.5 rounded"
                >
                  MAX
                </button>
              </div>

              {isOverBalance && (
                <p className="text-xs text-destructive mt-1">
                  Total debit ({totalDebit} {asset}) exceeds available balance ({currentAvailable} {asset})
                </p>
              )}
            </div>

            {/* Breakdown card */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Network Mining Fee:</span>
                <span className="font-mono text-foreground">
                  {loadingFee ? "Estimating..." : `${feeQuote?.networkFee || "0.00"} ${asset} (~$${feeQuote?.estimatedGasUsd || "0.00"})`}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Estimated Broadcast Time:</span>
                <span className="text-foreground">~2-5 minutes</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-foreground pt-1.5 border-t border-border">
                <span>Total Amount Deducted:</span>
                <span className="text-primary">
                  {amount && !isNaN(numAmount) ? totalDebit : "0.0000"} {asset}
                </span>
              </div>
            </div>

            {errorMsg && (
              <InlineNotice variant="destructive" title="Validation Failed">
                {errorMsg}
              </InlineNotice>
            )}

            <Button
              type="button"
              onClick={handleProceedToReview}
              disabled={!destinationAddress || !isAddressValid || !amount || isOverBalance || numAmount <= 0}
              className="w-full"
              size="lg"
              id="proceed-withdrawal-btn"
            >
              Review Withdrawal
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "CONFIRM" && (
        <Card className="shadow-sm border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <span>Confirm External Withdrawal</span>
            </CardTitle>
            <CardDescription>
              Funds will be locked immediately in your reservation account before on-chain broadcast.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-xl border border-border bg-card space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Asset & Network:</span>
                <span className="font-bold text-foreground">{asset} on {network}</span>
              </div>
              <div className="flex flex-col space-y-1">
                <span className="text-muted-foreground">Destination Address:</span>
                <span className="font-mono text-[11px] p-2 rounded-lg bg-muted/60 break-all border border-border">
                  {destinationAddress}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Withdrawal Amount:</span>
                <span className="font-bold text-foreground">{amount} {asset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network Gas Fee:</span>
                <span className="text-foreground">{feeQuote?.networkFee} {asset}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-bold text-sm text-foreground">
                <span>Total Debit:</span>
                <span className="text-primary">{totalDebit} {asset}</span>
              </div>
            </div>

            {errorMsg && (
              <InlineNotice variant="destructive" title="Submission Error">
                {errorMsg}
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
                onClick={handleExecuteWithdrawal}
                disabled={submitting}
                className="flex-1"
                id="submit-withdrawal-confirm-btn"
              >
                {submitting ? "Reserving & Broadcasting..." : "Confirm & Broadcast"}
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
              Withdrawal Broadcasted
            </CardTitle>
            <CardDescription>
              Your transaction has been submitted to the blockchain network via MPC custody.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-xl border border-border bg-card space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Operation Ref:</span>
                <span className="font-mono font-bold text-foreground">{receipt.referenceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-bold text-foreground">{receipt.netAmount} {receipt.asset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network Fee:</span>
                <span className="text-foreground">{receipt.feeAmount} {receipt.asset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network:</span>
                <span className="font-medium text-foreground">{receipt.network}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-none">
                  {receipt.status}
                </Badge>
              </div>
              {receipt.txHash && (
                <div className="flex flex-col space-y-1 border-t border-border pt-2">
                  <span className="text-muted-foreground">Transaction Hash:</span>
                  <span className="font-mono text-[10px] break-all text-primary">
                    {receipt.txHash}
                  </span>
                </div>
              )}
              {receipt.isSandbox && (
                <div className="p-2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] font-medium mt-1">
                  Transparent Sandbox Execution: Testnet simulation broadcasted without monetary debit.
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <Button type="button" onClick={handleReset} variant="outline" className="flex-1">
                New Withdrawal
              </Button>
              <Link href="/dashboard/history" className="flex-1">
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
