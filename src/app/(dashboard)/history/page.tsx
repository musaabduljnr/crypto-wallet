"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  History,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Search,
  Filter,
  ExternalLink,
  X,
  ChevronRight,
  RefreshCw,
  Coins,
  Send,
  CreditCard,
  Download,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import {
  getUserTransactionsAction,
  getTransactionDetailAction,
} from "@/actions/transaction.actions";
import { LedgerTransactionSummary } from "@/lib/services/ledger.service";

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<LedgerTransactionSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedAsset, setSelectedAsset] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Detail Modal
  const [selectedTxDetail, setSelectedTxDetail] = useState<Record<string, unknown> | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getUserTransactionsAction({
        type: selectedType,
        asset: selectedAsset,
        searchQuery: searchQuery.trim(),
        limit: 50,
      });

      if (res.success && res.data) {
        setTransactions(res.data.transactions);
        setTotalCount(res.data.totalCount);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedType, selectedAsset, searchQuery]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  const handleViewDetail = async (txId: string) => {
    try {
      setLoadingDetail(true);
      const res = await getTransactionDetailAction(txId);
      if (res.success && res.data) {
        setSelectedTxDetail(res.data);
      }
    } finally {
      setLoadingDetail(false);
    }
  };

  const getEventIcon = (type: string, direction: "CREDIT" | "DEBIT") => {
    if (type.includes("TRANSFER")) {
      return direction === "CREDIT" ? (
        <Download className="w-3.5 h-3.5 text-emerald-500" />
      ) : (
        <Send className="w-3.5 h-3.5 text-amber-500" />
      );
    }
    if (type.includes("WITHDRAWAL")) {
      return <ArrowUpRight className="w-3.5 h-3.5 text-purple-500" />;
    }
    if (type.includes("SWAP")) {
      return <RefreshCw className="w-3.5 h-3.5 text-cyan-500" />;
    }
    if (type.includes("FUNDING") || type.includes("DEPOSIT")) {
      return <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />;
    }
    return <FileText className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center space-x-2">
            <History className="w-6 h-6 text-primary" />
            <span>Transaction History</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Authoritative, append-only double-entry ledger audit trail.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs flex items-center space-x-1.5 w-fit border-emerald-600/40 text-emerald-600">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Double-Entry Verified</span>
        </Badge>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-card p-3.5 rounded-2xl border border-border shadow-2xs">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="sm:col-span-6 relative">
          <Input
            type="text"
            placeholder="Search by reference, hash, or ticker..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-16 text-xs h-9"
            id="history-search-input"
          />
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
          >
            Find
          </Button>
        </form>

        {/* Type Filter */}
        <div className="sm:col-span-3">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            id="history-type-filter"
          >
            <option value="ALL">All Event Types</option>
            <option value="FIAT_FUNDING">Fiat Funding</option>
            <option value="CRYPTO_DEPOSIT">Crypto Deposits</option>
            <option value="INTERNAL_TRANSFER">Internal Transfers</option>
            <option value="EXTERNAL_WITHDRAWAL">Withdrawals</option>
            <option value="SWAP_CONVERSION">Swaps</option>
          </select>
        </div>

        {/* Asset Filter */}
        <div className="sm:col-span-3">
          <select
            value={selectedAsset}
            onChange={(e) => setSelectedAsset(e.target.value)}
            className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            id="history-asset-filter"
          >
            <option value="ALL">All Currencies</option>
            <option value="USD">USD</option>
            <option value="USDT">USDT</option>
            <option value="USDC">USDC</option>
            <option value="BTC">BTC</option>
            <option value="ETH">ETH</option>
            <option value="SOL">SOL</option>
          </select>
        </div>
      </div>

      {/* Main Journal Table */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-primary">
              <FileText className="w-5 h-5" />
              <CardTitle className="text-base">Authoritative Transactions</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">
              Showing {transactions.length} of {totalCount} records
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              Loading verified ledger entries...
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={History}
                title="No transactions found"
                description="No transactions match your current search query or filter selection."
                action={{
                  label: "Clear Filters",
                  onClick: () => {
                    setSelectedType("ALL");
                    setSelectedAsset("ALL");
                    setSearchQuery("");
                  },
                }}
              />
            </div>
          ) : (
            <div className="divide-y divide-border overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      onClick={() => handleViewDetail(tx.id)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-medium flex items-center space-x-2.5">
                        <div
                          className={`p-1.5 rounded-lg border ${
                            tx.direction === "CREDIT"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                              : "bg-amber-500/10 border-amber-500/20 text-amber-600"
                          }`}
                        >
                          {getEventIcon(tx.transactionType, tx.direction)}
                        </div>
                        <span className="capitalize">
                          {tx.transactionType.toLowerCase().replace(/_/g, " ")}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-muted-foreground text-[11px]">
                        {tx.referenceId}
                      </td>

                      <td
                        className={`py-3 px-4 font-mono font-bold ${
                          tx.direction === "CREDIT"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-foreground"
                        }`}
                      >
                        {tx.direction === "CREDIT" ? "+" : "-"}
                        {tx.amount} {tx.assetTicker}
                      </td>

                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-2 font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200"
                        >
                          {tx.status}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-muted-foreground text-[11px]">
                        {new Date(tx.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        {new Date(tx.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <ChevronRight className="w-4 h-4 text-muted-foreground inline" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Detail Drawer / Modal */}
      {selectedTxDetail && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">Transaction Details</h3>
              </div>
              <button
                onClick={() => setSelectedTxDetail(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs divide-y divide-border/60">
              <div className="flex justify-between pt-1">
                <span className="text-muted-foreground">Reference ID:</span>
                <span className="font-mono font-bold text-foreground">
                  {String(selectedTxDetail.referenceId)}
                </span>
              </div>

              <div className="flex justify-between pt-2">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-semibold text-foreground">
                  {String(selectedTxDetail.transactionType).replace(/_/g, " ")}
                </span>
              </div>

              <div className="flex justify-between pt-2">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-bold font-mono text-foreground text-sm">
                  {String(selectedTxDetail.direction) === "CREDIT" ? "+" : "-"}
                  {String(selectedTxDetail.amount)} {String(selectedTxDetail.assetTicker)}
                </span>
              </div>

              <div className="flex justify-between pt-2">
                <span className="text-muted-foreground">Ledger Status:</span>
                <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-none">
                  {String(selectedTxDetail.status)}
                </Badge>
              </div>

              <div className="flex justify-between pt-2">
                <span className="text-muted-foreground">Posted At:</span>
                <span className="text-foreground">
                  {new Date(String(selectedTxDetail.postedAt)).toLocaleString()}
                </span>
              </div>

              {Boolean(selectedTxDetail.externalProviderRef) && (
                <div className="flex flex-col space-y-1 pt-2">
                  <span className="text-muted-foreground">Provider / Blockchain Hash:</span>
                  <span className="font-mono text-[11px] p-2 rounded-lg bg-muted/60 break-all border border-border">
                    {String(selectedTxDetail.externalProviderRef)}
                  </span>
                  {Boolean(selectedTxDetail.explorerUrl) && (
                    <a
                      href={String(selectedTxDetail.explorerUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-[11px] font-medium flex items-center space-x-1 mt-1"
                    >
                      <span>View on Verified Block Explorer</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>

            <Button
              type="button"
              onClick={() => setSelectedTxDetail(null)}
              className="w-full"
              variant="outline"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
