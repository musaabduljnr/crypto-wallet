"use server";

import { createServerClient } from "@/lib/supabase/server";
import { notificationService, UserNotificationPreferences } from "@/lib/services/notification.service";
import { AppError } from "@/lib/errors";

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function getAuthenticatedUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AppError("Authentication required", "UNAUTHENTICATED", 401);
  }
  return user;
}

/**
 * Retrieves the user's notification preferences.
 */
export async function getNotificationPreferencesAction(): Promise<ActionResponse<UserNotificationPreferences>> {
  try {
    const user = await getAuthenticatedUser();
    const prefs = await notificationService.getPreferences(user.id);
    return { success: true, data: prefs };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load preferences" };
  }
}

/**
 * Updates the user's notification preferences.
 */
export async function updateNotificationPreferencesAction(
  updates: Partial<Omit<UserNotificationPreferences, "userId">>
): Promise<ActionResponse<UserNotificationPreferences>> {
  try {
    const user = await getAuthenticatedUser();
    const updated = await notificationService.updatePreferences(user.id, updates);
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update notification preferences" };
  }
}

/**
 * Updates the user's password using the authoritative Supabase Auth provider.
 */
export async function updatePasswordAction(
  newPassword: string
): Promise<ActionResponse<boolean>> {
  try {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: "Password must be at least 8 characters long" };
    }

    const user = await getAuthenticatedUser();
    const supabase = await createServerClient();

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Record security alert notification
    await notificationService.createNotification({
      userId: user.id,
      title: "Security Alert: Password Updated",
      message: "Your account password was successfully updated. If you did not initiate this change, contact security immediately.",
      type: "SECURITY_ALERT",
      idempotencyKey: `pwd-upd-${Date.now()}`,
    });

    return { success: true, data: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update password" };
  }
}

/**
 * Terminates all sessions across devices by calling Supabase Auth sign-out.
 */
export async function signOutAllSessionsAction(): Promise<ActionResponse<boolean>> {
  try {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to sign out from all devices" };
  }
}
