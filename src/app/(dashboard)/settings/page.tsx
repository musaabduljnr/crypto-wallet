"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { updateProfileAction, type ProfileActionResponse } from "@/actions/profile.actions";
import { User, Phone, MapPin, Shield, CheckCircle2, Lock } from "lucide-react";

export default function SettingsPage() {
  const [state, formAction, isPending] = React.useActionState<ProfileActionResponse, FormData>(
    updateProfileAction,
    null
  );

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Account & Security Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal profile details, security settings, and wallet preferences.
        </p>
      </div>

      {/* PROFILE DETAILS CARD */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>
            Your verified personal identity information. Non-sensitive fields can be updated below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state?.success && (
            <InlineNotice variant="success" title="Profile Updated">
              Your profile changes have been successfully saved to your account.
            </InlineNotice>
          )}

          {state?.error && (
            <InlineNotice variant="destructive" title="Update Failed">
              {state.error}
            </InlineNotice>
          )}

          <form action={formAction} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                name="firstName"
                placeholder="Chidi"
                defaultValue="Chidi"
                required
                leftAddon={<User className="w-4 h-4" />}
                error={state?.fieldErrors?.firstName}
              />
              <Input
                label="Last Name"
                name="lastName"
                placeholder="Bakare"
                defaultValue="Bakare"
                required
                leftAddon={<User className="w-4 h-4" />}
                error={state?.fieldErrors?.lastName}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Phone Number"
                name="phoneNumber"
                placeholder="08012345678"
                defaultValue="08012345678"
                required
                leftAddon={<Phone className="w-4 h-4" />}
                error={state?.fieldErrors?.phoneNumber}
              />
              <Input
                label="State of Residence (Nigeria)"
                name="stateOfResidence"
                placeholder="Lagos State"
                defaultValue="Lagos State"
                leftAddon={<MapPin className="w-4 h-4" />}
                error={state?.fieldErrors?.stateOfResidence}
              />
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" isLoading={isPending}>
                {isPending ? "Saving Changes..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* SECURITY & AUTHENTICATION CARD */}
      <Card>
        <CardHeader>
          <CardTitle>Security & Access Control</CardTitle>
          <CardDescription>
            Multi-factor protection and session security.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Session Protection Active</h4>
                <p className="text-xs text-muted-foreground">HTTP-only SameSite=Lax cookie tokens guard your session against XSS attacks.</p>
              </div>
            </div>
            <span className="text-xs font-mono font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              Active
            </span>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Password Recovery</h4>
                <p className="text-xs text-muted-foreground">Update your password or initiate an authenticated reset.</p>
              </div>
            </div>
            <a href="/auth/reset-password">
              <Button variant="outline" size="sm">
                Change Password
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* COMPLIANCE & KYC STATUS */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance & Tier Status</CardTitle>
          <CardDescription>
            Verification status conforming to Nigerian VASP & SEC ARIP regulations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Current Status</span>
              <span className="text-xs font-bold text-emerald-600">Tier 1 Verified</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Tier 1 enables NGN virtual account deposits and internal transfers up to ₦50,000 daily limit. Higher limits unlock upon government-issued ID verification.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
