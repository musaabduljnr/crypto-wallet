import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { Send, Zap, ShieldAlert } from "lucide-react";

export default function TransferPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Transfer Funds</h1>
          <p className="text-sm text-muted-foreground">
            Instant zero-fee internal transfers and external EVM blockchain withdrawals.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          Milestone 2 Scope
        </Badge>
      </div>

      <InlineNotice variant="info" title="Two-Phase Transfer Architecture">
        Internal transfers execute with atomic row-locking on the PostgreSQL ledger. External withdrawals utilize two-phase reservations (`Available` -&gt; `Reserved` -&gt; `Clearing`).
      </InlineNotice>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2 text-primary mb-1">
            <Zap className="w-5 h-5" />
            <CardTitle>Transfer Modes</CardTitle>
          </div>
          <CardDescription>
            In Milestone 2, this hub will support both off-chain P2P transfers and external on-chain withdrawals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
              <span className="font-bold text-foreground text-xs uppercase tracking-wide">Mode A: Platform User</span>
              <p className="text-xs">Send by email or platform tag. Instant settlement with zero network fees.</p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-card space-y-1.5">
              <span className="font-bold text-foreground text-xs uppercase tracking-wide">Mode B: External Wallet</span>
              <p className="text-xs">Withdraw to any 0x EVM address with checksum validation and step-up authentication.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
