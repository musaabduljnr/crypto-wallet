import React from "react";
import { requireStaffPermission } from "@/lib/admin/auth";
import { getPlatformSettings } from "@/lib/admin/settings";
import { SettingsClient } from "./settings-client";
import { hasPermission } from "@/lib/admin/permissions";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const staff = await requireStaffPermission("settings.manage");
  const settings = await getPlatformSettings();
  const canManage = hasPermission(staff.role, "settings.manage");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Operational Platform Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure global system parameters, withdrawal hold policies, and maintenance states.
        </p>
      </div>

      <SettingsClient settings={settings} canManage={canManage} />
    </div>
  );
}
