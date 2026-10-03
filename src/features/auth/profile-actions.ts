"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { friendlyErrors, logError } from "@/lib/errors";

export interface ProfileFormState {
  saved?: boolean;
  error?: string;
}

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: friendlyErrors.generic };

  const displayName = String(formData.get("displayName") ?? "")
    .trim()
    .slice(0, 80);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName || null })
    .eq("id", user.id);
  if (error) {
    logError("profile.update", error);
    return { error: friendlyErrors.generic };
  }
  revalidatePath("/", "layout");
  return { saved: true };
}
