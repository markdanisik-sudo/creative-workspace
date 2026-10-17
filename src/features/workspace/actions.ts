"use server";

import { revalidatePath } from "next/cache";
import { logError, type ActionResult } from "@/lib/errors";
import { getI18n } from "@/lib/i18n/server";
import { STORAGE_BUCKET } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/supabase/database.types";
import { cleanPalette } from "./palettes";
import {
  BRIEF_FIELDS,
  DAY_NIGHT,
  INT_EXT,
  LOCATION_STATUSES,
  type Brief,
  type Shot,
  type ShotSpecs,
} from "./types";

const MAX_TEXT = 5000;
const MAX_SPEC = 120;

function clean(value: unknown, max: number): string {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function cleanOptional(value: unknown, max: number): string | null {
  return clean(value, max) || null;
}

function cleanSpecs(specs: ShotSpecs): Record<string, string> {
  return Object.fromEntries(
    Object.entries(specs)
      .slice(0, 40)
      .flatMap(([key, value]) => {
        const text = clean(value, MAX_SPEC);
        return /^[a-z][a-zA-Z]{0,30}$/.test(key) && text ? [[key, text]] : [];
      }),
  );
}

async function fail(context: string, error: unknown, extra?: Record<string, unknown>) {
  const { t } = await getI18n();
  logError(context, error, extra);
  return { ok: false, error: t("errors.generic") } as const;
}

function refresh(projectId: string) {
  revalidatePath(`/projects/${projectId}`, "layout");
}

/* ------------------------------------------------------------------------ */
/* Brief and project camera setup                                            */
/* ------------------------------------------------------------------------ */

export async function saveBrief(projectId: string, brief: Brief): Promise<ActionResult> {
  const content = Object.fromEntries(
    BRIEF_FIELDS.flatMap((field) => {
      const text = clean(brief[field], MAX_TEXT);
      return text ? [[field, text]] : [];
    }),
  );
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("project_workspaces")
    .upsert({ project_id: projectId, brief: content }, { onConflict: "project_id" });
  if (error) return fail("workspace.saveBrief", error, { projectId });
  refresh(projectId);
  return { ok: true, data: null };
}

export async function savePalette(projectId: string, palette: unknown): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("project_workspaces")
    .upsert(
      { project_id: projectId, palette: cleanPalette(palette) as never },
      { onConflict: "project_id" },
    );
  if (error) return fail("workspace.savePalette", error, { projectId });
  refresh(projectId);
  return { ok: true, data: null };
}

export async function saveShotDefaults(projectId: string, specs: ShotSpecs): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("project_workspaces")
    .upsert(
      { project_id: projectId, shot_defaults: cleanSpecs(specs) },
      { onConflict: "project_id" },
    );
  if (error) return fail("workspace.saveShotDefaults", error, { projectId });
  refresh(projectId);
  return { ok: true, data: null };
}

/* ------------------------------------------------------------------------ */
/* Shots                                                                     */
/* ------------------------------------------------------------------------ */

export async function createShot(
  projectId: string,
  position: number,
  copyFrom?: Partial<Shot>,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("shots")
    .insert({
      project_id: projectId,
      position,
      scene: cleanOptional(copyFrom?.scene, 40),
      description: cleanOptional(copyFrom?.description, 2000),
      int_ext: copyFrom?.intExt ?? null,
      day_night: copyFrom?.dayNight ?? null,
      location_id: copyFrom?.locationId ?? null,
      duration_seconds: copyFrom?.durationSeconds ?? null,
      specs: cleanSpecs(copyFrom?.specs ?? {}),
      notes: cleanOptional(copyFrom?.notes, MAX_TEXT),
    })
    .select("id")
    .single();
  if (error) return fail("workspace.createShot", error, { projectId });
  refresh(projectId);
  return { ok: true, data: { id: data.id } };
}

export async function updateShot(
  projectId: string,
  shotId: string,
  patch: Partial<Omit<Shot, "id">>,
): Promise<ActionResult> {
  const update: TablesUpdate<"shots"> = {};
  if (patch.scene !== undefined) update.scene = cleanOptional(patch.scene, 40);
  if (patch.description !== undefined) update.description = cleanOptional(patch.description, 2000);
  if (patch.notes !== undefined) update.notes = cleanOptional(patch.notes, MAX_TEXT);
  if (patch.intExt !== undefined)
    update.int_ext = INT_EXT.find((value) => value === patch.intExt) ?? null;
  if (patch.dayNight !== undefined)
    update.day_night = DAY_NIGHT.find((value) => value === patch.dayNight) ?? null;
  if (patch.locationId !== undefined) update.location_id = patch.locationId || null;
  if (patch.durationSeconds !== undefined) {
    const seconds = Number(patch.durationSeconds);
    update.duration_seconds =
      patch.durationSeconds === null || !Number.isFinite(seconds)
        ? null
        : Math.min(86400, Math.max(0, Math.round(seconds)));
  }
  if (patch.specs !== undefined) update.specs = cleanSpecs(patch.specs);
  if (patch.done !== undefined) update.done = Boolean(patch.done);
  if (patch.position !== undefined && Number.isFinite(patch.position))
    update.position = patch.position;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("shots").update(update).eq("id", shotId);
  if (error) return fail("workspace.updateShot", error, { shotId });
  refresh(projectId);
  return { ok: true, data: null };
}

