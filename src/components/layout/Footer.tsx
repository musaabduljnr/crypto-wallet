import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/60 text-muted-foreground text-sm">
      <Container size="xl" className="py-12 md:py-16 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center space-x-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Shield className="h-4 w-4" />
              </div>
              <span className="font-bold text-base text-foreground">ApexWallet</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Managed, institutional-grade cryptocurrency infrastructure providing a compliant bridge between the Nigerian Naira (NGN) and EVM digital assets.
            </p>
          </div>

          {/* Product Capabilities */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Wallet Capabilities
            </h4>
            <ul className="space-y-2 text-xs">
              <li>Add Money (NGN Bank Transfer)</li>
              <li>Receive EVM Digital Assets</li>
              <li>Instant Off-Chain Transfers</li>
              <li>External Wallet Withdrawals</li>
              <li>Guaranteed RFQ Swaps</li>
            </ul>
          </div>

          {/* Security & Architecture */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Architecture
            </h4>
            <ul className="space-y-2 text-xs">
              <li>Immutable Double-Entry Ledger</li>
              <li>Managed Institutional Custody</li>
              <li>Row-Level Security (RLS)</li>
              <li>Row-Locked Concurrency Protection</li>
              <li>Zero Private Key Exposure</li>
            </ul>
          </div>

          {/* Regulatory & Risk Disclaimer */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Regulatory Disclosures
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Digital assets are subject to market volatility. Wallets provided are custodial and do not constitute deposit insurance under the NDIC. Services subject to eligibility and compliance with Nigerian SEC & CBN regulations.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>© {new Date().getFullYear()} ApexWallet Inc. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/showcase" className="hover:text-foreground transition-colors text-primary font-medium">
              Design System Showcase
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
