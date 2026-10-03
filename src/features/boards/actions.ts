"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { friendlyErrors, logError, type ActionResult } from "@/lib/errors";
import { isBoardTemplateId, templateBoardName } from "./templates";

const MAX_NAME_LENGTH = 120;

export async function createBoard(projectId: string, templateId: string): Promise<ActionResult> {
  if (!isBoardTemplateId(templateId)) return { ok: false, error: friendlyErrors.generic };
  const supabase = await createSupabaseServerClient();

  const { count } = await supabase
    .from("boards")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { data, error } = await supabase
    .from("boards")
    .insert({
      project_id: projectId,
      name: templateBoardName(templateId),
      template: templateId === "blank" ? null : templateId,
      position: count ?? 0,
    })
    .select("id")
    .single();

  if (error) {
    logError("boards.create", error, { projectId, templateId });
    return { ok: false, error: friendlyErrors.generic };
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}/boards/${data.id}`);
}

export async function renameBoard(boardId: string, rawName: string): Promise<ActionResult> {
  const name = rawName.trim().replace(/\s+/g, " ").slice(0, MAX_NAME_LENGTH);
  if (!name) return { ok: false, error: "Give your board a name." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("boards")
    .update({ name })
    .eq("id", boardId)
    .select("project_id")
    .single();
  if (error) {
    logError("boards.rename", error, { boardId });
    return { ok: false, error: friendlyErrors.generic };
  }
  revalidatePath(`/projects/${data.project_id}`, "layout");
  return { ok: true, data: null };
}

export async function deleteBoard(boardId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("boards")
    .delete()
    .eq("id", boardId)
    .select("project_id")
    .single();
  if (error) {
    logError("boards.delete", error, { boardId });
    return { ok: false, error: friendlyErrors.generic };
  }
  revalidatePath(`/projects/${data.project_id}`, "layout");
  return { ok: true, data: null };
}
