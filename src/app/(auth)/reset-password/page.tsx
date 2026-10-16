"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { resetPasswordAction, type ActionResponse } from "@/actions/auth.actions";
import { Mail, ArrowLeft, Send } from "lucide-react";

export default function ResetPasswordPage() {
  const [submitted, setSubmitted] = React.useState(false);
  const [state, formAction, isPending] = React.useActionState<ActionResponse, FormData>(
    async (prev, formData) => {
      const res = await resetPasswordAction(prev, formData);
      if (res.success) setSubmitted(true);
      return res;
    },
    null
  );

  return (
    <Card className="border-border shadow-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
        <CardDescription>
          Enter your registered email address and we will dispatch password recovery instructions.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {submitted ? (
          <div className="space-y-4 text-center">
            <InlineNotice variant="success" title="Recovery Instructions Sent">
              If an account exists with that email address, you will receive password reset instructions shortly.
            </InlineNotice>
            <Link href="/auth/login" className="block w-full">
              <Button variant="outline" className="w-full" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <InlineNotice variant="destructive" title="Error">
                {state.error}
              </InlineNotice>
            )}

            <Input
              label="Email Address"
              name="email"
              type="email"
              placeholder="you@example.ng"
              required
              leftAddon={<Mail className="w-4 h-4" />}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isPending}
              rightIcon={<Send className="w-4 h-4" />}
            >
              {isPending ? "Sending..." : "Send Reset Instructions"}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex justify-center border-t border-border pt-4 text-xs text-muted-foreground">
        <Link href="/auth/login" className="inline-flex items-center text-primary font-medium hover:underline">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
