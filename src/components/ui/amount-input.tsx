import * as React from "react";
import { cn } from "@/lib/utils";

export interface AmountInputProps {
  value: string;
  onChange: (val: string) => void;
  assetTicker: string;
  label?: string;
  maxBalance?: string;
  onMaxClick?: () => void;
  error?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function AmountInput({
  value,
  onChange,
  assetTicker,
  label = "Amount",
  maxBalance,
  onMaxClick,
  error,
  disabled,
  className,
  placeholder = "0.00",
}: AmountInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;
    // Allow only numbers and one decimal point
    input = input.replace(/[^0-9.]/g, "");
    const parts = input.split(".");
    if (parts.length > 2) {
      input = parts[0] + "." + parts.slice(1).join("");
    }
    onChange(input);
  };

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {maxBalance && (
          <div className="flex items-center space-x-1.5 text-xs text-muted-foreground">
            <span>Available: {maxBalance} {assetTicker}</span>
            {onMaxClick && !disabled && (
              <button
                type="button"
                onClick={onMaxClick}
                className="font-semibold text-primary hover:underline focus:outline-none"
              >
                MAX
              </button>
            )}
          </div>
        )}
      </div>

      <div
        className={cn(
          "relative flex items-center rounded-lg border border-input bg-card px-3.5 py-1.5 shadow-sm transition-colors",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1",
          error && "border-destructive focus-within:ring-destructive",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full bg-transparent font-mono text-xl md:text-2xl font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
        />
        <div className="ml-3 flex items-center space-x-1 rounded-md bg-secondary px-2.5 py-1 text-sm font-semibold text-secondary-foreground">
          <span>{assetTicker}</span>
        </div>
      </div>

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
