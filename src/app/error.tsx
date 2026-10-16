"use client";

import * as React from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Heading, Text } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log error securely without exposing user context
    console.error("Application Error Boundary caught exception:", error.message);
  }, [error]);

  return (
    <main className="min-h-screen py-24 flex flex-col items-center justify-center bg-background text-foreground">
      <Container size="sm" className="text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <Heading as="h1" variant="title">
            Something went wrong
          </Heading>
          <Text variant="muted" className="max-w-md mx-auto">
            An unexpected error occurred while processing your request. Your funds and financial ledger state remain completely safe.
          </Text>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Button
            variant="primary"
            onClick={() => reset()}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Try Again
          </Button>
          <Link href="/">
            <Button variant="outline" leftIcon={<Home className="w-4 h-4" />}>
              Return Home
            </Button>
          </Link>
        </div>
      </Container>
    </main>
  );
}
