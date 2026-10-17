"use client";

import * as React from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Heading, Text } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AmountInput } from "@/components/ui/amount-input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BalanceDisplay } from "@/components/wallet/balance-display";
import { TransactionStatusBadge, type FinancialStatus } from "@/components/wallet/transaction-status-badge";
import { CryptoAddressCard } from "@/components/wallet/crypto-address-card";
import { FeeSummaryRow } from "@/components/wallet/fee-summary-row";
import { LoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { InlineNotice } from "@/components/feedback/inline-notice";
import {
  ArrowLeft,
  Send,
  Download,
  Search,
  Lock,
  Wallet,
  ShieldAlert,
  Moon,
  Sun,
  Inbox,
  CheckCircle2,
} from "lucide-react";

export default function DesignSystemShowcasePage() {
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [isMasked, setIsMasked] = React.useState(false);
  const [amountValue, setAmountValue] = React.useState("50000.00");
  const [formEmail, setFormEmail] = React.useState("");
  const [formError, setFormError] = React.useState("");

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  };

  const handleValidateForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.includes("@") || !formEmail.includes(".")) {
      setFormError("Please enter a valid email address (e.g., user@example.ng)");
    } else {
      setFormError("");
    }
  };

  const statuses: FinancialStatus[] = [
    "DRAFT",
    "PENDING",
    "PROCESSING",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
    "EXPIRED",
    "RECONCILIATION_REQUIRED",
  ];

  return (
    <div className="min-h-screen bg-background text-foreground py-12 transition-colors duration-200">
      <Container size="xl" className="space-y-12">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1">
            <Link
              href="/"
              className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground mb-1 group"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1 group-hover:-translate-x-0.5 transition-transform" />
              Back to Overview
            </Link>
            <div className="flex items-center space-x-3">
              <Heading as="h1" variant="title">
                Design System & Component Showcase
              </Heading>
              <Badge variant="outline" className="text-xs uppercase tracking-wider font-mono">
                Dev Only
              </Badge>
            </div>
            <Text variant="muted" className="text-sm">
              Live visual verification of design tokens, typography, accessibility, and UI primitives across viewports.
            </Text>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleDarkMode}
              leftIcon={isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-700" />}
            >
              {isDarkMode ? "Light Mode" : "Dark Mode"}
            </Button>
          </div>
        </div>

        {/* Demo Safeguard Notice */}
        <InlineNotice variant="info" title="Isolated Visual Test Environment">
          All data rendered on this page consists of purely static fixtures. No network requests to payment gateways or blockchain nodes are executed.
        </InlineNotice>

        {/* SECTION 1: Color Tokens */}
        <section className="space-y-4">
          <div className="border-b border-border pb-2">
            <Heading as="h2" variant="subtitle">
              1. Semantic Color Tokens
            </Heading>
            <Text variant="muted">System-wide HSL color variables supporting light & dark themes.</Text>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="p-3 rounded-lg border border-border bg-card space-y-2">
              <div className="h-10 w-full rounded bg-primary" />
              <p className="text-xs font-semibold">Primary</p>
              <p className="text-[10px] text-muted-foreground font-mono">158 64% 20%</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card space-y-2">
              <div className="h-10 w-full rounded bg-secondary" />
              <p className="text-xs font-semibold">Secondary</p>
              <p className="text-[10px] text-muted-foreground font-mono">210 40% 96%</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card space-y-2">
              <div className="h-10 w-full rounded bg-success" />
              <p className="text-xs font-semibold">Success</p>
              <p className="text-[10px] text-muted-foreground font-mono">142 71% 45%</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card space-y-2">
              <div className="h-10 w-full rounded bg-warning" />
              <p className="text-xs font-semibold">Warning</p>
              <p className="text-[10px] text-muted-foreground font-mono">38 92% 50%</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card space-y-2">
              <div className="h-10 w-full rounded bg-destructive" />
              <p className="text-xs font-semibold">Destructive</p>
              <p className="text-[10px] text-muted-foreground font-mono">0 84% 60%</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-card space-y-2">
              <div className="h-10 w-full rounded bg-muted" />
              <p className="text-xs font-semibold">Muted</p>
              <p className="text-[10px] text-muted-foreground font-mono">210 40% 96%</p>
            </div>
          </div>
        </section>

        {/* SECTION 2: Typography Scale */}
        <section className="space-y-4">
          <div className="border-b border-border pb-2">
            <Heading as="h2" variant="subtitle">
              2. Typographic Scale & Tabular Numerals
            </Heading>
            <Text variant="muted">High-legibility financial typography with tabular digits.</Text>
          </div>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <Heading as="h1" variant="hero">
                  Hero Display Title ($1,425,850.00)
                </Heading>
                <Text variant="caption">`text-3xl md:text-5xl font-bold tracking-tight`</Text>
              </div>
              <div>
                <Heading as="h2" variant="title">
                  Section Title (Page Level)
                </Heading>
                <Text variant="caption">`text-2xl md:text-3xl font-semibold`</Text>
              </div>
              <div>
                <Heading as="h3" variant="subtitle">
                  Card Subtitle (Component Level)
                </Heading>
                <Text variant="caption">`text-xl font-semibold`</Text>
              </div>
              <div>
                <Text variant="body">
                  Standard Body Text: US Dollar deposits are settled off-chain with immutable double-entry journal postings.
                </Text>
                <Text variant="caption">`text-sm md:text-base leading-relaxed`</Text>
              </div>
              <div>
                <Text variant="mono">
                  Tabular Numerals: $1,234,567.89 | 100.000000 USDT | 0.450000 ETH
                </Text>
                <Text variant="caption">`font-mono tabular-nums` (Zero jitter across balance mutations)</Text>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* SECTION 3: Controls & Buttons */}
        <section className="space-y-4">
          <div className="border-b border-border pb-2">
            <Heading as="h2" variant="subtitle">
              3. Interactive Controls & Buttons
            </Heading>
            <Text variant="muted">Accessible buttons with loading states, icon support, and sizes.</Text>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <Button variant="primary" leftIcon={<Send className="w-4 h-4" />}>
              Primary Send
            </Button>
            <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />}>
              Secondary Receive
            </Button>
            <Button variant="outline">Outline Action</Button>
            <Button variant="destructive">Destructive Action</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="primary" isLoading>
              Processing
            </Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
            <Button variant="primary" size="sm">
              Small
            </Button>
            <Button variant="primary" size="lg">
              Large
            </Button>
          </div>
        </section>

        {/* SECTION 4: Financial Display & Balance Cards */}
        <section className="space-y-4">
          <div className="border-b border-border pb-2">
            <Heading as="h2" variant="subtitle">
              4. Financial Display & Asset Cards
            </Heading>
            <Text variant="muted">Maskable balance displays, EVM address containers, and fee summaries.</Text>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Balance Display</CardTitle>
                <CardDescription>Hero net worth presentation with privacy masking.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <BalanceDisplay
                  amount="1425850.00"
                  currency="NGN"
                  secondaryAmount="950.56"
                  secondaryCurrency="USD"
                  isMasked={isMasked}
                  showToggle={true}
                  onToggleMask={() => setIsMasked(!isMasked)}
                  size="hero"
                  label="Total Estimated Valuation"
                />

                <div className="pt-4 border-t border-border space-y-2">
                  <FeeSummaryRow label="Network Base Fee" value="$0.00" subValue="Instant Free Off-chain" />
                  <FeeSummaryRow label="Estimated Gas Fee" value="0.00045 ETH" subValue="~$1.20 USD" />
                  <FeeSummaryRow label="Total Amount Deducted" value="$50.00" isTotal={true} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Deposit Address & QR Module</CardTitle>
                <CardDescription>Dedicated EVM address card with one-click clipboard copy.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <CryptoAddressCard
                  address="0x71C84949a37651C8407425fAc9a3651C840742f1"
                  network="Polygon PoS"
                  asset="USDT"
                />

                <InlineNotice variant="warning" title="Network Compatibility Warning">
                  Send only USDT via the Polygon PoS network to this address. Sending funds via any other chain (e.g. TRC-20, Solana) will cause irreversible loss.
                </InlineNotice>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* SECTION 5: Form Validation & Amount Input */}
        <section className="space-y-4">
          <div className="border-b border-border pb-2">
            <Heading as="h2" variant="subtitle">
              5. Inputs & Form Validation
            </Heading>
            <Text variant="muted">Accessible text and specialized numeric currency inputs.</Text>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Numeric Currency Amount Input</CardTitle>
                <CardDescription>Enforces numeric entry, handles quick MAX clicks.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <AmountInput
                  value={amountValue}
                  onChange={setAmountValue}
                  assetTicker="NGN"
                  label="Funding Amount"
                  maxBalance="250,000.00"
                  onMaxClick={() => setAmountValue("250000.00")}
                />
                <AmountInput
                  value="125.50"
                  onChange={() => {}}
                  assetTicker="USDT"
                  label="Crypto Amount (Disabled)"
                  disabled
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Form Validation State</CardTitle>
                <CardDescription>Accessible inline errors linked via aria-describedby.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleValidateForm} className="space-y-4">
                  <Input
                    label="Account Email Address"
                    type="text"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="chidi@example.ng"
                    error={formError}
                    leftAddon={<Search className="w-4 h-4" />}
                  />
                  <Button type="submit" variant="primary" size="md">
                    Test Validation
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* SECTION 6: Financial Status Badges */}
        <section className="space-y-4">
          <div className="border-b border-border pb-2">
            <Heading as="h2" variant="subtitle">
              6. Deterministic Financial Status Badges
            </Heading>
            <Text variant="muted">Unambiguous visual states for all transactions in the ledger.</Text>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-3">
                {statuses.map((status) => (
                  <TransactionStatusBadge key={status} status={status} />
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* SECTION 7: Feedback & State Fallbacks */}
        <section className="space-y-4">
          <div className="border-b border-border pb-2">
            <Heading as="h2" variant="subtitle">
              7. Feedback, Skeletons & Empty States
            </Heading>
            <Text variant="muted">Predictable placeholders preventing layout shifts (CLS).</Text>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Loading Skeletons</CardTitle>
                <CardDescription>Pulsing placeholders matching content dimensions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <LoadingSkeleton variant="balance" />
                <LoadingSkeleton variant="text" />
                <LoadingSkeleton variant="text" className="w-3/4" />
                <LoadingSkeleton variant="table-row" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Empty State Card</CardTitle>
                <CardDescription>Non-intimidating empty state for new accounts.</CardDescription>
              </CardHeader>
              <CardContent>
                <EmptyState
                  icon={Inbox}
                  title="No transactions yet"
                  description="When you fund your wallet or receive digital assets, your full ledger history will display here."
                  action={{
                    label: "Add Money via Bank Transfer",
                    onClick: () => {},
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </section>
      </Container>
    </div>
  );
}