export async function deleteShot(projectId: string, shotId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("shots").delete().eq("id", shotId);
  if (error) return fail("workspace.deleteShot", error, { shotId });
  refresh(projectId);
  return { ok: true, data: null };
}

/* ------------------------------------------------------------------------ */
/* Locations                                                                 */
/* ------------------------------------------------------------------------ */

export interface LocationInput {
  name: string;
  address: string;
  contact: string;
  notes: string;
  status: string;
}

function locationRow(input: LocationInput) {
  return {
    name: clean(input.name, 200),
    address: cleanOptional(input.address, 500),
    contact: cleanOptional(input.contact, 500),
    notes: cleanOptional(input.notes, MAX_TEXT),
    status: LOCATION_STATUSES.find((status) => status === input.status) ?? "idea",
  };
}

export async function saveLocation(
  projectId: string,
  locationId: string | null,
  input: LocationInput,
): Promise<ActionResult<{ id: string }>> {
  const row = locationRow(input);
  if (!row.name) return fail("workspace.saveLocation", "empty name");
  const supabase = await createSupabaseServerClient();
  const result = locationId
    ? await supabase
        .from("project_locations")
        .update(row)
        .eq("id", locationId)
        .select("id")
        .single()
    : await supabase
        .from("project_locations")
        .insert({ ...row, project_id: projectId, position: Date.now() / 1000 })
        .select("id")
        .single();
  if (result.error) return fail("workspace.saveLocation", result.error, { projectId });
  refresh(projectId);
  return { ok: true, data: { id: result.data.id } };
}

export async function deleteLocation(projectId: string, locationId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data: photos } = await supabase
    .from("project_images")
    .select("storage_path, preview_path")
    .eq("location_id", locationId);
  const { error } = await supabase.from("project_locations").delete().eq("id", locationId);
  if (error) return fail("workspace.deleteLocation", error, { locationId });
  await removeFiles(photos ?? []);
  refresh(projectId);
  return { ok: true, data: null };
}

/* ------------------------------------------------------------------------ */
/* Images (moodboard and location photos)                                    */
/* ------------------------------------------------------------------------ */

export interface UploadedImage {
  storagePath: string;
  previewPath: string | null;
  width: number | null;
  height: number | null;
}

/** Records images the browser has already uploaded to storage. */
export async function addImages(
  projectId: string,
  collection: "moodboard" | "location",
  locationId: string | null,
  images: UploadedImage[],
): Promise<ActionResult> {
  if (images.length === 0) return { ok: true, data: null };
  const supabase = await createSupabaseServerClient();
  const base = Date.now() / 1000;
  const { error } = await supabase.from("project_images").insert(
    images.slice(0, 50).map((image, index) => ({
      project_id: projectId,
      collection,
      location_id: collection === "location" ? locationId : null,
      storage_path: clean(image.storagePath, 500),
      preview_path: cleanOptional(image.previewPath, 500),
      width: image.width && image.width > 0 ? Math.round(image.width) : null,
      height: image.height && image.height > 0 ? Math.round(image.height) : null,
      position: base + index / 1000,
    })),
  );
  if (error) return fail("workspace.addImages", error, { projectId });
  refresh(projectId);
  return { ok: true, data: null };
}

async function removeFiles(rows: { storage_path: string; preview_path: string | null }[]) {
  const paths = rows.flatMap((row) => [
    row.storage_path,
    ...(row.preview_path ? [row.preview_path] : []),
  ]);
  if (paths.length === 0) return;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(paths);
  if (error) logError("workspace.removeFiles", error);
}

export async function deleteImage(projectId: string, imageId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_images")
    .delete()
    .eq("id", imageId)
    .select("storage_path, preview_path");
  if (error) return fail("workspace.deleteImage", error, { imageId });
  if (!data || data.length === 0) return fail("workspace.deleteImage", "not allowed", { imageId });
  await removeFiles(data);
  refresh(projectId);
  return { ok: true, data: null };
}
