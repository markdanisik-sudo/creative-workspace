"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";
import { getI18n } from "@/lib/i18n/server";

export interface ProfileFormState {
  saved?: boolean;
  error?: string;
}

export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const { t } = await getI18n();
  const user = await getCurrentUser();
  if (!user) return { error: t("errors.generic") };

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
    return { error: t("errors.generic") };
  }
  revalidatePath("/", "layout");
  return { saved: true };
}
