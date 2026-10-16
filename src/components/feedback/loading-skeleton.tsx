import * as React from "react";
import { cn } from "@/lib/utils";

export interface LoadingSkeletonProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "avatar" | "card" | "table-row" | "balance";
}

export function LoadingSkeleton({
  variant = "text",
  className,
  ...props
}: LoadingSkeletonProps) {
  const variantStyles = {
    text: "h-4 w-full rounded",
    avatar: "h-10 w-10 rounded-full",
    card: "h-36 w-full rounded-xl",
    "table-row": "h-12 w-full rounded-lg",
    balance: "h-10 w-48 rounded-lg",
  };

  return (
    <div
      className={cn(
        "animate-pulse bg-muted/80 duration-1000",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
