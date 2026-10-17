"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation/auth";
import { sanitizeReturnUrl } from "@/lib/utils/redirects";
import { logger } from "@/lib/logger";
import { recordAdminAuditLog } from "@/lib/admin/audit";
import { StaffRole } from "@/lib/admin/permissions";

export interface AdminLoginResponse {
  success: boolean;
  redirectUrl?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Dedicated authentication server action for administrative staff and Super Admins.
 * Strictly verifies credentials against Supabase Auth AND confirms active staff
 * membership in staff_users before issuing console clearance.
 */
export async function adminLoginAction(
  prevState: AdminLoginResponse | null,
  formData: FormData
): Promise<AdminLoginResponse> {
  const rawEmail = formData.get("email") as string;
  const rawPassword = formData.get("password") as string;
  const rawReturnUrl = formData.get("returnUrl") as string;

  const result = loginSchema.safeParse({
    email: rawEmail,
    password: rawPassword,
  });

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    result.error.errors.forEach((err) => {
      const field = err.path[0] as string;
      if (field) fieldErrors[field] = err.message;
    });
    return { success: false, error: "Please enter valid administrative credentials.", fieldErrors };
  }

  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });

    if (authError || !authData.user) {
      logger.warn("Admin portal signin failed", { email: result.data.email, message: authError?.message });
      return { success: false, error: "Invalid administrative credentials or session denied." };
    }

    const userId = authData.user.id;

    // Verify staff membership using service role to bypass RLS recursion
    const adminSupabase = createAdminClient();
    const { data: staff, error: staffError } = await adminSupabase
      .from("staff_users")
      .select("role, is_active")
      .eq("id", userId)
      .maybeSingle();

    if (staffError || !staff || !staff.is_active) {
      logger.warn("Unauthorized administrative login attempt", { email: result.data.email, userId });
      // Immediately terminate the session so normal users cannot linger
      await supabase.auth.signOut();
      return {
        success: false,
        error: "Access Denied: This account is not registered as an active Apex Administrator or Operations Staff.",
      };
    }

    // Record login audit event
    await recordAdminAuditLog({
      actorId: userId,
      actorEmail: authData.user.email || result.data.email,
      actorRole: staff.role as StaffRole,
      actionType: "STAFF_PORTAL_LOGIN",
      targetEntityType: "STAFF_USER",
      targetEntityId: userId,
      details: { role: staff.role },
      status: "SUCCESS",
    });

    const destination = sanitizeReturnUrl(rawReturnUrl, "/admin");
    return { success: true, redirectUrl: destination };
  } catch (err: unknown) {
    logger.error("Unexpected error during admin authentication", { err });
    return { success: false, error: "An unexpected error occurred during administrative verification." };
  }
}
