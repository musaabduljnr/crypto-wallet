import React from "react";
import Link from "next/link";
import { requireStaffPermission } from "@/lib/admin/auth";
import { listAdminAuditLogs } from "@/lib/admin/audit";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Shield, User, Filter, CheckCircle2, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string }>;
}) {
  await requireStaffPermission("audit_logs.read");
  const params = await searchParams;
  const action = params.action || "";
  const page = parseInt(params.page || "1", 10);
  const limit = 50;
  const offset = (page - 1) * limit;

  const { logs, total } = await listAdminAuditLogs({
    actionType: action || undefined,
    limit,
    offset,
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Administrative Audit Trail</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable, append-only log of privileged administrative actions, security policy updates, and financial operations.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-3 bg-card/60">
        <form method="GET" action="/admin/audit-logs" className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground">Action Filter:</span>
          </div>

          <select
            name="action"
            defaultValue={action}
            className="bg-background border border-border rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
          >
            <option value="">All Privileged Actions</option>
            <option value="ACCOUNT_RESTRICTION_APPLIED">Restriction Applied</option>
            <option value="ACCOUNT_RESTRICTION_LIFTED">Restriction Lifted</option>
            <option value="BALANCE_ADJUSTMENT_REQUESTED">Balance Adj Requested</option>
            <option value="BALANCE_ADJUSTMENT_APPROVED_AND_POSTED">Balance Adj Approved & Posted</option>
            <option value="BALANCE_ADJUSTMENT_REJECTED">Balance Adj Rejected</option>
            <option value="USER_CREATED">User Created</option>
            <option value="USER_PROFILE_UPDATED">Profile Updated</option>
            <option value="STAFF_INVITED">Staff Invited</option>
            <option value="STAFF_ROLE_UPDATED">Staff Role Updated</option>
            <option value="SETTING_UPDATED">Setting Updated</option>
          </select>

          <Button type="submit" size="sm" variant="outline" className="text-xs">
            Filter
          </Button>

          {action && (
            <Link href="/admin/audit-logs">
              <Button type="button" size="sm" variant="ghost" className="text-xs text-muted-foreground">
                Reset
              </Button>
            </Link>
          )}

          <div className="ml-auto text-xs text-muted-foreground font-mono">
            {total} total audit events
          </div>
        </form>
      </Card>

      {/* Logs Table */}
      <Card className="border border-border/60 bg-card/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/30 border-b border-border/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Audit Metadata</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 font-mono">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground font-sans">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No audit records matching filter criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3.5 px-4 font-sans font-semibold">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {log.actionType}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-medium text-foreground">{log.actorEmail}</div>
                      <span className="text-[10px] text-muted-foreground uppercase">{log.actorRole}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-muted-foreground font-sans text-[11px]">{log.targetEntityType}: </span>
                      <span className="text-foreground text-[11px]">{log.targetEntityId.slice(0, 12)}...</span>
                    </td>
                    <td className="py-3.5 px-4 max-w-[320px] truncate text-[11px] text-muted-foreground font-mono">
                      {JSON.stringify(log.details)}
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      {log.status === "SUCCESS" ? (
                        <Badge variant="secondary" className="text-[10px] text-emerald-500 border-emerald-500/20 bg-emerald-500/10">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          SUCCESS
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          FAILED
                        </Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right text-muted-foreground font-sans">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border/40 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center space-x-2">
              {page > 1 && (
                <Link href={`/admin/audit-logs?page=${page - 1}&action=${action}`}>
                  <Button variant="outline" size="sm" className="text-xs">
                    Previous
                  </Button>
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/admin/audit-logs?page=${page + 1}&action=${action}`}>
                  <Button variant="outline" size="sm" className="text-xs">
                    Next
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
