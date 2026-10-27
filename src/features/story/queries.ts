import "server-only";
import { cache } from "react";
import { logError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toBlocks, type Story } from "./types";

export const getStory = cache(async (projectId: string): Promise<Story> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_stories")
    .select("blocks, updated_at")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) logError("story.get", error, { projectId });
  return { blocks: toBlocks(data?.blocks), updatedAt: data?.updated_at ?? null };
});
