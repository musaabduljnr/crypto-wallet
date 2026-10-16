import * as React from "react";
import { cn } from "@/lib/utils";

export interface FeeSummaryRowProps {
  label: string;
  value: string;
  subValue?: string;
  isTotal?: boolean;
  className?: string;
}

export function FeeSummaryRow({
  label,
  value,
  subValue,
  isTotal = false,
  className,
}: FeeSummaryRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-1.5 text-sm",
        isTotal
          ? "border-t border-border pt-2.5 font-semibold text-foreground text-base"
          : "text-muted-foreground",
        className
      )}
    >
      <span>{label}</span>
      <div className="text-right">
        <span
          className={cn(
            "font-mono tabular-nums",
            isTotal ? "text-foreground font-bold" : "text-foreground font-medium"
          )}
        >
          {value}
        </span>
        {subValue && (
          <p className="text-xs text-muted-foreground font-mono tabular-nums">
            {subValue}
          </p>
        )}
      </div>
    </div>
  );
}
