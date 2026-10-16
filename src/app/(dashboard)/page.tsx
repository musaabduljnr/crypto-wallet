import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Heading, Text } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { EmptyState } from "@/components/feedback/empty-state";
import {
  Banknote,
  Download,
  Send,
  RefreshCw,
  Clock,
  Layers,
  ArrowRight,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-8 max-w-5xl">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Heading as="h1" variant="title">
            Wallet Overview
          </Heading>
          <Text variant="muted">
            Manage your fiat and digital asset balances backed by institutional custody.
          </Text>
        </div>

        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="px-3 py-1 font-mono text-xs">
            Milestone 1 Active
          </Badge>
        </div>
      </div>

      {/* Milestone 2 Ledger Connectivity Notice */}
      <InlineNotice variant="info" title="Foundation & Product Shell Active">
        Your user session and profile have been securely authenticated with Supabase. In accordance with the project roadmap, live double-entry ledger postings and partner balance synchronization will be connected in Milestone 2.
      </InlineNotice>

      {/* QUICK ACTIONS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/dashboard/add-money">
          <Card className="hover:border-primary/50 hover:bg-muted/30 transition-all text-center p-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
              <Banknote className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-semibold text-foreground">Add Money</h4>
            <span className="text-[10px] text-muted-foreground">NGN Bank Transfer</span>
          </Card>
        </Link>

        <Link href="/dashboard/receive">
          <Card className="hover:border-primary/50 hover:bg-muted/30 transition-all text-center p-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
              <Download className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-semibold text-foreground">Receive Crypto</h4>
            <span className="text-[10px] text-muted-foreground">EVM Networks</span>
          </Card>
        </Link>

        <Link href="/dashboard/transfer">
          <Card className="hover:border-primary/50 hover:bg-muted/30 transition-all text-center p-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
              <Send className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-semibold text-foreground">Transfer</h4>
            <span className="text-[10px] text-muted-foreground">Internal or External</span>
          </Card>
        </Link>

        <Link href="/dashboard/swap">
          <Card className="hover:border-primary/50 hover:bg-muted/30 transition-all text-center p-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
              <RefreshCw className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-semibold text-foreground">Swap Assets</h4>
            <span className="text-[10px] text-muted-foreground">30s Guaranteed RFQ</span>
          </Card>
        </Link>
      </div>

      {/* PORTFOLIO ASSETS CARD */}
      <Card>
        <CardHeader>
          <CardTitle>Supported Wallet Accounts</CardTitle>
          <CardDescription>
            Accounts provisioned for this wallet. Balances will reflect live ledger postings upon Milestone 2 activation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="divide-y divide-border rounded-lg border border-border">
            {/* Row 1: NGN */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold flex items-center justify-center text-sm">
                  ₦
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Nigerian Naira (NGN)</h4>
                  <p className="text-xs text-muted-foreground">Base Currency Account</p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-sm font-semibold text-foreground">₦0.00</span>
                <p className="text-[10px] text-muted-foreground">Awaiting Milestone 2 Funding</p>
              </div>
            </div>

            {/* Row 2: USDT */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-400 font-bold flex items-center justify-center text-sm">
                  ₮
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Tether USD (USDT)</h4>
                  <p className="text-xs text-muted-foreground">EVM Stablecoin</p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-sm font-semibold text-foreground">0.00 USDT</span>
                <p className="text-[10px] text-muted-foreground">EVM Inbound</p>
              </div>
            </div>

            {/* Row 3: ETH */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 font-bold flex items-center justify-center text-sm">
                  Ξ
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Ethereum (ETH)</h4>
                  <p className="text-xs text-muted-foreground">Gas & Utility Token</p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-sm font-semibold text-foreground">0.000000 ETH</span>
                <p className="text-[10px] text-muted-foreground">Low Gas EVM</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RECENT ACTIVITY SECTION */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Ledger transaction statement feed.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Clock}
            title="No transactions yet"
            description="Your immutable transaction history will appear here once you initiate your first bank deposit or crypto transfer in Milestone 2."
          />
        </CardContent>
      </Card>
    </div>
  );
}
