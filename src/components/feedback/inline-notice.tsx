import * as React from "react";
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InlineNoticeProps {
  variant?: "info" | "warning" | "success" | "destructive";
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function InlineNotice({
  variant = "info",
  title,
  children,
  className,
}: InlineNoticeProps) {
  const config = {
    info: {
      icon: <Info className="h-4 w-4 text-sky-600 dark:text-sky-400" />,
      styles: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
    },
    warning: {
      icon: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
      styles: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
    },
    success: {
      icon: <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
      styles: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
    },
    destructive: {
      icon: <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />,
      styles: "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200",
    },
  }[variant];

  return (
    <div
      className={cn(
        "flex space-x-3 rounded-lg border p-3.5 text-sm",
        config.styles,
        className
      )}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
      <div className="flex-1 space-y-1">
        {title && <h5 className="font-semibold text-inherit">{title}</h5>}
        <div className="text-xs sm:text-sm text-inherit opacity-90 leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}
