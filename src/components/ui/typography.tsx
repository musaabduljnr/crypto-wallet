import * as React from "react";
import { cn } from "@/lib/utils";

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  variant?: "hero" | "title" | "subtitle" | "section";
}

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ as: Tag = "h2", variant = "title", className, children, ...props }, ref) => {
    const variantStyles = {
      hero: "text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground",
      title: "text-2xl sm:text-3xl font-semibold tracking-tight text-foreground",
      subtitle: "text-xl sm:text-2xl font-semibold text-foreground",
      section: "text-base sm:text-lg font-medium text-foreground",
    };

    return (
      <Tag
        ref={ref}
        className={cn(variantStyles[variant], className)}
        {...props}
      >
        {children}
      </Tag>
    );
  }
);
Heading.displayName = "Heading";

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  variant?: "body" | "caption" | "muted" | "mono";
}

export const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  ({ variant = "body", className, children, ...props }, ref) => {
    const variantStyles = {
      body: "text-sm sm:text-base text-foreground leading-relaxed",
      caption: "text-xs sm:text-sm text-muted-foreground",
      muted: "text-sm text-muted-foreground",
      mono: "font-mono text-sm tabular-nums text-foreground",
    };

    return (
      <p
        ref={ref}
        className={cn(variantStyles[variant], className)}
        {...props}
      >
        {children}
      </p>
    );
  }
);
Text.displayName = "Text";
