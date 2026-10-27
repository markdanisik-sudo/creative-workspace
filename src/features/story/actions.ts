"use server";

import { revalidatePath } from "next/cache";
import { logError, type ActionResult } from "@/lib/errors";
import { getI18n } from "@/lib/i18n/server";
import type { Json } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toBlocks } from "./types";

/** Saves the whole script (scenes, action, dialogue) as it stands. */
export async function saveScript(projectId: string, blocks: unknown): Promise<ActionResult> {
  const { t } = await getI18n();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("project_stories")
    .upsert({ project_id: projectId, blocks: toBlocks(blocks) as unknown as Json[] });
  if (error) {
    logError("story.save", error, { projectId });
    return { ok: false, error: t("errors.generic") };
  }
  revalidatePath(`/projects/${projectId}`, "layout");
  return { ok: true, data: null };
}
