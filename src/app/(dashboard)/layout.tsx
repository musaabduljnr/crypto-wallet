import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "@/actions/auth.actions";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import {
  Shield,
  LayoutDashboard,
  Banknote,
  Download,
  Send,
  RefreshCw,
  History,
  Settings,
  LogOut,
  User,
} from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const userEmail = user.email || "user@example.ng";
  const userName =
    user.user_metadata?.first_name && user.user_metadata?.last_name
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
      : user.email?.split("@")[0] || "Account";

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Add Money", href: "/dashboard/add-money", icon: <Banknote className="w-4 h-4" /> },
    { label: "Receive", href: "/dashboard/receive", icon: <Download className="w-4 h-4" /> },
    { label: "Transfer", href: "/dashboard/transfer", icon: <Send className="w-4 h-4" /> },
    { label: "Swap", href: "/dashboard/swap", icon: <RefreshCw className="w-4 h-4" /> },
    { label: "History", href: "/dashboard/history", icon: <History className="w-4 h-4" /> },
    { label: "Settings", href: "/dashboard/settings", icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex bg-background text-foreground antialiased">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex w-64 flex-col justify-between border-r border-border bg-card/70 p-5 shrink-0">
        <div className="space-y-6">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight">ApexWallet</span>
              <span className="text-[10px] -mt-1 font-medium text-muted-foreground uppercase tracking-widest">
                Dashboard
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* User Card & Sign Out */}
        <div className="border-t border-border pt-4 space-y-3">
          <div className="flex items-center space-x-3 px-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
              <User className="w-4 h-4" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-semibold text-foreground truncate">{userName}</span>
              <span className="text-[11px] text-muted-foreground truncate">{userEmail}</span>
            </div>
          </div>

          <form
            action={async () => {
              "use server";
              await logoutAction();
            }}
          >
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Sign Out
            </Button>
          </form>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        {/* Top Header */}
        <header className="h-16 border-b border-border bg-card/40 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-semibold text-foreground">ApexWallet Account</span>
            <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 text-[10px] font-medium px-2 py-0.5">
              Verified Tier 1
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <Link href="/dashboard/settings" className="flex items-center space-x-2 text-xs text-muted-foreground hover:text-foreground">
              <span className="hidden sm:inline font-medium">{userEmail}</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 h-16 border-t border-border bg-background/95 backdrop-blur-md px-2 flex items-center justify-around z-40">
        <Link href="/dashboard" className="flex flex-col items-center py-1 text-xs text-muted-foreground hover:text-foreground">
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-[10px] mt-1">Home</span>
        </Link>
        <Link href="/dashboard/transfer" className="flex flex-col items-center py-1 text-xs text-muted-foreground hover:text-foreground">
          <Send className="w-4 h-4" />
          <span className="text-[10px] mt-1">Transfer</span>
        </Link>
        <Link href="/dashboard/swap" className="flex flex-col items-center py-1 text-xs text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-4 h-4" />
          <span className="text-[10px] mt-1">Swap</span>
        </Link>
        <Link href="/dashboard/history" className="flex flex-col items-center py-1 text-xs text-muted-foreground hover:text-foreground">
          <History className="w-4 h-4" />
          <span className="text-[10px] mt-1">History</span>
        </Link>
        <Link href="/dashboard/settings" className="flex flex-col items-center py-1 text-xs text-muted-foreground hover:text-foreground">
          <Settings className="w-4 h-4" />
          <span className="text-[10px] mt-1">Settings</span>
        </Link>
      </nav>
    </div>
  );
}
