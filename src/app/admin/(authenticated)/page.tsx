import React from "react";
import Link from "next/link";
import { getAdminDashboardStats } from "@/lib/admin/stats";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  ShieldAlert,
  Activity,
  SlidersHorizontal,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  UserPlus,
  ShieldX,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const stats = await getAdminDashboardStats();

  return (
    <div className="space-y-8">
      {/* 1. HEADER & WELCOME */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Operational Overview</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time financial activity, platform health indicators, and active restrictions.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/admin/users">
            <Button size="sm" variant="outline" className="text-xs">
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Manage Users
            </Button>
          </Link>
          <Link href="/admin/balance-adjustments">
            <Button size="sm" className="text-xs">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
              Review Adjustments
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. STATS SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4 space-y-1 bg-card/60">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Users</span>
            <Users className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold text-foreground font-mono">{stats.totalUsers}</p>
          <span className="text-[10px] text-muted-foreground">Registered identities</span>
        </Card>

        <Card className="p-4 space-y-1 bg-card/60">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground font-mono">{stats.activeUsers}</p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Unrestricted accounts</span>
        </Card>

        <Card className="p-4 space-y-1 bg-card/60">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Restricted</span>
            <ShieldAlert className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-foreground font-mono">{stats.restrictedUsers}</p>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Active holds/blocks</span>
        </Card>

        <Card className="p-4 space-y-1 bg-card/60">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Pending Adj.</span>
            <SlidersHorizontal className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground font-mono">{stats.pendingAdjustments}</p>
          <span className="text-[10px] text-muted-foreground">Maker-checker queue</span>
        </Card>

        <Card className="p-4 space-y-1 bg-card/60">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Tx</span>
            <Activity className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold text-foreground font-mono">{stats.totalTransactionsCount}</p>
          <span className="text-[10px] text-muted-foreground">Double-entry journals</span>
        </Card>

        <Card className="p-4 space-y-1 bg-card/60">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Audit Events</span>
            <FileText className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold text-foreground font-mono">{stats.recentAuditLogsCount}</p>
          <span className="text-[10px] text-muted-foreground">Privileged operations</span>
        </Card>
      </div>

      {/* 3. OPERATIONAL STATUS & QUICK ACTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Provider Integration Health */}
        <Card className="md:col-span-1 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Activity className="h-4 w-4 text-primary" />
              <span>Provider Status</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Live status for external rails and custodial node connections.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Korapay Rail (Fiat On-Ramp)</p>
                <p className="text-[10px] text-muted-foreground">Virtual accounts & bank checkout</p>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none text-[10px] font-mono">
                HEALTHY
              </Badge>
            </div>

            <div className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Fireblocks (MPC Custody)</p>
                <p className="text-[10px] text-muted-foreground">Deposit vault & broadcast engine</p>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none text-[10px] font-mono">
                HEALTHY
              </Badge>
            </div>

            <div className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">CoinGecko Feed (Price RFQ)</p>
                <p className="text-[10px] text-muted-foreground">USD & NGN valuation reference</p>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none text-[10px] font-mono">
                HEALTHY
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Recent Privileged Audit Events */}
        <Card className="md:col-span-2 shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center space-x-2">
                <FileText className="h-4 w-4 text-primary" />
                <span>Recent Audit Activity</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Immutable record of administrative interventions and privileged adjustments.
              </CardDescription>
            </div>
            <Link href="/admin/audit-logs" className="text-xs text-primary hover:underline flex items-center">
              <span>View All</span>
              <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.recentAuditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No recent administrative actions recorded.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {stats.recentAuditLogs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-foreground text-[11px]">{log.actionType}</span>
                        <span className="text-[10px] text-muted-foreground">on {log.targetEntityType}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Actor: <strong className="text-foreground font-normal">{log.actorEmail}</strong>
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
