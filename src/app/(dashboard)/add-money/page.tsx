"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { createFundingSessionAction } from "@/actions/wallet.actions";
import {
  Banknote,
  Building2,
  Copy,
  Check,
  Clock,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Globe,
} from "lucide-react";

export default function AddMoneyPage() {
  const [amount, setAmount] = React.useState("500");
  const [copiedField, setCopiedField] = React.useState<string | null>(null);
  const [state, formAction, isPending] = React.useActionState(createFundingSessionAction, null);

  // Preset amounts in the fiat provider's configured currency
  const presets = ["100", "250", "500", "1000", "5000"];

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const order = state?.data;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Fund Your Wallet</h1>
          <p className="text-sm text-muted-foreground">
            Deposit funds using your region&apos;s configured fiat payment provider.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs w-fit">
          Fiat On-Ramp
        </Badge>
      </div>

      {/* Regional availability notice */}
      <InlineNotice variant="warning" title="Regional Availability">
        Fiat funding is currently available in sandbox mode via the configured regional payment provider.
        Provider availability and supported currencies depend on your account&apos;s region. Crypto deposits
        via the Receive screen are available globally.
      </InlineNotice>

      {state?.error && (
        <InlineNotice variant="destructive" title="Deposit Error">
          {state.error}
        </InlineNotice>
      )}

      {!order ? (
        <Card className="border-border shadow-sm">
          <CardHeader>
            <div className="flex items-center space-x-2 text-primary mb-1">
              <Banknote className="w-5 h-5" />
              <CardTitle>Enter Deposit Amount</CardTitle>
            </div>
            <CardDescription>
              Specify the amount you wish to deposit using the configured fiat provider for your region.
              Minimum and maximum limits are enforced by the active provider.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <form id="funding-form" action={formAction} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Deposit Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                    required
                    placeholder="500"
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background font-mono text-lg font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Preset Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {presets.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(p)}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all ${
                      amount === p
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {parseInt(p).toLocaleString("en-US")}
                  </button>
                ))}
              </div>

              {/* Info note */}
              <div className="flex items-center space-x-2 text-xs text-muted-foreground p-3 rounded-lg bg-muted/40 border border-border">
                <Globe className="w-4 h-4 shrink-0" />
                <span>
                  Amount is denominated in the currency supported by your active fiat provider.
                  Fee breakdown is shown on the confirmation screen.
                </span>
              </div>
            </form>
          </CardContent>

          <CardFooter className="border-t border-border pt-4">
            <Button
              form="funding-form"
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isPending}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {isPending ? "Generating Payment Details..." : "Generate Payment Details"}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        /* FUNDING DETAILS VIEW */
        <div className="space-y-4">
          {order.isSandbox && (
            <InlineNotice variant="warning" title="Sandbox Mode Active">
              This funding session is operating in Sandbox / Test mode. Use your test environment or a simulated webhook to verify payment settlement. No real funds are transferred.
            </InlineNotice>
          )}

          <Card className="border-primary/50 shadow-md">
            <CardHeader className="bg-primary/5 border-b border-border pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-primary">
                  <Building2 className="w-5 h-5" />
                  <CardTitle className="text-lg">Payment Details</CardTitle>
                </div>
                <Badge variant="success" className="text-xs">
                  Active / Awaiting Transfer
                </Badge>
              </div>
              <CardDescription>
                Complete your transfer using the payment details below.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              {order.virtualAccount ? (
                <div className="space-y-3">
                  {/* Account Number with Copy */}
                  <div className="p-4 rounded-xl bg-muted/50 border border-border flex items-center justify-between">
                    <div>
                      <span className="text-xs text-muted-foreground block font-medium">Account Number</span>
                      <span className="text-2xl font-mono font-extrabold tracking-wider text-foreground">
                        {order.virtualAccount.accountNumber}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(order.virtualAccount!.accountNumber, "acct")}
                      leftIcon={copiedField === "acct" ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    >
                      {copiedField === "acct" ? "Copied" : "Copy"}
                    </Button>
                  </div>

                  {/* Bank / Institution Name */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-lg bg-card border border-border">
                      <span className="text-xs text-muted-foreground block">Institution</span>
                      <span className="font-semibold text-foreground">{order.virtualAccount.bankName}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-card border border-border">
                      <span className="text-xs text-muted-foreground block">Account Name</span>
                      <span className="font-semibold text-foreground">{order.virtualAccount.accountName}</span>
                    </div>
                  </div>

                  {/* Provider Reference */}
                  <div className="p-3 rounded-lg bg-card border border-border flex items-center justify-between text-xs">
                    <div>
                      <span className="text-muted-foreground block">Payment Reference</span>
                      <span className="font-mono font-medium text-foreground">{order.providerReference}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(order.providerReference, "ref")}
                    >
                      {copiedField === "ref" ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>
              ) : order.checkoutUrl ? (
                <div className="text-center py-4">
                  <a href={order.checkoutUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="primary" size="lg">
                      Open Payment Checkout →
                    </Button>
                  </a>
                </div>
              ) : null}

              <div className="flex items-center space-x-2 text-xs text-muted-foreground pt-2">
                <Clock className="w-4 h-4 text-muted-foreground/60" />
                <span>Payment session expires in 60 minutes. Funds credit automatically upon settlement confirmation.</span>
              </div>
            </CardContent>

            <CardFooter className="border-t border-border pt-4 flex justify-between">
              <Button
                variant="outline"
                size="md"
                onClick={() => window.location.reload()}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Create New Deposit
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => window.location.href = "/dashboard"}
              >
                Return to Dashboard
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
