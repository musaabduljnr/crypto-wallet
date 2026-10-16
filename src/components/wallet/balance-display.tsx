"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export interface BalanceDisplayProps {
  amount: string | number;
  currency?: "NGN" | "USD" | "USDT" | "ETH";
  secondaryAmount?: string | number;
  secondaryCurrency?: "NGN" | "USD" | "USDT" | "ETH";
  isMasked?: boolean;
  onToggleMask?: () => void;
  showToggle?: boolean;
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
  label?: string;
}

export function BalanceDisplay({
  amount,
  currency = "NGN",
  secondaryAmount,
  secondaryCurrency = "USD",
  isMasked = false,
  onToggleMask,
  showToggle = false,
  size = "md",
  className,
  label,
}: BalanceDisplayProps) {
  const sizeStyles = {
    sm: "text-lg font-bold",
    md: "text-2xl font-bold",
    lg: "text-3xl font-bold",
    hero: "text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight",
  };

  const formattedPrimary = formatCurrency(amount, currency);
  const formattedSecondary = secondaryAmount
    ? formatCurrency(secondaryAmount, secondaryCurrency)
    : null;

  return (
    <div className={cn("flex flex-col space-y-1", className)}>
      {label && (
        <div className="flex items-center space-x-2">
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">
            {label}
          </span>
          {showToggle && onToggleMask && (
            <button
              type="button"
              onClick={onToggleMask}
              className="p-1 text-muted-foreground hover:text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label={isMasked ? "Reveal balance" : "Hide balance"}
            >
              {isMasked ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      )}

      <div className="flex items-baseline space-x-2">
        <span
          className={cn(
            "font-mono tabular-nums text-foreground",
            sizeStyles[size]
          )}
        >
          {isMasked ? "••••••••" : formattedPrimary}
        </span>
        {!isMasked && (
          <span className="text-xs sm:text-sm font-medium text-muted-foreground">
            {currency}
          </span>
        )}
      </div>

      {formattedSecondary && (
        <div className="text-xs sm:text-sm font-mono text-muted-foreground tabular-nums">
          {isMasked ? "••••••" : `≈ ${formattedSecondary} ${secondaryCurrency}`}
        </div>
      )}
    </div>
  );
}
