import Link from "next/link";
import { Heading, Text } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { EmptyState } from "@/components/feedback/empty-state";
import { getPortfolioAction } from "@/actions/wallet.actions";
import {
  Banknote,
  Download,
  Send,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

export default async function DashboardPage() {
  const result = await getPortfolioAction();
  const portfolio = result.data;

  const totalValueUsd = portfolio?.totalValueUsd ?? 0;
  const isStale = portfolio?.isStale ?? false;
  const priceTimestamp = portfolio?.priceTimestamp ? new Date(portfolio.priceTimestamp).toLocaleTimeString() : "Just now";
  const assets = portfolio?.assets ?? [];
  const transactions = portfolio?.recentTransactions ?? [];

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Heading as="h1" variant="title">
            Wallet Overview
          </Heading>
          <Text variant="muted">
            Server-authoritative ledger balances and institutional custody asset breakdown.
          </Text>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="px-3 py-1 font-mono text-xs flex items-center space-x-1.5 border-emerald-600/40 text-emerald-600">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Milestone 2 Ledger Active</span>
          </Badge>
        </div>
      </div>

      {/* NET WORTH HERO CARD */}
      <Card className="border-border bg-gradient-to-br from-card via-card to-muted/20 shadow-md">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Estimated Total Net Worth
                </span>
                {isStale ? (
                  <Badge variant="warning" className="text-[10px] py-0 px-1.5">
                    Stale Rates (&gt;5m)
                  </Badge>
                ) : (
                  <Badge variant="success" className="text-[10px] py-0 px-1.5">
                    Live Rates ({priceTimestamp})
                  </Badge>
                )}
              </div>

              <div className="flex items-baseline space-x-3">
                <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight text-foreground">
                  ${totalValueUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/add-money">
                <Button variant="primary" size="md" leftIcon={<Banknote className="w-4 h-4" />}>
                  Fund Wallet
                </Button>
              </Link>
              <Link href="/receive">
                <Button variant="secondary" size="md" leftIcon={<Download className="w-4 h-4" />}>
                  Receive Crypto
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QUICK ACTIONS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/add-money">
          <Card className="hover:border-primary/50 hover:bg-muted/30 transition-all text-center p-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
              <Banknote className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-semibold text-foreground">Fund Wallet</h4>
            <span className="text-[10px] text-muted-foreground">Crypto Deposit</span>
          </Card>
        </Link>

        <Link href="/receive">
          <Card className="hover:border-primary/50 hover:bg-muted/30 transition-all text-center p-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
              <Download className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-semibold text-foreground">Receive Crypto</h4>
            <span className="text-[10px] text-muted-foreground">Deposit Address & QR</span>
          </Card>
        </Link>

        <Link href="/transfer">
          <Card className="hover:border-primary/50 hover:bg-muted/30 transition-all text-center p-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
              <Send className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-semibold text-foreground">Transfer</h4>
            <span className="text-[10px] text-muted-foreground">Peer-to-Peer</span>
          </Card>
        </Link>

        <Link href="/swap">
          <Card className="hover:border-primary/50 hover:bg-muted/30 transition-all text-center p-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
              <RefreshCw className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-semibold text-foreground">Swap Assets</h4>
            <span className="text-[10px] text-muted-foreground">Instant RFQ</span>
          </Card>
        </Link>
      </div>

      {/* ASSET BALANCES BREAKDOWN */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Heading as="h3" variant="section">
            Supported Assets &amp; Balances
          </Heading>
          <span className="text-xs text-muted-foreground">6 Assets Supported</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((asset) => (
            <Card key={asset.ticker} className="border-border p-4 hover:border-primary/40 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-base font-bold text-foreground">{asset.ticker}</span>
                    <span className="text-xs text-muted-foreground">{asset.name}</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-xl font-bold font-mono tabular-nums text-foreground">
                      {parseFloat(asset.availableBalance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 8 })} {asset.ticker}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">
                    ≈ ${asset.valueUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                <Badge variant="outline" className="text-[10px] font-mono">
                  {asset.ticker === "NGN" ? "FIAT" : "CRYPTO"}
                </Badge>
              </div>

              {/* Reserved / Pending Balance Breakdown */}
              {(parseFloat(asset.reservedBalance) > 0 || parseFloat(asset.pendingBalance) > 0) && (
                <div className="mt-3 pt-2.5 border-t border-border/50 flex justify-between text-[11px] text-muted-foreground">
                  <span>Reserved: {asset.reservedBalance}</span>
                  <span>Pending: {asset.pendingBalance}</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* RECENT TRANSACTIONS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Heading as="h3" variant="section">
            Recent Ledger Activity
          </Heading>
          <Link href="/history" className="text-xs text-primary font-medium hover:underline">
            View full history →
          </Link>
        </div>

        <Card className="border-border">
          {transactions.length === 0 ? (
            <CardContent className="pt-8 pb-8 text-center">
              <EmptyState
                icon={Clock}
                title="No Transactions Yet"
                description="Your double-entry ledger history is empty. Fund your wallet or receive crypto to see posted entries here."
                action={{
                  label: "Fund Wallet Now",
                  href: "/add-money",
                }}
              />
            </CardContent>
          ) : (
            <div className="divide-y divide-border">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${tx.direction === "CREDIT" ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
                      {tx.direction === "CREDIT" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {tx.transactionType.replace("_", " ")}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        Ref: {tx.referenceId}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-sm font-bold font-mono ${tx.direction === "CREDIT" ? "text-emerald-600" : "text-destructive"}`}>
                      {tx.direction === "CREDIT" ? "+" : "-"}{tx.amount} {tx.assetTicker}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
