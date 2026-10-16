import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { RefreshCw, Timer, Scale } from "lucide-react";

export default function SwapPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Crypto Swap (RFQ)</h1>
          <p className="text-sm text-muted-foreground">
            Convert between NGN, USDT, and ETH with guaranteed rate locks.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          Milestone 3 Scope
        </Badge>
      </div>

      <InlineNotice variant="info" title="Guaranteed RFQ Conversion Engine">
        Crypto swaps are powered by a Request-For-Quote (RFQ) engine providing guaranteed exchange rates for 30 seconds with zero slippage.
      </InlineNotice>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2 text-primary mb-1">
            <Timer className="w-5 h-5" />
            <CardTitle>Swap Architecture</CardTitle>
          </div>
          <CardDescription>
            In Milestone 3, multi-asset atomic conversion will execute via dedicated system clearing accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 space-y-2">
            <h4 className="font-semibold text-foreground">Planned RFQ Swap Features:</h4>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>30-second circular countdown timer locking the executable rate.</li>
              <li>Dual-leg double-entry balance posting balancing independently per asset scope.</li>
              <li>Transparent platform spread disclosure with zero hidden fees.</li>
              <li>Atomic commit: both asset movements settle or both abort cleanly.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
