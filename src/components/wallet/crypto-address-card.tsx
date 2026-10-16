"use client";

import * as React from "react";
import { Copy, Check, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface CryptoAddressCardProps {
  address: string;
  network: string;
  asset: string;
  className?: string;
}

export function CryptoAddressCard({
  address,
  network,
  asset,
  className,
}: CryptoAddressCardProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              {asset} Deposit Address
            </h4>
            <p className="text-xs text-muted-foreground">{network} Network</p>
          </div>
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
          EVM Compatible
        </span>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-input bg-muted/40 p-2.5 sm:p-3">
        <span className="font-mono text-xs sm:text-sm text-foreground break-all mr-2">
          {address}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleCopy}
          className="flex-shrink-0"
          aria-label={copied ? "Address copied" : "Copy address"}
        >
          {copied ? (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5 text-success" />
              <span className="text-success">Copied</span>
            </>
          ) : (
            <>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
