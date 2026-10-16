import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { Banknote, Building2, CheckCircle2 } from "lucide-react";

export default function AddMoneyPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Add Money (NGN Bank Transfer)</h1>
          <p className="text-sm text-muted-foreground">
            Fund your wallet via dedicated virtual bank accounts in Nigerian Naira.
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          Milestone 2 Scope
        </Badge>
      </div>

      <InlineNotice variant="info" title="Milestone 2 Feature Preview">
        NGN On-Ramp infrastructure connects in Milestone 2 alongside the double-entry accounting engine and partner payment webhook verification.
      </InlineNotice>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2 text-primary mb-1">
            <Building2 className="w-5 h-5" />
            <CardTitle>Virtual Account Generation</CardTitle>
          </div>
          <CardDescription>
            In Milestone 2, this view will automatically provision a dedicated virtual account number linked to your wallet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 space-y-2">
            <h4 className="font-semibold text-foreground">Planned Funding Flow:</h4>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Enter deposit amount in Naira (e.g., ₦50,000).</li>
              <li>A dedicated 10-digit virtual account number is generated.</li>
              <li>Transfer funds from your commercial bank app (e.g. GTBank, Kuda, Zenith).</li>
              <li>Inbound webhook verifies cryptographic signature and posts double-entry credit.</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
