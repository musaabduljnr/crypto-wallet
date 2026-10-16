import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/container";
import { Heading, Text } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ShieldCheck,
  Send,
  Download,
  RefreshCw,
  Lock,
  Layers,
  Banknote,
  CheckCircle2,
  Globe,
  Zap,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden py-20 md:py-32 border-b border-border bg-gradient-to-b from-background via-muted/20 to-background">
          <Container size="xl" className="space-y-8 text-center max-w-4xl">
            <div className="inline-flex items-center space-x-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
              <ShieldCheck className="w-4 h-4" />
              <span>Institutional Managed Custody Architecture</span>
            </div>

            <Heading as="h1" variant="hero" className="leading-[1.1] tracking-tight">
              One Wallet for All Your <br className="hidden sm:inline" />
              <span className="text-primary">Digital Assets</span>
            </Heading>

            <Text variant="body" className="max-w-2xl mx-auto text-base sm:text-lg text-muted-foreground leading-relaxed">
              Hold, send, swap, and manage crypto without seed phrase anxiety or unpredictable gas spikes. Backed by bank-grade double-entry ledger integrity and institutional custody infrastructure.
            </Text>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link href="/auth/register" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="w-full sm:w-auto px-8" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Create Free Account
                </Button>
              </Link>
              <Link href="#capabilities" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Explore Capabilities
                </Button>
              </Link>
            </div>

            {/* Supported Asset Strip */}
            <div className="pt-10 max-w-2xl mx-auto">
              <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl border border-border bg-card/80 shadow-sm backdrop-blur-sm">
                <div className="text-left px-3 py-1.5 border-r border-border">
                  <span className="text-xs font-medium text-muted-foreground">USDT / USDC</span>
                  <p className="font-mono font-bold text-sm text-foreground">~$1.00 USD</p>
                  <span className="text-[10px] text-emerald-600 font-medium">Stablecoins</span>
                </div>
                <div className="text-left px-3 py-1.5 border-r border-border">
                  <span className="text-xs font-medium text-muted-foreground">ETH (Utility)</span>
                  <p className="font-mono font-bold text-sm text-foreground">EVM Core</p>
                  <span className="text-[10px] text-emerald-600 font-medium">Low Gas Networks</span>
                </div>
                <div className="text-left px-3 py-1.5">
                  <span className="text-xs font-medium text-muted-foreground">BTC / SOL</span>
                  <p className="font-mono font-bold text-sm text-foreground">Native L1</p>
                  <span className="text-[10px] text-emerald-600 font-medium">On-Chain</span>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* CAPABILITIES SECTION */}
        <section id="capabilities" className="py-20 border-b border-border bg-card/30">
          <Container size="xl" className="space-y-12">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <Badge variant="outline" className="text-xs uppercase tracking-wider font-mono">
                Product Experience
              </Badge>
              <Heading as="h2" variant="title">
                Engineered for Complete Financial Control
              </Heading>
              <Text variant="muted">
                Every wallet operation is designed for instant clarity, zero hidden fees, and foolproof safety.
              </Text>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1: Fund Wallet */}
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                    <Banknote className="h-5 w-5" />
                  </div>
                  <CardTitle>Fund Your Wallet</CardTitle>
                  <CardDescription>
                    Deposit supported assets using available payment methods for your region. Fiat on-ramp availability depends on your selected region and configured provider.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Card 2: Receive Crypto */}
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                    <Download className="h-5 w-5" />
                  </div>
                  <CardTitle>Receive On-Chain</CardTitle>
                  <CardDescription>
                    Dedicated custodial deposit addresses for USDT, USDC, ETH, BTC, and SOL with real-time confirmation tracking and block depth verification.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Card 3: Internal Transfers */}
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                    <Zap className="h-5 w-5" />
                  </div>
                  <CardTitle>Zero-Fee P2P Transfers</CardTitle>
                  <CardDescription>
                    Send supported assets instantly to any registered user by email or tag. Settles off-chain with zero gas fees and atomic ledger execution.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Card 4: External Withdrawals */}
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                    <Send className="h-5 w-5" />
                  </div>
                  <CardTitle>External Withdrawals</CardTitle>
                  <CardDescription>
                    Withdraw digital assets to any compatible external address with checksum validation, explicit fee breakdown, and transaction hash tracking.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Card 5: Swaps */}
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <CardTitle>Guaranteed Swaps</CardTitle>
                  <CardDescription>
                    Request-For-Quote conversion engine with firm 30-second rate locks. You receive exactly what is quoted—zero unannounced slippage.
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Card 6: Portfolio */}
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                    <Globe className="h-5 w-5" />
                  </div>
                  <CardTitle>Portfolio &amp; Security</CardTitle>
                  <CardDescription>
                    Unified portfolio net worth in USD, privacy balance masking, active session revocation, and downloadable transaction history.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </Container>
        </section>

        {/* SECURITY & CUSTODY ARCHITECTURE */}
        <section id="security" className="py-20 border-b border-border">
          <Container size="xl" className="space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <Badge variant="outline" className="text-xs uppercase tracking-wider font-mono">
                  Institutional Security
                </Badge>
                <Heading as="h2" variant="title">
                  Security by Design, Not by Afterthought
                </Heading>
                <Text variant="muted" className="leading-relaxed">
                  We maintain customer balances on an immutable double-entry ledger while delegating on-chain key management to institutional custody providers with Multi-Party Computation (MPC).
                </Text>

                <div className="space-y-4 pt-2">
                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Immutable Double-Entry Accounting</h4>
                      <p className="text-xs text-muted-foreground">Every credit has an equal and opposite debit. Eliminates balance drift and race conditions.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Row-Level Database Locking</h4>
                      <p className="text-xs text-muted-foreground">Concurrent debit and withdrawal requests are serialized at the database level, preventing double-spend attacks.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Zero Private Key Vulnerability</h4>
                      <p className="text-xs text-muted-foreground">Application servers never hold master private keys or seed phrases. MPC enclaves manage signing.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Cryptographic Webhook Verification</h4>
                      <p className="text-xs text-muted-foreground">All inbound payment and deposit webhooks require HMAC signatures and strict deduplication.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Architecture Graphic Box */}
              <Card className="border-border bg-card/60 p-6 shadow-sm space-y-4">
                <div className="flex items-center space-x-2 text-primary border-b border-border pb-3">
                  <Layers className="w-5 h-5" />
                  <h3 className="font-semibold text-sm">System Layer Boundaries</h3>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 rounded-lg bg-muted/60 border border-border">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Client Layer</span>
                    <p className="font-semibold text-foreground mt-0.5">Next.js App Router (RSC + Client Modals)</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                    <span className="block text-[10px] uppercase font-semibold">Boundary Gate</span>
                    <p className="font-semibold mt-0.5">Session-Aware Edge Middleware &amp; CSRF Guards</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/60 border border-border">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Ledger &amp; Persistence</span>
                    <p className="font-semibold text-foreground mt-0.5">PostgreSQL Double-Entry Engine with Row-Level Security (RLS)</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary border border-border">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Custody Layer</span>
                    <p className="font-semibold text-foreground mt-0.5">Institutional Multi-Party Computation (MPC)</p>
                  </div>
                </div>
              </Card>
            </div>
          </Container>
        </section>

        {/* HOW IT WORKS SECTION */}
        <section id="how-it-works" className="py-20 border-b border-border bg-card/20">
          <Container size="xl" className="space-y-12">
            <div className="text-center space-y-3 max-w-xl mx-auto">
              <Badge variant="outline" className="text-xs uppercase tracking-wider font-mono">
                Simple Onboarding
              </Badge>
              <Heading as="h2" variant="title">
                Three Steps to Get Started
              </Heading>
              <Text variant="muted">
                Get started in under two minutes with zero seed phrases to memorize.
              </Text>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3 text-center md:text-left">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mx-auto md:mx-0 shadow-sm">
                  1
                </div>
                <h3 className="font-semibold text-base text-foreground">Create &amp; Verify Account</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sign up with your email and phone number. Verify with a secure one-time code. Your custodial wallet accounts are created automatically.
                </p>
              </div>

              <div className="space-y-3 text-center md:text-left">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mx-auto md:mx-0 shadow-sm">
                  2
                </div>
                <h3 className="font-semibold text-base text-foreground">Fund with Crypto</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Receive USDT, USDC, ETH, BTC, or SOL on supported networks using your dedicated custodial deposit address. Fiat funding availability depends on your region and configured provider.
                </p>
              </div>

              <div className="space-y-3 text-center md:text-left">
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center mx-auto md:mx-0 shadow-sm">
                  3
                </div>
                <h3 className="font-semibold text-base text-foreground">Transact with Confidence</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Send funds to other platform users with zero fees, swap supported assets with 30-second rate guarantees, or withdraw to external wallets at any time.
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="py-20 border-b border-border">
          <Container size="md" className="space-y-10">
            <div className="text-center space-y-3">
              <Badge variant="outline" className="text-xs uppercase tracking-wider font-mono">
                Questions &amp; Answers
              </Badge>
              <Heading as="h2" variant="title">
                Frequently Asked Questions
              </Heading>
              <Text variant="muted">
                Clear answers regarding custodial safety, withdrawal speeds, and fees.
              </Text>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">How is my wallet secured without seed phrases?</CardTitle>
                  <CardDescription className="text-xs leading-relaxed mt-1">
                    We utilize a managed custodial model. Private keys are held across distributed secure enclaves using Multi-Party Computation (MPC), eliminating the risk of lost recovery phrases while preserving bank-level protection.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">What currencies and assets are supported?</CardTitle>
                  <CardDescription className="text-xs leading-relaxed mt-1">
                    The wallet currently supports USDT, USDC, ETH, BTC, and SOL on compatible networks. Portfolio balances are displayed in USD by default. Fiat on-ramp availability varies by region and configured payment provider.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">What networks are supported for crypto deposits?</CardTitle>
                  <CardDescription className="text-xs leading-relaxed mt-1">
                    The wallet supports verified EVM-compatible networks including Polygon PoS, Arbitrum, and Base, as well as Bitcoin and Solana. Always verify the network selector on your Receive screen before broadcasting funds.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Are internal transfers between users really free?</CardTitle>
                  <CardDescription className="text-xs leading-relaxed mt-1">
                    Yes. Internal transfers between registered platform users are settled instantly off-chain on our double-entry ledger with 0% network or platform fees.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </Container>
        </section>

        {/* FINAL CALL TO ACTION */}
        <section className="py-20 bg-gradient-to-t from-primary/10 via-background to-background text-center">
          <Container size="md" className="space-y-6">
            <Heading as="h2" variant="hero">
              Ready to Take Control of Your Digital Assets?
            </Heading>
            <Text variant="muted" className="max-w-lg mx-auto text-base">
              Manage, send, swap, and receive supported cryptocurrencies in one secure, transparent platform.
            </Text>
            <div className="pt-2">
              <Link href="/auth/register">
                <Button variant="primary" size="lg" className="px-8" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Create Free Account
                </Button>
              </Link>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </div>
  );
}
