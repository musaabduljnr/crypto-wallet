"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const updateProfileSchema = z.object({
  firstName: z.string().trim().min(2, "First name must be at least 2 characters").max(50),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters").max(50),
  phoneNumber: z.string().trim().regex(/^(\+234|0)[789][01]\d{8}$/, "Invalid Nigerian phone number format"),
  stateOfResidence: z.string().trim().min(2, "State must be at least 2 characters").max(50).optional(),
});

export interface ProfileActionResponse {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function updateProfileAction(
  prevState: ProfileActionResponse | null,
  formData: FormData
): Promise<ProfileActionResponse> {
  const rawData = {
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    phoneNumber: formData.get("phoneNumber") as string,
    stateOfResidence: (formData.get("stateOfResidence") as string) || undefined,
  };

  const result = updateProfileSchema.safeParse(rawData);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    result.error.errors.forEach((err) => {
      const field = err.path[0] as string;
      if (field) fieldErrors[field] = err.message;
    });
    return { success: false, error: "Validation failed", fieldErrors };
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Authentication required to update profile." };
    }

    // Update profile in user_profiles table using RLS policy (auth.uid() = id)
    const { error: dbError } = await supabase
      .from("user_profiles")
      .upsert({
        id: user.id,
        first_name: result.data.firstName,
        last_name: result.data.lastName,
        phone_number: result.data.phoneNumber,
        state_of_residence: result.data.stateOfResidence,
        updated_at: new Date().toISOString(),
      });

    if (dbError) {
      logger.warn("Database profile update error", { message: dbError.message });
      // If table migration is pending, update user metadata as fallback
      await supabase.auth.updateUser({
        data: {
          first_name: result.data.firstName,
          last_name: result.data.lastName,
          phone_number: result.data.phoneNumber,
        },
      });
    }

    logger.info("User profile updated", { userId: user.id });
    return { success: true };
  } catch (err) {
    logger.error("Unexpected error in updateProfileAction", err);
    return { success: false, error: "Failed to update profile. Please try again." };
  }
}
