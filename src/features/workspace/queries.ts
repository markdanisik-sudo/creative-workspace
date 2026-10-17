import "server-only";
import { cache } from "react";
import { logError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signStoragePaths } from "@/lib/supabase/storage";
import { isListModuleId, isMedium, resolveModules, type ItemData, type PlanItem } from "./plan";
import {
  BRIEF_FIELDS,
  DAY_NIGHT,
  INT_EXT,
  LOCATION_STATUSES,
  type Brief,
  type LocationStatus,
  type ShotSpecs,
  type WorkspaceData,
  type WorkspaceImage,
} from "./types";

function asRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

function oneOf<T extends string>(list: readonly T[], value: unknown): T | null {
  return list.find((item) => item === value) ?? null;
}

/** Everything the project's workspace shows: brief, images, locations, shots. */
export async function getWorkspace(projectId: string): Promise<WorkspaceData> {
  const supabase = await createSupabaseServerClient();
  const [workspace, images, locations, shots, items] = await Promise.all([
    supabase
      .from("project_workspaces")
      .select("brief, shot_defaults, medium, template, modules")
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("project_images")
      .select(
        "id, collection, location_id, storage_path, preview_path, width, height, caption, uploaded_by",
      )
      .eq("project_id", projectId)
      .order("position")
      .order("created_at"),
    supabase
      .from("project_locations")
      .select("id, name, address, contact, notes, status, created_by")
      .eq("project_id", projectId)
      .order("position")
      .order("created_at"),
    supabase
      .from("shots")
      .select(
        "id, position, scene, description, int_ext, day_night, location_id, duration_seconds, specs, notes, done",
      )
      .eq("project_id", projectId)
      .order("position")
      .order("created_at"),
    supabase
      .from("plan_items")
      .select("id, module, position, data, done, created_by")
      .eq("project_id", projectId)
      .order("position")
      .order("created_at"),
  ]);
  for (const [name, result] of Object.entries({ workspace, images, locations, shots, items })) {
    if (result.error) logError(`workspace.${name}`, result.error, { projectId });
  }

  const imageRows = images.data ?? [];
  const urls = await signStoragePaths(
    supabase,
    imageRows.flatMap((row) => [row.storage_path, ...(row.preview_path ? [row.preview_path] : [])]),
  );
  const toImage = (row: (typeof imageRows)[number]): WorkspaceImage => ({
    id: row.id,
    url: urls.get(row.preview_path ?? row.storage_path) ?? null,
    fullUrl: urls.get(row.storage_path) ?? null,
    width: row.width,
    height: row.height,
    caption: row.caption,
    uploadedBy: row.uploaded_by,
    locationId: row.location_id,
  });

  const rawBrief = asRecord(workspace.data?.brief);
  const brief: Brief = Object.fromEntries(
    BRIEF_FIELDS.flatMap((field) => (rawBrief[field] ? [[field, rawBrief[field]]] : [])),
  );

  const medium = workspace.data?.medium;
  return {
    medium: isMedium(medium) ? medium : "video",
    template: workspace.data?.template ?? null,
    modules: resolveModules(workspace.data?.modules),
    items: (items.data ?? []).flatMap((row): PlanItem[] =>
      isListModuleId(row.module)
        ? [
            {
              id: row.id,
              module: row.module,
              position: row.position,
              data: (row.data && typeof row.data === "object" && !Array.isArray(row.data)
                ? row.data
                : {}) as ItemData,
              done: row.done,
              createdBy: row.created_by,
            },
          ]
        : [],
    ),
    brief,
    shotDefaults: asRecord(workspace.data?.shot_defaults) as ShotSpecs,
    moodboard: imageRows.filter((row) => row.collection === "moodboard").map(toImage),
    locations: (locations.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      contact: row.contact,
      notes: row.notes,
      status: (oneOf(LOCATION_STATUSES, row.status) ?? "idea") as LocationStatus,
      createdBy: row.created_by,
      photos: imageRows.filter((image) => image.location_id === row.id).map(toImage),
    })),
    shots: (shots.data ?? []).map((row) => ({
      id: row.id,
      position: row.position,
      scene: row.scene,
      description: row.description,
      intExt: oneOf(INT_EXT, row.int_ext),
      dayNight: oneOf(DAY_NIGHT, row.day_night),
      locationId: row.location_id,
      durationSeconds: row.duration_seconds,
      specs: asRecord(row.specs),
      notes: row.notes,
      done: row.done,
    })),
  };
}

export interface ShotCheck {
  id: string;
  description: string | null;
  size: string | null;
  done: boolean;
}

/** The shot list as a checklist (for the overview on a shoot day). */
export const listShotChecks = cache(async (projectId: string): Promise<ShotCheck[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("shots")
    .select("id, description, specs, done")
    .eq("project_id", projectId)
    .order("position")
    .order("created_at");
  if (error) logError("workspace.shotChecks", error, { projectId });
  return (data ?? []).map((row) => ({
    id: row.id,
    description: row.description,
    size: asRecord(row.specs).size ?? null,
    done: row.done,
  }));
});
