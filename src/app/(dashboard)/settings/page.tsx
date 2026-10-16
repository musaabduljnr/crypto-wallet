"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { updateProfileAction, type ProfileActionResponse } from "@/actions/profile.actions";
import {
  getNotificationPreferencesAction,
  updateNotificationPreferencesAction,
  updatePasswordAction,
  signOutAllSessionsAction,
} from "@/actions/settings.actions";
import { UserNotificationPreferences } from "@/lib/services/notification.service";
import {
  User,
  Phone,
  MapPin,
  Shield,
  CheckCircle2,
  Lock,
  Bell,
  LogOut,
  ShieldAlert,
  AlertCircle,
  Key,
} from "lucide-react";

export default function SettingsPage() {
  const [profileState, formAction, isProfilePending] = React.useActionState<ProfileActionResponse, FormData>(
    updateProfileAction,
    null
  );

  // Notification Preferences State
  const [prefs, setPrefs] = useState<UserNotificationPreferences | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsNotice, setPrefsNotice] = useState<string | null>(null);

  // Password Update State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<{ type: "success" | "destructive"; msg: string } | null>(null);

  // Session State
  const [terminatingSessions, setTerminatingSessions] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  useEffect(() => {
    async function loadPreferences() {
      const res = await getNotificationPreferencesAction();
      if (res.success && res.data) {
        setPrefs(res.data);
      }
    }
    loadPreferences();
  }, []);

  const handleTogglePref = async (key: keyof Omit<UserNotificationPreferences, "userId">) => {
    if (!prefs || savingPrefs) return;
    const currentVal = prefs[key];
    const newVal = !currentVal;

    // Optimistic update
    setPrefs({ ...prefs, [key]: newVal });
    setSavingPrefs(true);
    setPrefsNotice(null);

    try {
      const res = await updateNotificationPreferencesAction({ [key]: newVal });
      if (res.success && res.data) {
        setPrefs(res.data);
        setPrefsNotice("Notification preferences updated.");
      } else {
        // Rollback
        setPrefs({ ...prefs, [key]: currentVal });
      }
    } catch {
      setPrefs({ ...prefs, [key]: currentVal });
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordNotice(null);

    if (newPassword.length < 8) {
      setPasswordNotice({ type: "destructive", msg: "Password must be at least 8 characters long." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: "destructive", msg: "Passwords do not match." });
      return;
    }

    setPasswordUpdating(true);
    try {
      const res = await updatePasswordAction(newPassword);
      if (res.success) {
        setPasswordNotice({
          type: "success",
          msg: "Your password has been successfully updated. Security alert dispatched.",
        });
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordNotice({ type: "destructive", msg: res.error || "Failed to update password." });
      }
    } catch {
      setPasswordNotice({ type: "destructive", msg: "An unexpected error occurred." });
    } finally {
      setPasswordUpdating(false);
    }
  };

  const handleSignOutAllSessions = async () => {
    setTerminatingSessions(true);
    setSessionNotice(null);
    try {
      const res = await signOutAllSessionsAction();
      if (res.success) {
        window.location.href = "/auth/login?reason=sessions_terminated";
      } else {
        setSessionNotice(res.error || "Failed to terminate other sessions.");
      }
    } catch {
      setSessionNotice("An unexpected error occurred.");
    } finally {
      setTerminatingSessions(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Account & Security Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your verified identity, security credentials, and event notifications.
        </p>
      </div>

      {/* 1. PROFILE DETAILS CARD */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Details</CardTitle>
          <CardDescription>
            Your registered identity information. Update non-sensitive fields below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profileState?.success && (
            <InlineNotice variant="success" title="Profile Updated">
              Your profile changes have been successfully saved to your account.
            </InlineNotice>
          )}

          {profileState?.error && (
            <InlineNotice variant="destructive" title="Update Failed">
              {profileState.error}
            </InlineNotice>
          )}


          <form action={formAction} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                name="firstName"
                placeholder="First Name"
                defaultValue="Musa"
                required
                leftAddon={<User className="w-4 h-4" />}
                error={profileState?.fieldErrors?.firstName}
              />
              <Input
                label="Last Name"
                name="lastName"
                placeholder="Last Name"
                defaultValue="Abubakar"
                required
                leftAddon={<User className="w-4 h-4" />}
                error={profileState?.fieldErrors?.lastName}
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
                error={profileState?.fieldErrors?.phoneNumber}
              />
              <Input
                label="State of Residence (Nigeria)"
                name="stateOfResidence"
                placeholder="Lagos State"
                defaultValue="Lagos State"
                leftAddon={<MapPin className="w-4 h-4" />}
                error={profileState?.fieldErrors?.stateOfResidence}
              />
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary" isLoading={isProfilePending}>
                {isProfilePending ? "Saving Changes..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 2. NOTIFICATION PREFERENCES CARD */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2 text-primary mb-1">
            <Bell className="w-5 h-5" />
            <CardTitle className="text-base">Notification Preferences</CardTitle>
          </div>
          <CardDescription>
            Choose which transaction and security updates you receive via in-app feeds and email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {prefsNotice && (
            <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              {prefsNotice}
            </div>
          )}

          {prefs ? (
            <div className="divide-y divide-border/60 text-xs">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">In-App Transfer Notifications</p>
                  <p className="text-muted-foreground">Receive real-time alerts when you send or receive internal transfers.</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.inAppTransferNotifications}
                  onChange={() => handleTogglePref("inAppTransferNotifications")}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                />
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">In-App Funding & Deposit Alerts</p>
                  <p className="text-muted-foreground">Get notified when NGN virtual bank credits or on-chain deposits confirm.</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.inAppFundingNotifications}
                  onChange={() => handleTogglePref("inAppFundingNotifications")}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                />
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">In-App Withdrawal Status Alerts</p>
                  <p className="text-muted-foreground">Receive notifications when outbound crypto withdrawals are broadcasted or finalized.</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.inAppWithdrawalNotifications}
                  onChange={() => handleTogglePref("inAppWithdrawalNotifications")}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                />
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">Email Security Alerts</p>
                  <p className="text-muted-foreground">Receive immediate email alerts upon password changes, new logins, or sensitive events.</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.emailSecurityAlerts}
                  onChange={() => handleTogglePref("emailSecurityAlerts")}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                />
              </div>
            </div>
          ) : (
            <div className="p-4 text-xs text-muted-foreground">Loading preferences...</div>
          )}
        </CardContent>
      </Card>

      {/* 3. PASSWORD & SECURITY CREDENTIALS CARD */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2 text-primary mb-1">
            <Lock className="w-5 h-5" />
            <CardTitle className="text-base">Change Password</CardTitle>
          </div>
          <CardDescription>
            Update your account password. Requires at least 8 characters.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {passwordNotice && (
            <InlineNotice
              variant={passwordNotice.type}
              title={passwordNotice.type === "success" ? "Success" : "Error"}
            >
              {passwordNotice.msg}
            </InlineNotice>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="New Password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                leftAddon={<Key className="w-4 h-4" />}
                id="new-password-input"
              />
              <Input
                label="Confirm New Password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                leftAddon={<Key className="w-4 h-4" />}
                id="confirm-password-input"
              />
            </div>

            <Button
              type="submit"
              disabled={passwordUpdating || !newPassword}
              id="change-password-submit-btn"
            >
              {passwordUpdating ? "Updating Password..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 4. SESSIONS & ACCESS CONTROL */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2 text-primary mb-1">
            <Shield className="w-5 h-5" />
            <CardTitle className="text-base">Active Sessions & Sign Out</CardTitle>
          </div>
          <CardDescription>
            HTTP-only SameSite=Lax cookie tokens guard your sessions against XSS attacks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionNotice && (
            <InlineNotice variant="destructive" title="Session Error">
              {sessionNotice}
            </InlineNotice>
          )}

          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">Current Session Active</h4>
                <p className="text-xs text-muted-foreground">Connected via secure HTTPS browser session.</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200">
              Active
            </Badge>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              variant="destructive"
              onClick={handleSignOutAllSessions}
              disabled={terminatingSessions}
              leftIcon={<LogOut className="w-4 h-4" />}
              id="terminate-sessions-btn"
            >
              {terminatingSessions ? "Terminating Sessions..." : "Sign Out of All Devices"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 5. COMPLIANCE & KYC STATUS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compliance & Tier Status</CardTitle>
          <CardDescription>
            Verification status conforming to Nigerian VASP & SEC ARIP regulations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground">Current Status</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Tier 1 Verified</span>
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
