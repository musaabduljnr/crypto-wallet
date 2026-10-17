"use server";

import { createClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema, resetPasswordSchema, updatePasswordSchema } from "@/lib/validation/auth";
import { sanitizeReturnUrl } from "@/lib/utils/redirects";
import { logger } from "@/lib/logger";

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function loginAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse<{ redirectUrl: string }>> {
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
    return { success: false, error: "Please correct the errors below.", fieldErrors };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: result.data.email,
      password: result.data.password,
    });

    if (error) {
      logger.warn("Authentication failure", { email: result.data.email, message: error.message });
      // Generic error message to prevent user enumeration
      return { success: false, error: "Invalid email or password. Please try again." };
    }

    logger.info("User signed in successfully", { userId: data.user.id });

    // If authenticating user is active staff and no custom returnUrl specified, route directly to /admin
    const { checkIsStaff } = await import("@/lib/admin/auth");
    const { isStaff } = await checkIsStaff(data.user.id);
    const defaultDestination = isStaff ? "/admin" : "/dashboard";

    const redirectUrl = sanitizeReturnUrl(rawReturnUrl, defaultDestination);
    return { success: true, data: { redirectUrl } };
  } catch (err) {
    logger.error("Unexpected error in loginAction", err);
    return { success: false, error: "An unexpected error occurred. Please try again later." };
  }
}

export async function registerAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse<{ requiresVerification: boolean }>> {
  const rawData = {
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    email: formData.get("email") as string,
    phoneNumber: formData.get("phoneNumber") as string,
    password: formData.get("password") as string,
    termsAccepted: formData.get("termsAccepted") === "on" || formData.get("termsAccepted") === "true",
  };

  const result = registerSchema.safeParse(rawData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    result.error.errors.forEach((err) => {
      const field = err.path[0] as string;
      if (field) fieldErrors[field] = err.message;
    });
    return { success: false, error: "Please correct the errors in the form.", fieldErrors };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        data: {
          first_name: result.data.firstName,
          last_name: result.data.lastName,
          phone_number: result.data.phoneNumber,
        },
      },
    });

    if (error) {
      logger.warn("Registration rejected by provider", { message: error.message });
      return { success: false, error: error.message };
    }

    logger.info("User registered successfully", { userId: data.user?.id });
    const requiresVerification = !data.session;
    return { success: true, data: { requiresVerification } };
  } catch (err) {
    logger.error("Unexpected error in registerAction", err);
    return { success: false, error: "Failed to create account. Please try again later." };
  }
}

export async function logoutAction(): Promise<ActionResponse> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    logger.info("User signed out");
    return { success: true };
  } catch (err) {
    logger.error("Error during signOut", err);
    return { success: false, error: "Sign out failed" };
  }
}

export async function resetPasswordAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const rawEmail = formData.get("email") as string;
  const result = resetPasswordSchema.safeParse({ email: rawEmail });

  if (!result.success) {
    return { success: false, error: result.error.errors[0]?.message || "Invalid email" };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(result.data.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/update-password`,
    });

    if (error) {
      logger.warn("Password reset dispatch error", { message: error.message });
      // Return success anyway to avoid email enumeration
    }

    return { success: true };
  } catch (err) {
    logger.error("Unexpected error in resetPasswordAction", err);
    return { success: true }; // Prevent timing attack / enumeration
  }
}

export async function updatePasswordAction(
  prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  const result = updatePasswordSchema.safeParse({ password, confirmPassword });

  if (!result.success) {
    return { success: false, error: result.error.errors[0]?.message || "Invalid password" };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password: result.data.password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    logger.info("Password updated successfully");
    return { success: true };
  } catch (err) {
    logger.error("Unexpected error in updatePasswordAction", err);
    return { success: false, error: "Failed to update password." };
  }
}
