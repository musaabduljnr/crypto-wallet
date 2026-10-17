"use client";

import React, { useState } from "react";
import { PlatformSettingRecord } from "@/lib/admin/settings";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InlineNotice } from "@/components/feedback/inline-notice";
import { updatePlatformSettingsAction } from "@/actions/admin.actions";
import {
  Sliders,
  ShieldAlert,
  Clock,
  Save,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
} from "lucide-react";

export function SettingsClient({
  settings: initialSettings,
  canManage,
}: {
  settings: PlatformSettingRecord[];
  canManage: boolean;
}) {
  const [settings, setSettings] = useState<PlatformSettingRecord[]>(initialSettings);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Maintenance mode state
  const maintSetting = settings.find((s) => s.key === "maintenance_mode");
  const [maintEnabled, setMaintEnabled] = useState<boolean>(
    Boolean((maintSetting?.value as any)?.enabled)
  );
  const [maintReason, setMaintReason] = useState<string>(
    String((maintSetting?.value as any)?.reason || "")
  );

  // Cooling off period state
  const coolingSetting = settings.find((s) => s.key === "cooling_off_period_hours");
  const [coolingHours, setCoolingHours] = useState<string>(
    String((coolingSetting?.value as any)?.hours || "72")
  );

  // Daily limits state
  const limitsSetting = settings.find((s) => s.key === "daily_withdrawal_limit_usd");
  const [tier1Limit, setTier1Limit] = useState<string>(
    String((limitsSetting?.value as any)?.tier1 || "50000")
  );
  const [tier2Limit, setTier2Limit] = useState<string>(
    String((limitsSetting?.value as any)?.tier2 || "250000")
  );
  const [tier3Limit, setTier3Limit] = useState<string>(
    String((limitsSetting?.value as any)?.tier3 || "1000000")
  );

  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKey("maintenance_mode");
    setNotice(null);

    const res = await updatePlatformSettingsAction({
      key: "maintenance_mode",
      value: { enabled: maintEnabled, reason: maintReason },
      description: "Global platform maintenance toggle",
    });

    setSavingKey(null);
    if (res.success) {
      setNotice({ type: "success", text: "Maintenance mode settings updated successfully." });
    } else {
      setNotice({ type: "error", text: res.error || "Failed to update maintenance settings." });
    }
  };

  const handleSaveCooling = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKey("cooling_off_period_hours");
    setNotice(null);

    const hours = parseInt(coolingHours, 10);
    if (isNaN(hours) || hours < 0) {
      setNotice({ type: "error", text: "Cooling-off duration must be a valid number of hours." });
      setSavingKey(null);
      return;
    }

    const res = await updatePlatformSettingsAction({
      key: "cooling_off_period_hours",
      value: { hours },
      description: "New device withdrawal cooling off duration in hours",
    });

    setSavingKey(null);
    if (res.success) {
      setNotice({ type: "success", text: "New device cooling-off duration updated successfully." });
    } else {
      setNotice({ type: "error", text: res.error || "Failed to update cooling off period." });
    }
  };

  const handleSaveLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKey("daily_withdrawal_limit_usd");
    setNotice(null);

    const t1 = parseFloat(tier1Limit);
    const t2 = parseFloat(tier2Limit);
    const t3 = parseFloat(tier3Limit);

    if (isNaN(t1) || isNaN(t2) || isNaN(t3)) {
      setNotice({ type: "error", text: "Withdrawal limits must be valid monetary amounts." });
      setSavingKey(null);
      return;
    }

    const res = await updatePlatformSettingsAction({
      key: "daily_withdrawal_limit_usd",
      value: { tier1: t1, tier2: t2, tier3: t3 },
      description: "Maximum daily crypto withdrawal limits by KYC tier",
    });

    setSavingKey(null);
    if (res.success) {
      setNotice({ type: "success", text: "Tiered daily withdrawal limits updated successfully." });
    } else {
      setNotice({ type: "error", text: res.error || "Failed to update withdrawal limits." });
    }
  };

  return (
    <div className="space-y-6">
      {notice && (
        <InlineNotice variant={notice.type === "success" ? "success" : "destructive"}>
          {notice.text}
        </InlineNotice>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Maintenance Mode */}
        <Card className="border-border/60 bg-card/40">
          <CardHeader className="py-4 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              <span>Platform Maintenance Mode</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <form onSubmit={handleSaveMaintenance} className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-background/50">
                <div>
                  <p className="font-semibold text-foreground">Maintenance Status</p>
                  <p className="text-muted-foreground text-[11px]">
                    When active, customer deposits, transfers, and trades are held in safe queue.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={maintEnabled}
                    onChange={(e) => setMaintEnabled(e.target.checked)}
                    disabled={!canManage || savingKey === "maintenance_mode"}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-muted peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">Public Maintenance Notice:</label>
                <input
                  type="text"
                  value={maintReason}
                  onChange={(e) => setMaintReason(e.target.value)}
                  placeholder="e.g. Scheduled ledger database optimization in progress..."
                  disabled={!canManage || savingKey === "maintenance_mode"}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden"
                />
              </div>

              {canManage && (
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={savingKey === "maintenance_mode"}
                    className="text-xs"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {savingKey === "maintenance_mode" ? "Saving..." : "Save Maintenance"}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Security Cooling Off Period */}
        <Card className="border-border/60 bg-card/40">
          <CardHeader className="py-4 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>New Device Security Cooling-Off</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <form onSubmit={handleSaveCooling} className="space-y-4 text-xs">
              <p className="text-muted-foreground text-[11px]">
                Enforces a mandatory withdrawal hold when a customer signs in from an unrecognized device or IP subnet, mitigating unauthorized session hijacking.
              </p>

              <div>
                <label className="block text-muted-foreground mb-1">Cooling-Off Window (Hours):</label>
                <Input
                  type="number"
                  min="0"
                  max="720"
                  value={coolingHours}
                  onChange={(e) => setCoolingHours(e.target.value)}
                  disabled={!canManage || savingKey === "cooling_off_period_hours"}
                  className="w-full text-xs"
                />
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Current policy: 72 hours (3 business days) hold on external withdrawals.
                </span>
              </div>

              {canManage && (
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={savingKey === "cooling_off_period_hours"}
                    className="text-xs"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {savingKey === "cooling_off_period_hours" ? "Saving..." : "Save Cooling Policy"}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Tiered Daily Withdrawal Limits */}
        <Card className="border-border/60 bg-card/40 md:col-span-2">
          <CardHeader className="py-4 border-b border-border/40">
            <CardTitle className="text-sm font-semibold flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span>Maximum Daily External Withdrawal Limits (USD Equivalent)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <form onSubmit={handleSaveLimits} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 rounded-xl border border-border/40 bg-background/50 space-y-2">
                  <Badge variant="outline" className="text-[10px] font-mono">KYC Tier 1</Badge>
                  <label className="block text-muted-foreground text-[11px]">Max 24h Outflow ($):</label>
                  <Input
                    type="number"
                    value={tier1Limit}
                    onChange={(e) => setTier1Limit(e.target.value)}
                    disabled={!canManage || savingKey === "daily_withdrawal_limit_usd"}
                    className="text-xs font-mono"
                  />
                </div>

                <div className="p-3 rounded-xl border border-border/40 bg-background/50 space-y-2">
                  <Badge variant="outline" className="text-[10px] font-mono">KYC Tier 2</Badge>
                  <label className="block text-muted-foreground text-[11px]">Max 24h Outflow ($):</label>
                  <Input
                    type="number"
                    value={tier2Limit}
                    onChange={(e) => setTier2Limit(e.target.value)}
                    disabled={!canManage || savingKey === "daily_withdrawal_limit_usd"}
                    className="text-xs font-mono"
                  />
                </div>

                <div className="p-3 rounded-xl border border-border/40 bg-background/50 space-y-2">
                  <Badge variant="outline" className="text-[10px] font-mono">KYC Tier 3 (Institutional)</Badge>
                  <label className="block text-muted-foreground text-[11px]">Max 24h Outflow ($):</label>
                  <Input
                    type="number"
                    value={tier3Limit}
                    onChange={(e) => setTier3Limit(e.target.value)}
                    disabled={!canManage || savingKey === "daily_withdrawal_limit_usd"}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              {canManage && (
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={savingKey === "daily_withdrawal_limit_usd"}
                    className="text-xs"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {savingKey === "daily_withdrawal_limit_usd" ? "Saving..." : "Save Daily Limits"}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
