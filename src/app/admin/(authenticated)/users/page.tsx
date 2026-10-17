import React from "react";
import Link from "next/link";
import { listAdminUsers } from "@/lib/admin/users";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, ShieldAlert, ArrowRight, UserPlus, CheckCircle2 } from "lucide-react";
import { CreateUserModal } from "./create-user-modal";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const resolvedParams = await searchParams;
  const query = resolvedParams.q || "";
  const page = parseInt(resolvedParams.page || "1", 10);
  const limit = 25;
  const offset = (page - 1) * limit;

  const { users, total } = await listAdminUsers({
    search: query,
    limit,
    offset,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">User Directory</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage customer profiles, inspect ledger balances, and enforce account restrictions.
          </p>
        </div>
        <CreateUserModal />
      </div>

      {/* Search and Filter Bar */}
      <Card className="p-3 bg-card/60">
        <form method="GET" action="/admin/users" className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search by name, email, or phone number..."
              className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button type="submit" size="sm" variant="outline" className="text-xs">
            Filter
          </Button>
          {query && (
            <Link href="/admin/users">
              <Button type="button" size="sm" variant="ghost" className="text-xs">
                Clear
              </Button>
            </Link>
          )}
        </form>
      </Card>

      {/* Users Table */}
      <Card className="shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">KYC Tier</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Registered</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="font-semibold text-foreground hover:text-primary transition-colors block"
                        >
                          {u.firstName} {u.lastName}
                        </Link>
                        <span className="text-[11px] text-muted-foreground block">{u.email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                      {u.phoneNumber || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Tier {u.kycTier}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      {u.status === "ACTIVE" && (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none text-[10px]">
                          ACTIVE
                        </Badge>
                      )}
                      {u.status === "RESTRICTED" && (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none text-[10px]">
                          RESTRICTED
                        </Badge>
                      )}
                      {u.status === "SUSPENDED" && (
                        <Badge variant="outline" className="bg-red-500/10 text-red-600 dark:text-red-400 border-none text-[10px]">
                          SUSPENDED
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-muted-foreground font-mono">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link href={`/admin/users/${u.id}`}>
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-primary">
                          <span>Details</span>
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer pagination info */}
        <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/10">
          <span>
            Showing {users.length} of {total} registered users
          </span>
          <div className="flex space-x-1">
            {page > 1 && (
              <Link href={`/admin/users?page=${page - 1}&q=${encodeURIComponent(query)}`}>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  Previous
                </Button>
              </Link>
            )}
            {offset + limit < total && (
              <Link href={`/admin/users?page=${page + 1}&q=${encodeURIComponent(query)}`}>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  Next
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
