import * as React from "react";
import { CheckCircle2, Clock, AlertCircle, XCircle, RotateCcw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type FinancialStatus =
  | "DRAFT"
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "RECONCILIATION_REQUIRED";

export interface TransactionStatusBadgeProps {
  status: FinancialStatus;
  className?: string;
  showIcon?: boolean;
}

export function TransactionStatusBadge({
  status,
  className,
  showIcon = true,
}: TransactionStatusBadgeProps) {
  const configMap: Record<
    FinancialStatus,
    { label: string; icon: React.ReactNode; styles: string }
  > = {
    DRAFT: {
      label: "Draft",
      icon: <Clock className="w-3.5 h-3.5" />,
      styles: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/50 dark:text-slate-300 dark:border-slate-800",
    },
    PENDING: {
      label: "Pending",
      icon: <Clock className="w-3.5 h-3.5 animate-spin" />,
      styles: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    },
    PROCESSING: {
      label: "Processing",
      icon: <Clock className="w-3.5 h-3.5 animate-spin" />,
      styles: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800",
    },
    COMPLETED: {
      label: "Completed",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      styles: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    },
    FAILED: {
      label: "Failed",
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      styles: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
    },
    CANCELLED: {
      label: "Cancelled",
      icon: <XCircle className="w-3.5 h-3.5" />,
      styles: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-900/50 dark:text-zinc-300 dark:border-zinc-800",
    },
    EXPIRED: {
      label: "Expired",
      icon: <RotateCcw className="w-3.5 h-3.5" />,
      styles: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800",
    },
    RECONCILIATION_REQUIRED: {
      label: "Reconciliation",
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      styles: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800",
    },
  };

  const { label, icon, styles } = configMap[status] || configMap.DRAFT;

  return (
    <span
      className={cn(
        "inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        styles,
        className
      )}
    >
      {showIcon && <span className="flex-shrink-0">{icon}</span>}
      <span>{label}</span>
    </span>
  );
}
