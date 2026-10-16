import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Shield, Lock, CheckCircle2 } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-background via-muted/20 to-background text-foreground">
      {/* Top Header */}
      <header className="w-full border-b border-border/80 bg-background/80 backdrop-blur-md">
        <Container size="xl" className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight">ApexWallet</span>
              <span className="text-[10px] -mt-1 font-medium text-muted-foreground uppercase tracking-widest">
                Digital Assets
              </span>
            </div>
          </Link>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5 text-primary" />
            <span>256-Bit TLS Encryption</span>
          </div>
        </Container>
      </header>

      {/* Main Form Content */}
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6">
        <div className="w-full max-w-md">{children}</div>
      </main>

      {/* Auth Footer */}
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        <Container size="xl" className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} ApexWallet Inc. Protected by Supabase Auth & RLS.</p>
          <div className="flex space-x-4">
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/" className="hover:text-foreground">Home</Link>
          </div>
        </Container>
      </footer>
    </div>
  );
}
