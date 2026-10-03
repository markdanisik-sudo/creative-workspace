"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { STORAGE_BUCKET } from "@/lib/supabase/env";
import { friendlyErrors, logError, type ActionResult } from "@/lib/errors";
import { DEFAULT_FIRST_BOARD_NAME } from "@/features/boards/templates";

const MAX_NAME_LENGTH = 120;
const STORAGE_PAGE_SIZE = 1000;

function cleanName(value: FormDataEntryValue | string | null, fallback: string) {
  const name = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, MAX_NAME_LENGTH);
  return name || fallback;
}

export interface CreateProjectState {
  error?: string;
}

/** Creates a project with a first board and opens that board straight away. */
export async function createProject(
  _prev: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const supabase = await createSupabaseServerClient();
  const name = cleanName(formData.get("name"), "Untitled Project");

  const project = await supabase.from("projects").insert({ name }).select("id").single();
  if (project.error) {
    logError("projects.create", project.error);
    return { error: friendlyErrors.generic };
  }

  const board = await supabase
    .from("boards")
    .insert({ project_id: project.data.id, name: DEFAULT_FIRST_BOARD_NAME })
    .select("id")
    .single();
  if (board.error) {
    logError("boards.createFirst", board.error);
    redirect(`/projects/${project.data.id}`);
  }

  revalidatePath("/projects");
  redirect(`/projects/${project.data.id}/boards/${board.data.id}`);
}

export async function renameProject(projectId: string, rawName: string): Promise<ActionResult> {
  const name = cleanName(rawName, "");
  if (!name) return { ok: false, error: "Give your project a name." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("projects").update({ name }).eq("id", projectId);
  if (error) {
    logError("projects.rename", error, { projectId });
    return { ok: false, error: friendlyErrors.generic };
  }
  revalidatePath("/projects", "layout");
  return { ok: true, data: null };
}

/** Lists every object under a storage folder (recursively). */
async function listStorageFolder(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = [];
  for (let offset = 0; ; offset += STORAGE_PAGE_SIZE) {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(prefix, { limit: STORAGE_PAGE_SIZE, offset });
    if (error || !data) break;
    for (const entry of data) {
      const path = `${prefix}/${entry.name}`;
      // Folders have no id.
      if (entry.id) paths.push(path);
      else paths.push(...(await listStorageFolder(supabase, path)));
    }
    if (data.length < STORAGE_PAGE_SIZE) break;
  }
  return paths;
}

export async function deleteProject(projectId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: friendlyErrors.generic };
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) {
    logError("projects.delete", error, { projectId });
    return { ok: false, error: friendlyErrors.generic };
  }

  // Best-effort storage cleanup; the rows are already gone.
  try {
    const paths = await listStorageFolder(supabase, `${user.id}/${projectId}`);
    if (paths.length > 0) await supabase.storage.from(STORAGE_BUCKET).remove(paths);
  } catch (cleanupError) {
    logError("projects.delete.storage", cleanupError, { projectId });
  }

  revalidatePath("/projects", "layout");
  return { ok: true, data: null };
}
