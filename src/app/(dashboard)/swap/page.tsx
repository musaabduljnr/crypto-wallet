"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  RefreshCw,
  ArrowDownUp,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Coins,
  Receipt,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InlineNotice } from "@/components/feedback/inline-notice";
import {
  requestSwapQuoteAction,
  executeSwapAction,
} from "@/actions/transaction.actions";
import { getPortfolioAction } from "@/actions/wallet.actions";
import { SwapQuoteResult, SwapExecutionReceipt } from "@/lib/services/swap.service";

export default function SwapPage() {
  const [sourceAsset, setSourceAsset] = useState("USDT");
  const [destinationAsset, setDestinationAsset] = useState("USDC");
  const [sourceAmount, setSourceAmount] = useState("");

  const [balances, setBalances] = useState<Record<string, string>>({});
  const [loadingBalances, setLoadingBalances] = useState(true);

  const [quote, setQuote] = useState<SwapQuoteResult | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [quoteExpired, setQuoteExpired] = useState(false);

  const [executing, setExecuting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<SwapExecutionReceipt | null>(null);

  const supportedAssets = ["USDT", "USDC", "NGN", "BTC", "ETH", "SOL"];

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

  // 30s Countdown timer for locked quote
  useEffect(() => {
    if (!quote || quoteExpired) return;

    const interval = setInterval(() => {
      const remainingMs = new Date(quote.expiresAt).getTime() - Date.now();
      const secs = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsRemaining(secs);

      if (secs <= 0) {
        setQuoteExpired(true);
        clearInterval(interval);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [quote, quoteExpired]);

  const currentAvailable = balances[sourceAsset] || "0.00";
  const numAmount = parseFloat(sourceAmount || "0");
  const numAvailable = parseFloat(currentAvailable);
  const isOverBalance = numAmount > numAvailable;

  const handleInvertAssets = () => {
    const prevSrc = sourceAsset;
    setSourceAsset(destinationAsset);
    setDestinationAsset(prevSrc);
    setQuote(null);
    setSourceAmount("");
    setErrorMsg(null);
  };

  const handleRequestQuote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("Please enter a valid swap amount greater than zero.");
      return;
    }
    if (isOverBalance) {
      setErrorMsg(`Amount exceeds available ${sourceAsset} balance.`);
      return;
    }

    setQuoting(true);
    setErrorMsg(null);
    setQuote(null);
    setQuoteExpired(false);

    try {
      const res = await requestSwapQuoteAction({
        sourceAsset,
        destinationAsset,
        sourceAmount,
      });

      if (res.success && res.data) {
        setQuote(res.data);
        setSecondsRemaining(30);
        setQuoteExpired(false);
      } else {
        setErrorMsg(res.error || "Failed to obtain guaranteed quote.");
      }
    } catch {
      setErrorMsg("Network error communicating with market price feeds.");
    } finally {
      setQuoting(false);
    }
  };

  const handleExecuteSwap = async () => {
    if (!quote || quoteExpired || executing) return;
    setExecuting(true);
    setErrorMsg(null);

    const idempotencyKey = `swp-${crypto.randomUUID()}`;

    try {
      const res = await executeSwapAction({
        quoteId: quote.quoteId,
        idempotencyKey,
      });

      if (res.success && res.data) {
        setReceipt(res.data);
        setQuote(null);
      } else {
        setErrorMsg(res.error || "Swap execution failed.");
      }
    } catch {
      setErrorMsg("Unexpected server error occurred during swap settlement.");
    } finally {
      setExecuting(false);
    }
  };

  const handleReset = () => {
    setQuote(null);
    setReceipt(null);
    setSourceAmount("");
    setErrorMsg(null);
    setQuoteExpired(false);
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center space-x-2">
            <RefreshCw className="w-6 h-6 text-primary" />
            <span>Crypto Swap</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Instant multi-asset conversions with guaranteed 30-second rate locks.
          </p>
        </div>
        <Badge variant="outline" className="self-start sm:self-auto bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400 border-cyan-200">
          30s RFQ Rate Lock
        </Badge>
      </div>

      {!receipt ? (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Request For Quote (RFQ)</CardTitle>
            <CardDescription>
              Lock an executable institutional exchange rate with zero slippage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* 1. Source Asset Card */}
            <div className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  You Pay
                </span>
                <span className="text-xs text-muted-foreground">
                  Available: <strong className="text-foreground">{loadingBalances ? "..." : currentAvailable} {sourceAsset}</strong>
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <Input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={sourceAmount}
                  onChange={(e) => {
                    setSourceAmount(e.target.value);
                    setQuote(null);
                    setErrorMsg(null);
                  }}
                  className={`text-lg font-bold ${
                    isOverBalance ? "border-destructive focus-visible:ring-destructive" : ""
                  }`}
                  id="swap-source-amount-input"
                />

                <select
                  value={sourceAsset}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next === destinationAsset) {
                      setDestinationAsset(sourceAsset);
                    }
                    setSourceAsset(next);
                    setQuote(null);
                  }}
                  className="h-10 rounded-xl border border-border bg-card px-3 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shrink-0"
                >
                  {supportedAssets.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between items-center text-xs">
                {isOverBalance && (
                  <span className="text-destructive">
                    Exceeds balance of {currentAvailable} {sourceAsset}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSourceAmount(currentAvailable);
                    setQuote(null);
                  }}
                  className="ml-auto text-[11px] font-bold text-primary hover:underline"
                >
                  Use Max
                </button>
              </div>
            </div>

            {/* Invert Button */}
            <div className="flex justify-center -my-2 relative z-10">
              <button
                type="button"
                onClick={handleInvertAssets}
                className="p-2.5 rounded-full border border-border bg-card shadow-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-all hover:scale-105"
                title="Swap Assets"
              >
                <ArrowDownUp className="w-4 h-4 text-primary" />
              </button>
            </div>

            {/* 2. Destination Asset Card */}
            <div className="p-4 rounded-2xl border border-border bg-muted/20 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  You Receive (Estimated)
                </span>
                <span className="text-xs text-muted-foreground">
                  Balance: <strong className="text-foreground">{balances[destinationAsset] || "0.00"} {destinationAsset}</strong>
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <Input
                  type="text"
                  readOnly
                  placeholder="0.00"
                  value={quote ? quote.netReceivedAmount : ""}
                  className="text-lg font-bold bg-muted/40 text-foreground cursor-not-allowed"
                />

                <select
                  value={destinationAsset}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next === sourceAsset) {
                      setSourceAsset(destinationAsset);
                    }
                    setDestinationAsset(next);
                    setQuote(null);
                  }}
                  className="h-10 rounded-xl border border-border bg-card px-3 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shrink-0"
                >
                  {supportedAssets.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. Guaranteed Rate Card / Countdown */}
            {quote && (
              <div className={`p-4 rounded-xl border transition-all ${
                quoteExpired
                  ? "border-destructive/30 bg-destructive/5 text-destructive"
                  : "border-primary/30 bg-primary/5 text-foreground"
              }`}>
                <div className="flex items-center justify-between text-xs mb-2">
                  <div className="flex items-center space-x-1.5 font-semibold">
                    <Clock className={`w-4 h-4 ${quoteExpired ? "text-destructive" : "text-primary"}`} />
                    <span>
                      {quoteExpired ? "Quote Expired" : `Guaranteed for ${secondsRemaining}s`}
                    </span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Fee: {quote.platformFeeAmount} {destinationAsset} (0.5%)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mb-2">
                  <div
                    className={`h-full transition-all duration-300 ${
                      quoteExpired
                        ? "bg-destructive w-0"
                        : secondsRemaining <= 5
                        ? "bg-amber-500"
                        : "bg-primary"
                    }`}
                    style={{ width: `${Math.max(0, (secondsRemaining / 30) * 100)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Locked Exchange Rate:</span>
                  <span className="font-mono font-bold">
                    1 {sourceAsset} = {quote.exchangeRate} {destinationAsset}
                  </span>
                </div>
              </div>
            )}

            {errorMsg && (
              <InlineNotice variant="destructive" title="Swap Error">
                {errorMsg}
              </InlineNotice>
            )}

            {/* Actions */}
            {!quote || quoteExpired ? (
              <Button
                type="button"
                onClick={handleRequestQuote}
                disabled={quoting || !sourceAmount || isOverBalance || numAmount <= 0}
                className="w-full"
                size="lg"
                id="get-swap-quote-btn"
              >
                {quoting ? "Fetching Real-time Rates..." : quoteExpired ? "Refresh Expired Quote" : "Get Guaranteed Quote"}
              </Button>
            ) : (
              <div className="space-y-2">
                <Button
                  type="button"
                  onClick={handleExecuteSwap}
                  disabled={executing || quoteExpired}
                  className="w-full bg-primary"
                  size="lg"
                  id="confirm-swap-execute-btn"
                >
                  {executing ? "Settling Double-Entry Ledger..." : `Confirm Swap (${secondsRemaining}s left)`}
                </Button>
                <button
                  type="button"
                  onClick={handleRequestQuote}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1 font-medium"
                >
                  Refresh Rate
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Success Receipt Card */
        <Card className="shadow-sm border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10">
          <CardHeader className="text-center pb-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold text-emerald-900 dark:text-emerald-200">
              Swap Executed Successfully
            </CardTitle>
            <CardDescription>
              Funds have been converted and credited atomically via system clearing accounts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-xl border border-border bg-card space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transaction Ref:</span>
                <span className="font-mono font-bold text-foreground">{receipt.referenceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">You Sold:</span>
                <span className="font-bold text-foreground">{receipt.sourceAmount} {receipt.sourceAsset}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">You Received:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  +{receipt.destinationAmount} {receipt.destinationAsset}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Exchange Rate:</span>
                <span className="font-mono text-foreground">
                  1 {receipt.sourceAsset} = {receipt.exchangeRate} {receipt.destinationAsset}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform Fee:</span>
                <span className="text-foreground">{receipt.feeAmount} {receipt.destinationAsset}</span>
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
                Make Another Swap
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
