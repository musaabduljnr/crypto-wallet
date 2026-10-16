import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { Download, QrCode, AlertTriangle } from "lucide-react";

export default function ReceivePage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Receive Crypto (EVM)</h1>
          <p className="text-sm text-muted-foreground">
            Inbound digital asset deposits on supported EVM networks.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          Milestone 2 Scope
        </Badge>
      </div>

      <InlineNotice variant="warning" title="EVM Network Custody Integration">
        Custodial EVM address assignment connects in Milestone 2 alongside block confirmation counters and automated webhook tracking.
      </InlineNotice>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2 text-primary mb-1">
            <QrCode className="w-5 h-5" />
            <CardTitle>Deposit Address Assignment</CardTitle>
          </div>
          <CardDescription>
            In Milestone 2, your personal institutional deposit address and QR code will be generated here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 space-y-2">
            <h4 className="font-semibold text-foreground">Planned Inbound Deposit Features:</h4>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Supported assets: USDT (Tether) & ETH (Ethereum).</li>
              <li>Network compatibility warnings preventing irreversible wrong-chain losses.</li>
              <li>Real-time confirmation depth tracker (e.g. 18 / 64 confirmations).</li>
              <li>Zero floating-point balance rounding upon finalized block depth.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
