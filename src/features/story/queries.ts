import "server-only";
import { cache } from "react";
import { logError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toStorySummary, type Story } from "./types";

export const getStory = cache(async (projectId: string): Promise<Story> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_stories")
    .select("body, summary, summarized_at, updated_at")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) logError("story.get", error, { projectId });
  return {
    body: data?.body ?? "",
    summary: toStorySummary(data?.summary),
    summarizedAt: data?.summarized_at ?? null,
    updatedAt: data?.updated_at ?? null,
  };
});
