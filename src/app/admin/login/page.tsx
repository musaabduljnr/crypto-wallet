"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { adminLoginAction, AdminLoginResponse } from "@/actions/admin-auth.actions";
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  KeyRound,
  ShieldAlert,
  Server,
  Zap,
} from "lucide-react";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/admin";
  const authError = searchParams.get("error");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const [state, formAction, isPending] = React.useActionState<AdminLoginResponse, FormData>(
    adminLoginAction,
    { success: false }
  );

  React.useEffect(() => {
    if (state?.success && state.redirectUrl) {
      router.push(state.redirectUrl);
    }
  }, [state, router]);

  const handleFillSuperAdmin = () => {
    setEmail("superadmin@apexwallet.io");
    setPassword("ApexAdmin2026!@#Secure");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient security grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Ambient glow accent */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Terminal Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>OPERATIONAL LEDGER // TIER-1 CLEARANCE</span>
          </div>
          <div className="flex items-center justify-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
              Apex Custody Terminal
            </h1>
          </div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Authorized administrative gateway for Super Admins, Operations, and Compliance personnel.
          </p>
        </div>

        {/* Security Warning Notice if redirected */}
        {authError === "admin_unauthorized" && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start space-x-3 text-xs text-amber-300">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <strong className="font-semibold block text-amber-200">Staff Authentication Required</strong>
              Your current session does not possess active staff clearance. Please authenticate with your Super Admin credentials.
            </div>
          </div>
        )}

        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur-xl shadow-2xl">
          <CardHeader className="pb-4 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-100 flex items-center space-x-2">
                <KeyRound className="h-4 w-4 text-primary" />
                <span>Super Admin Verification</span>
              </CardTitle>
              <Badge variant="outline" className="text-[10px] uppercase font-mono border-slate-700 text-slate-400">
                SSL + RBAC
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Enter your privileged credentials to access the ledger management console.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-4">
            {state?.error && (
              <InlineNotice variant="destructive" title="Access Denied">
                {state.error}
              </InlineNotice>
            )}

            {/* Quick Fill Super Admin helper button */}
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[11px] font-medium text-slate-300 block">Super Admin Account</span>
                <span className="text-[10px] text-slate-500 font-mono">superadmin@apexwallet.io</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFillSuperAdmin}
                className="text-[11px] h-7 px-2.5 bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-emerald-400 hover:text-emerald-300"
              >
                <Zap className="h-3 w-3 mr-1" />
                Fill Credentials
              </Button>
            </div>

            <form action={formAction} className="space-y-4">
              <input type="hidden" name="returnUrl" value={returnUrl} />

              <Input
                label="Admin Email Address"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="superadmin@apexwallet.io"
                required
                leftAddon={<Mail className="w-4 h-4 text-slate-400" />}
                error={state?.fieldErrors?.email}
                className="bg-slate-950/80 border-slate-700 text-slate-100 placeholder:text-slate-500"
              />

              <div className="space-y-1">
                <label htmlFor="password" className="text-sm font-medium text-slate-300">
                  Master Security Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  leftAddon={<Lock className="w-4 h-4 text-slate-400" />}
                  error={state?.fieldErrors?.password}
                  className="bg-slate-950/80 border-slate-700 text-slate-100 placeholder:text-slate-500"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-4 font-semibold tracking-wide shadow-lg shadow-primary/25"
                isLoading={isPending}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {isPending ? "Verifying Staff Clearance..." : "Authorize & Enter Console"}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-2 border-t border-slate-800/80 pt-4 text-center">
            <Link
              href="/login"
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center space-x-1"
            >
              <span>Not administrative staff?</span>
              <span className="text-primary font-medium hover:underline">Go to Customer Wallet Login</span>
            </Link>
          </CardFooter>
        </Card>

        {/* Security watermark footer */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono px-2">
          <span className="flex items-center space-x-1.5">
            <Server className="h-3 w-3 text-slate-600" />
            <span>Node ID: APX-AUTH-01</span>
          </span>
          <span>Immutable Audit Logging Active</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
          Initializing secure administrative gateway...
        </div>
      }
    >
      <AdminLoginForm />
    </React.Suspense>
  );
}
