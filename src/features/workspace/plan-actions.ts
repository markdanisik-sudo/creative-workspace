"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "@/features/auth/session";
import { logError, type ActionResult } from "@/lib/errors";
import { getI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isListModuleId,
  isPlanModuleId,
  LIST_MODULES,
  OPTION_SETS,
  RAW_OPTIONS,
  type ItemData,
  type ListModuleId,
  type PlanModuleId,
} from "./plan";

const MAX_TEXT = 2000;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function fail(context: string, error: unknown, extra?: Record<string, unknown>) {
  const { t } = await getI18n();
  logError(context, error, extra);
  return { ok: false, error: t("errors.generic") } as const;
}

function refresh(projectId: string) {
  revalidatePath(`/projects/${projectId}`, "layout");
}

/** Keeps only the box's own fields, each in its allowed shape. */
function cleanItemData(module: ListModuleId, input: unknown): ItemData {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const data: ItemData = {};
  for (const field of LIST_MODULES[module].fields) {
    const value = raw[field.key];
    if (value === undefined || value === null || value === "") continue;
    switch (field.kind) {
      case "number": {
        const number = Number(String(value).replace(",", "."));
        if (Number.isFinite(number) && number >= 0 && number < 1e6) data[field.key] = number;
        break;
      }
      case "date":
        if (typeof value === "string" && DATE.test(value)) data[field.key] = value;
        break;
      case "select":
        if ((OPTION_SETS[field.options] as readonly string[]).includes(String(value))) {
          data[field.key] = String(value);
        }
        break;
      case "raw":
        if ((RAW_OPTIONS[field.options] as readonly string[]).includes(String(value))) {
          data[field.key] = String(value);
        }
        break;
      default: {
        const text = String(value).trim().slice(0, MAX_TEXT);
        if (text) data[field.key] = text;
      }
    }
  }
  return data;
}

/** Adds a row to a list box (id null) or updates one. */
export async function savePlanItem(
  projectId: string,
  module: string,
  id: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const { t } = await getI18n();
  if (!isListModuleId(module)) return { ok: false, error: t("errors.generic") };
  const data = cleanItemData(module, input);
  if (!data[LIST_MODULES[module].title]) return { ok: false, error: t("boxes.titleRequired") };
  const supabase = await createSupabaseServerClient();

  if (id) {
    const { error } = await supabase
      .from("plan_items")
      .update({ data })
      .eq("id", id)
      .eq("project_id", projectId);
    if (error) return fail("plan.updateItem", error, { projectId });
    refresh(projectId);
    return { ok: true, data: { id } };
  }

  const { data: last } = await supabase
    .from("plan_items")
    .select("position")
    .eq("project_id", projectId)
    .eq("module", module)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const viewer = await requireViewer();
  const { data: row, error } = await supabase
    .from("plan_items")
    .insert({
      project_id: projectId,
      module,
      data,
      position: (last?.position ?? 0) + 1,
      created_by: viewer.id,
    })
    .select("id")
    .single();
  if (error || !row) return fail("plan.addItem", error, { projectId });
  refresh(projectId);
  return { ok: true, data: { id: row.id } };
}

export async function setPlanItemDone(
  projectId: string,
  id: string,
  done: boolean,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("plan_items")
    .update({ done })
    .eq("id", id)
    .eq("project_id", projectId);
  if (error) return fail("plan.toggleItem", error, { projectId });
  refresh(projectId);
  return { ok: true, data: null };
}

export async function deletePlanItem(projectId: string, id: string): Promise<ActionResult> {
  const { t } = await getI18n();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("plan_items")
    .delete()
    .eq("id", id)
    .eq("project_id", projectId)
    .select("id");
  if (error) return fail("plan.deleteItem", error, { projectId });
  if (!data?.length) return { ok: false, error: t("boxes.cantDelete") };
  refresh(projectId);
  return { ok: true, data: null };
}

/** Which boxes the Plan shows. The studio, or the client who started the project. */
export async function savePlanModules(projectId: string, modules: string[]): Promise<ActionResult> {
  const { t } = await getI18n();
  const viewer = await requireViewer();
  const supabase = await createSupabaseServerClient();
  if (!viewer.isStudio) {
    const { data: project } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", projectId)
      .maybeSingle();
    if (project?.owner_id !== viewer.id) return { ok: false, error: t("boxes.cantEdit") };
  }
  const chosen = [...new Set(modules.filter(isPlanModuleId))] as PlanModuleId[];
  if (chosen.length === 0) return { ok: false, error: t("boxes.pickOne") };
  const { error } = await supabase
    .from("project_workspaces")
    .upsert({ project_id: projectId, modules: chosen }, { onConflict: "project_id" });
  if (error) return fail("plan.saveModules", error, { projectId });
  refresh(projectId);
  return { ok: true, data: null };
}
