"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { STORAGE_BUCKET } from "@/lib/supabase/env";
import { logError, type ActionResult } from "@/lib/errors";
import { isBoardTemplateId, templateBoardName, templateName } from "@/features/boards/templates";
import { requireViewer } from "@/features/auth/session";
import {
  customDefaults,
  findTemplate,
  isMedium,
  isPlanModuleId,
  LIST_MODULE_IDS,
  localizeSeed,
  stepsFor,
  type PlanModuleId,
} from "@/features/workspace/plan";
import { getI18n } from "@/lib/i18n/server";

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

/**
 * Creates a project with a first board and opens that board straight away.
 * An optional `template` field seeds that board with starter content.
 */
export async function createProject(
  _prev: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const { t, locale } = await getI18n();
  const supabase = await createSupabaseServerClient();
  const template = formData.get("template");
  const useTemplate = isBoardTemplateId(template) && template !== "blank";
  // Started from a template without a name: call it after the template.
  const name = cleanName(
    formData.get("name"),
    useTemplate ? templateName(template, t) : t("project.untitled"),
  );
  const viewer = await requireViewer();
  // A project a client starts is labelled with their name for the studio.
  const clientName =
    cleanName(formData.get("client"), "") || (viewer.isStudio ? null : viewer.displayName);

  const project = await supabase
    .from("projects")
    .insert({ name, client_name: clientName })
    .select("id")
    .single();
  if (project.error) {
    logError("projects.create", project.error);
    return { error: t("errors.generic") };
  }

  // The Plan: photo / video / both, from a template or a custom pick of boxes.
  const planTemplate = findTemplate(formData.get("planTemplate"));
  const mediumValue = formData.get("medium");
  const medium = planTemplate?.medium ?? (isMedium(mediumValue) ? mediumValue : "video");
  const picked = formData.getAll("modules").filter(isPlanModuleId) as PlanModuleId[];
  const modules = planTemplate?.modules ?? (picked.length > 0 ? picked : customDefaults(medium));
  const workspace = await supabase.from("project_workspaces").upsert(
    {
      project_id: project.data.id,
      medium,
      template: planTemplate?.id ?? "custom",
      modules,
    },
    { onConflict: "project_id" },
  );
  if (workspace.error) logError("projects.createWorkspace", workspace.error);

  // Starter rows the template brings (interview questions, deliverables…).
  if (planTemplate) {
    const rows = LIST_MODULE_IDS.flatMap((module) =>
      (planTemplate.seeds[module] ?? []).map((seed, index) => ({
        project_id: project.data.id,
        module,
        position: index + 1,
        data: localizeSeed(seed, locale),
        created_by: viewer.id,
      })),
    );
    if (rows.length > 0) {
      const seeded = await supabase.from("plan_items").insert(rows);
      if (seeded.error) logError("projects.seedPlan", seeded.error);
    }
  }

  // The checklist on the Overview, suited to the kind of work.
  const steps = await supabase.from("project_tasks").insert(
    stepsFor(medium, planTemplate).map((step, index) => ({
      project_id: project.data.id,
      phase: step.phase,
      title: t(step.key),
      position: index + 1,
      created_by: viewer.id,
    })),
  );
  if (steps.error) logError("projects.createSteps", steps.error);

  const board = await supabase
    .from("boards")
    .insert({
      project_id: project.data.id,
      name: useTemplate ? templateBoardName(template, t) : t("board.firstBoardName"),
      template: useTemplate ? template : null,
    })
    .select("id")
    .single();
  if (board.error) {
    logError("boards.createFirst", board.error);
    redirect(`/projects/${project.data.id}`);
  }

  revalidatePath("/projects");
  // Starting from a template opens that board; a plain new job opens its hub.
  redirect(
    useTemplate
      ? `/projects/${project.data.id}/boards/${board.data.id}`
      : `/projects/${project.data.id}`,
  );
}

export async function renameProject(projectId: string, rawName: string): Promise<ActionResult> {
  const { t } = await getI18n();
  const name = cleanName(rawName, "");
  if (!name) return { ok: false, error: t("project.nameRequired") };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("projects").update({ name }).eq("id", projectId);
  if (error) {
    logError("projects.rename", error, { projectId });
    return { ok: false, error: t("errors.generic") };
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
  const { t } = await getI18n();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: t("errors.generic") };
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) {
    logError("projects.delete", error, { projectId });
    return { ok: false, error: t("errors.generic") };
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
