"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { registerAction, type ActionResponse } from "@/actions/auth.actions";
import { Mail, Lock, User, Phone, Check, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");

  const [state, formAction, isPending] = React.useActionState<ActionResponse<{ requiresVerification: boolean }>, FormData>(
    registerAction,
    null
  );

  React.useEffect(() => {
    if (state?.success) {
      if (state.data?.requiresVerification) {
        router.push("/auth/verify-email");
      } else {
        router.push("/dashboard");
      }
    }
  }, [state, router]);

  // Password Strength Indicators
  const criteria = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One uppercase letter (A-Z)", met: /[A-Z]/.test(password) },
    { label: "One lowercase letter (a-z)", met: /[a-z]/.test(password) },
    { label: "One number (0-9)", met: /[0-9]/.test(password) },
    { label: "One special character (!@#$%...)", met: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <Card className="border-border shadow-md">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Create Free Account</CardTitle>
        <CardDescription>
          Get your managed crypto wallet and instant Nigerian Naira funding bridge in minutes.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {state?.error && (
          <InlineNotice variant="destructive" title="Registration Issue">
            {state.error}
          </InlineNotice>
        )}

        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              name="firstName"
              type="text"
              placeholder="Chidi"
              required
              leftAddon={<User className="w-4 h-4" />}
              error={state?.fieldErrors?.firstName}
            />
            <Input
              label="Last Name"
              name="lastName"
              type="text"
              placeholder="Bakare"
              required
              error={state?.fieldErrors?.lastName}
            />
          </div>

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

          <Input
            label="Phone Number"
            name="phoneNumber"
            type="tel"
            placeholder="08012345678"
            helperText="Nigerian mobile format (+234 or 080...)"
            required
            leftAddon={<Phone className="w-4 h-4" />}
            error={state?.fieldErrors?.phoneNumber}
          />

          <div className="space-y-2">
            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              leftAddon={<Lock className="w-4 h-4" />}
              error={state?.fieldErrors?.password}
            />

            {/* Dynamic Strength List */}
            {password.length > 0 && (
              <div className="p-2.5 rounded-lg bg-muted/60 border border-border space-y-1 text-xs">
                {criteria.map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-1.5">
                    <Check
                      className={`w-3.5 h-3.5 ${
                        item.met ? "text-emerald-600 font-bold" : "text-muted-foreground/40"
                      }`}
                    />
                    <span className={item.met ? "text-foreground font-medium" : "text-muted-foreground"}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-start space-x-2 pt-1">
            <input
              type="checkbox"
              id="termsAccepted"
              name="termsAccepted"
              required
              className="mt-1 h-4 w-4 rounded border-input text-primary focus:ring-primary"
            />
            <label htmlFor="termsAccepted" className="text-xs text-muted-foreground leading-relaxed">
              I agree to the{" "}
              <Link href="/terms" className="text-primary hover:underline font-medium">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary hover:underline font-medium">
                Privacy Policy
              </Link>
              .
            </label>
          </div>
          {state?.fieldErrors?.termsAccepted && (
            <p className="text-xs text-destructive font-medium">{state.fieldErrors.termsAccepted}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            isLoading={isPending}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            {isPending ? "Creating Account..." : "Create Account"}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center border-t border-border pt-4 text-xs text-muted-foreground">
        <span>Already have an account? </span>
        <Link href="/auth/login" className="ml-1 text-primary font-medium hover:underline">
          Sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
