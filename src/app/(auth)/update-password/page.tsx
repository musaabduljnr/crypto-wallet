"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { updatePasswordAction, type ActionResponse } from "@/actions/auth.actions";
import { Lock, ArrowRight } from "lucide-react";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [state, formAction, isPending] = React.useActionState<ActionResponse, FormData>(
    updatePasswordAction,
    null
  );

  React.useEffect(() => {
    if (state?.success) {
      router.push("/dashboard");
    }
  }, [state, router]);

  return (
    <Card className="border-border shadow-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
        <CardDescription>
          Enter a strong, unique password for your ApexWallet account.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {state?.error && (
          <InlineNotice variant="destructive" title="Error">
            {state.error}
          </InlineNotice>
        )}

        <form action={formAction} className="space-y-4">
          <Input
            label="New Password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            leftAddon={<Lock className="w-4 h-4" />}
          />

          <Input
            label="Confirm New Password"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            required
            leftAddon={<Lock className="w-4 h-4" />}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isPending}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            {isPending ? "Updating Password..." : "Update Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
