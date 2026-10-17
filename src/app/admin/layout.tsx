import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedStaff } from "@/lib/admin/auth";
import {
  Users,
  Activity,
  SlidersHorizontal,
  ShieldAlert,
  FileText,
  Settings,
  UserCheck,
  LayoutDashboard,
  ShieldCheck,
  Server,
  ArrowLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let staff;
  try {
    staff = await getAuthenticatedStaff();
  } catch {
    redirect("/auth/login?returnUrl=/admin&error=admin_unauthorized");
  }

  const navItems = [
    { label: "Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Transactions", href: "/admin/transactions", icon: Activity },
    { label: "Balance Adjustments", href: "/admin/balance-adjustments", icon: SlidersHorizontal },
    { label: "Restrictions", href: "/admin/restrictions", icon: ShieldAlert },
    { label: "Audit Logs", href: "/admin/audit-logs", icon: FileText },
    { label: "Operations", href: "/admin/operations", icon: Server },
    { label: "Settings", href: "/admin/settings", icon: Settings },
    { label: "Staff", href: "/admin/staff", icon: UserCheck },
  ];

  const roleColors: Record<string, string> = {
    super_admin: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    admin: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    finance: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    compliance: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    support: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    read_only: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* 1. OPERATIONAL SIDEBAR */}
      <aside className="w-full md:w-64 border-r border-border bg-card/60 flex flex-col shrink-0">
        <div className="h-16 px-6 border-b border-border flex items-center justify-between">
          <Link href="/admin" className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-foreground block">Apex Admin</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Operations Console</span>
            </div>
          </Link>
        </div>

        {/* Staff badge */}
        <div className="px-6 py-3 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground truncate max-w-[130px]">{staff.email}</span>
            <Badge variant="outline" className={`text-[10px] uppercase font-mono px-1.5 py-0.5 ${roleColors[staff.role] || ""}`}>
              {staff.role}
            </Badge>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-border space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center space-x-2 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Switch to Wallet</span>
          </Link>
        </div>
      </aside>

      {/* 2. MAIN ADMINISTRATIVE CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border px-6 flex items-center justify-between bg-card/30">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-foreground">Production Ledger Active</span>
            <span className="hidden sm:inline">• Read/Write Privileged Session</span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Session: <strong className="text-foreground">{staff.firstName} {staff.lastName}</strong>
            </span>
            <Badge variant="outline" className="text-[11px] font-mono">
              Tier 1 Enforced
            </Badge>
          </div>
        </header>

        <main className="p-6 md:p-8 flex-1 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
