import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { History, FileText } from "lucide-react";

export default function HistoryPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Transaction History & Statements</h1>
          <p className="text-sm text-muted-foreground">
            Complete immutable financial ledger statement.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          Milestone 2 & 3 Scope
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2 text-primary mb-1">
            <FileText className="w-5 h-5" />
            <CardTitle>Ledger Journal Entries</CardTitle>
          </div>
          <CardDescription>
            All financial operations are permanently recorded as append-only double-entry transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={History}
            title="No ledger entries found"
            description="Your deposit, transfer, withdrawal, and swap transactions will appear here with detailed receipts once financial activity begins in Milestone 2."
          />
        </CardContent>
      </Card>
    </div>
  );
}
