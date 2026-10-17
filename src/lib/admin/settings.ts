import { createServerClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { recordAdminAuditLog } from "./audit";
import { AuthenticatedStaff } from "./auth";

export interface PlatformSettingRecord {
  key: string;
  value: Record<string, unknown>;
  description: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

/**
 * Returns all platform operational settings.
 */
export async function getPlatformSettings(): Promise<PlatformSettingRecord[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("*")
    .order("key", { ascending: true });

  if (error || !data) return [];

  return data.map((d: any) => ({
    key: d.key,
    value: d.value,
    description: d.description,
    updatedBy: d.updated_by,
    updatedAt: d.updated_at,
  }));
}

/**
 * Updates a platform setting safely with audit logging.
 */
export async function updatePlatformSetting(
  staff: AuthenticatedStaff,
  key: string,
  value: Record<string, unknown>
): Promise<PlatformSettingRecord> {
  const supabase = await createServerClient();

  const { data: existing, error: findErr } = await supabase
    .from("platform_settings")
    .select("*")
    .eq("key", key)
    .maybeSingle();

  if (findErr || !existing) {
    throw new AppError("Setting not found", "NOT_FOUND", 404);
  }

  const { data: updated, error: updateErr } = await supabase
    .from("platform_settings")
    .update({
      value,
      updated_by: staff.id,
      updated_at: new Date().toISOString(),
    })
    .eq("key", key)
    .select()
    .single();

  if (updateErr || !updated) {
    throw new AppError(`Failed to update setting: ${updateErr?.message}`, "UPDATE_FAILED", 500);
  }

  await recordAdminAuditLog({
    actorId: staff.id,
    actorEmail: staff.email,
    actorRole: staff.role,
    actionType: "SETTING_UPDATED",
    targetEntityType: "PLATFORM_SETTING",
    targetEntityId: key,
    details: {
      key,
      oldValue: existing.value,
      newValue: value,
    },
    status: "SUCCESS",
  });

  return {
    key: updated.key,
    value: updated.value,
    description: updated.description,
    updatedBy: updated.updated_by,
    updatedAt: updated.updated_at,
  };
}
