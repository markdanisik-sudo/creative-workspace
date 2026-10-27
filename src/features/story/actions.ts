"use server";

import { revalidatePath } from "next/cache";
import { logError, type ActionResult } from "@/lib/errors";
import { getI18n } from "@/lib/i18n/server";
import type { Json } from "@/lib/supabase/database.types";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { readStory, StoryAiUnavailable, type Attachment } from "./claude";
import type { StorySummary } from "./types";

/** Uploads ride in a server action body (see next.config.ts serverActions). */
const MAX_FILE_BYTES = 3_800_000;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

function refresh(projectId: string) {
  revalidatePath(`/projects/${projectId}`, "layout");
}

export async function saveStoryBody(projectId: string, body: string): Promise<ActionResult> {
  const { t } = await getI18n();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("project_stories")
    .upsert({ project_id: projectId, body: String(body ?? "").slice(0, 200_000) });
  if (error) {
    logError("story.save", error, { projectId });
    return { ok: false, error: t("errors.generic") };
  }
  refresh(projectId);
  return { ok: true, data: null };
}

/**
 * Has Claude read the story (and an optional photo or PDF of notes) and sum
 * it up. A transcript of the notes is added to the end of the text.
 */
export async function summarizeStory(
  projectId: string,
  form: FormData,
): Promise<ActionResult<{ summary: StorySummary | null; transcript: string }>> {
  const { t, locale } = await getI18n();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: t("errors.generic") };
  const supabase = await createSupabaseServerClient();

  // Only people on the project (RLS) get to spend on it.
  const [{ data: project }, { data: story }] = await Promise.all([
    supabase.from("projects").select("id").eq("id", projectId).maybeSingle(),
    supabase.from("project_stories").select("body").eq("project_id", projectId).maybeSingle(),
  ]);
  if (!project) return { ok: false, error: t("errors.generic") };
  const body = story?.body ?? "";

  let attachment: Attachment | null = null;
  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) return { ok: false, error: t("story.fileTooLarge") };
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    if (file.type === "application/pdf") attachment = { kind: "pdf", data };
    else if ((IMAGE_TYPES as readonly string[]).includes(file.type)) {
      attachment = {
        kind: "image",
        mediaType: file.type as (typeof IMAGE_TYPES)[number],
        data,
      };
    } else return { ok: false, error: t("story.fileType") };
  }
  if (!attachment && !body.trim()) return { ok: false, error: t("story.nothingToRead") };

  let reading;
  try {
    reading = await readStory({ text: body, attachment, locale });
  } catch (error) {
    if (error instanceof StoryAiUnavailable) return { ok: false, error: t("story.aiOff") };
    logError("story.read", error, { projectId });
    return { ok: false, error: t("story.readFailed") };
  }

  const transcript = attachment ? reading.transcript.trim() : "";
  const nextBody = transcript
    ? `${body.trimEnd()}${body.trim() ? "\n\n" : ""}— ${t("story.fromNotes")} —\n${transcript}`
    : body;
  const { error } = await supabase.from("project_stories").upsert({
    project_id: projectId,
    body: nextBody.slice(0, 200_000),
    summary: reading.summary as unknown as Json,
    summarized_at: new Date().toISOString(),
  });
  if (error) {
    logError("story.saveSummary", error, { projectId });
    return { ok: false, error: t("errors.generic") };
  }
  refresh(projectId);
  return { ok: true, data: { summary: reading.summary, transcript } };
}
