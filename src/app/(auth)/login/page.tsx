"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { loginAction, type ActionResponse } from "@/actions/auth.actions";
import { Mail, Lock, ArrowRight, ShieldCheck } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/dashboard";

  const [state, formAction, isPending] = React.useActionState<ActionResponse<{ redirectUrl: string }>, FormData>(
    loginAction,
    null
  );

  React.useEffect(() => {
    if (state?.success && state.data?.redirectUrl) {
      router.push(state.data.redirectUrl);
    }
  }, [state, router]);

  return (
    <Card className="border-border shadow-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Sign In to ApexWallet</CardTitle>
        <CardDescription>
          Enter your credentials to access your internal wallet balances and ledger account.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {state?.error && (
          <InlineNotice variant="destructive" title="Authentication Error">
            {state.error}
          </InlineNotice>
        )}

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="returnUrl" value={returnUrl} />

          <Input
            label="Email Address"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.ng"
            required
            leftAddon={<Mail className="w-4 h-4" />}
            error={state?.fieldErrors?.email}
          />

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <Link
                href="/reset-password"
                className="text-xs text-primary hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              leftAddon={<Lock className="w-4 h-4" />}
              error={state?.fieldErrors?.password}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            isLoading={isPending}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            {isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col space-y-3 border-t border-border pt-4 text-xs text-muted-foreground text-center">
        <div>
          <span>Don&apos;t have an account? </span>
          <Link href="/register" className="ml-1 text-primary font-medium hover:underline">
            Create account
          </Link>
        </div>
        <div className="pt-2 border-t border-border/50 w-full flex items-center justify-center">
          <Link
            href="/admin/login"
            className="text-[11px] font-mono text-muted-foreground hover:text-foreground flex items-center space-x-1.5 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Super Admin & Operations Portal →</span>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <Card className="border-border shadow-md animate-pulse p-8 text-center text-muted-foreground">
          Loading authentication form...
        </Card>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
