"use server";

import { revalidatePath } from "next/cache";
import { isPhase, type Phase } from "@/features/projects/types";
import { isPlanModuleId } from "@/features/workspace/plan";
import { logError, type ActionResult } from "@/lib/errors";
import { getI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/supabase/database.types";
import {
  EVENT_KINDS,
  REQUEST_STATUSES,
  UNITS,
  type EventKind,
  type RequestStatus,
  type Unit,
} from "./types";

const LIMITS = { title: 300, notes: 5000, name: 120, location: 300, body: 5000 } as const;

function clean(value: unknown, max: number): string {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function cleanOptional(value: unknown, max: number): string | null {
  return clean(value, max) || null;
}

async function fail(
  context: string,
  error: unknown,
  extra?: Record<string, unknown>,
): Promise<ActionResult<never>> {
  const { t } = await getI18n();
  logError(context, error, extra);
  return { ok: false, error: t("errors.generic") };
}

function refresh(projectId: string) {
  revalidatePath(`/projects/${projectId}`, "layout");
}

/* -------------------------------------------------------------------------- */
/* Project                                                                    */
/* -------------------------------------------------------------------------- */

export async function setPhase(projectId: string, phase: Phase): Promise<ActionResult> {
  if (!isPhase(phase)) return fail("hub.setPhase", "invalid phase");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("projects").update({ phase }).eq("id", projectId);
  if (error) return fail("hub.setPhase", error, { projectId });
  refresh(projectId);
  revalidatePath("/projects");
  return { ok: true, data: null };
}

export async function updateProjectDetails(
  projectId: string,
  input: { name: string; clientName: string; description: string },
): Promise<ActionResult> {
  const { t } = await getI18n();
  const name = clean(input.name, LIMITS.name);
  if (!name) return { ok: false, error: t("project.nameRequired") };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("projects")
    .update({
      name,
      client_name: cleanOptional(input.clientName, LIMITS.name),
      description: cleanOptional(input.description, 2000),
    })
    .eq("id", projectId);
  if (error) return fail("hub.details", error, { projectId });
  refresh(projectId);
  revalidatePath("/projects");
  return { ok: true, data: null };
}

/* -------------------------------------------------------------------------- */
/* Tasks                                                                      */
/* -------------------------------------------------------------------------- */

export async function createTask(
  projectId: string,
  phase: Phase,
  rawTitle: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  const title = clean(rawTitle, LIMITS.title);
  if (!user || !title || !isPhase(phase)) return fail("hub.createTask", "invalid input");
  const supabase = await createSupabaseServerClient();
  const { data: last } = await supabase
    .from("project_tasks")
    .select("position")
    .eq("project_id", projectId)
    .eq("phase", phase)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("project_tasks").insert({
    project_id: projectId,
    phase,
    title,
    position: (last?.position ?? 0) + 1,
    created_by: user.id,
  });
  if (error) return fail("hub.createTask", error, { projectId });
  refresh(projectId);
  return { ok: true, data: null };
}

export async function updateTask(
  projectId: string,
  taskId: string,
  patch: Partial<{
    title: string;
    notes: string | null;
    dueDate: string | null;
    done: boolean;
    phase: Phase;
    position: number;
  }>,
): Promise<ActionResult> {
  const update: TablesUpdate<"project_tasks"> = {};
  if (patch.title !== undefined) {
    const title = clean(patch.title, LIMITS.title);
    if (!title) return fail("hub.updateTask", "empty title");
    update.title = title;
  }
  if (patch.notes !== undefined) update.notes = cleanOptional(patch.notes, LIMITS.notes);
  if (patch.dueDate !== undefined) update.due_date = patch.dueDate || null;
  if (patch.done !== undefined) update.done = patch.done;
  if (patch.phase !== undefined) {
    if (!isPhase(patch.phase)) return fail("hub.updateTask", "invalid phase");
    update.phase = patch.phase;
  }
  if (patch.position !== undefined && Number.isFinite(patch.position))
    update.position = patch.position;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("project_tasks").update(update).eq("id", taskId);
  if (error) return fail("hub.updateTask", error, { taskId });
  refresh(projectId);
  return { ok: true, data: null };
}

export async function deleteTask(projectId: string, taskId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("project_tasks").delete().eq("id", taskId);
  if (error) return fail("hub.deleteTask", error, { taskId });
  refresh(projectId);
  return { ok: true, data: null };
}

/* -------------------------------------------------------------------------- */
/* Dates                                                                      */
/* -------------------------------------------------------------------------- */

export interface EventInput {
  kind: EventKind;
  title: string;
  date: string;
  endDate?: string;
  allDay: boolean;
  startTime?: string;
  endTime?: string;
  location?: string;
  notes?: string;
  /** The viewer's UTC offset in minutes (Date#getTimezoneOffset), to read local times. */
  timezoneOffset: number;
}

function toInstant(date: string, time: string | undefined, offsetMinutes: number): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [hours, minutes] = /^\d{2}:\d{2}$/.test(time ?? "")
    ? time!.split(":").map(Number)
    : [12, 0];
  const utc = Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
    hours,
    minutes,
  );
  return new Date(utc + offsetMinutes * 60_000).toISOString();
}

function eventRow(input: EventInput) {
  const title = clean(input.title, 200);
  if (!title || !(EVENT_KINDS as readonly string[]).includes(input.kind)) return null;
  const startsAt = toInstant(
    input.date,
    input.allDay ? undefined : input.startTime,
    input.timezoneOffset,
  );
  if (!startsAt) return null;
  const endDate = input.endDate || (input.allDay ? undefined : input.date);
  const endsAt = endDate
    ? toInstant(endDate, input.allDay ? undefined : input.endTime, input.timezoneOffset)
    : null;
  if (endsAt && endsAt < startsAt) return null;
  return {
    kind: input.kind,
    title,
    starts_at: startsAt,
    ends_at: endsAt,
    all_day: input.allDay,
    location: cleanOptional(input.location, LIMITS.location),
    notes: cleanOptional(input.notes, LIMITS.notes),
  };
}

export async function saveEvent(
  projectId: string,
  eventId: string | null,
  input: EventInput,
): Promise<ActionResult> {
  const row = eventRow(input);
  if (!row) return fail("hub.saveEvent", "invalid input");
  const supabase = await createSupabaseServerClient();
  const { error } = eventId
    ? await supabase.from("project_events").update(row).eq("id", eventId)
    : await supabase.from("project_events").insert({ ...row, project_id: projectId });
  if (error) return fail("hub.saveEvent", error, { projectId });
  refresh(projectId);
  revalidatePath("/projects");
  return { ok: true, data: null };
}

export async function deleteEvent(projectId: string, eventId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("project_events").delete().eq("id", eventId);
  if (error) return fail("hub.deleteEvent", error, { eventId });
  refresh(projectId);
  return { ok: true, data: null };
}

/* -------------------------------------------------------------------------- */
/* Discussion                                                                 */
/* -------------------------------------------------------------------------- */

const TARGET =
  /^(palette|(image|item):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

export async function postComment(
  projectId: string,
  rawBody: string,
  about?: { topic: string | null; target: string | null },
): Promise<ActionResult> {
  const body = clean(rawBody, LIMITS.body);
  if (!body) return fail("hub.postComment", "empty");
  const topic = about?.topic && isPlanModuleId(about.topic) ? about.topic : null;
  const target = topic && about?.target && TARGET.test(about.target) ? about.target : null;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("comments")
    .insert({ project_id: projectId, body, topic, target });
  if (error) return fail("hub.postComment", error, { projectId });
  refresh(projectId);
  return { ok: true, data: null };
}

/** Marks a message about a box as dealt with (the studio or its author). */
export async function setCommentResolved(
  projectId: string,
  commentId: string,
  resolved: boolean,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_comment_resolved", {
    comment_id: commentId,
    resolved,
  });
  if (error) return fail("hub.resolveComment", error, { commentId });
  refresh(projectId);
  return { ok: true, data: null };
}

export async function deleteComment(projectId: string, commentId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) return fail("hub.deleteComment", error, { commentId });
  refresh(projectId);
  return { ok: true, data: null };
}

/* -------------------------------------------------------------------------- */
/* Add-on requests                                                            */
/* -------------------------------------------------------------------------- */

export async function createRequest(
  projectId: string,
  input: { serviceId: string | null; title?: string; quantity: number; details: string },
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail("hub.createRequest", "signed out");
  const supabase = await createSupabaseServerClient();

  let snapshot: { title: string; unit: Unit; unit_price: number | null; currency: string };
  if (input.serviceId) {
    // Price and unit come from the catalog, never from the client.
    // …and from the catalog of whoever runs this project.
    const [{ data: service, error }, { data: project }] = await Promise.all([
      supabase
        .from("services")
        .select("id, name, unit, unit_price, currency, active, owner_id")
        .eq("id", input.serviceId)
        .single(),
      supabase.from("projects").select("owner_id").eq("id", projectId).single(),
    ]);
    if (error || !service?.active || service.owner_id !== project?.owner_id) {
      return fail("hub.createRequest", error ?? "service not offered here");
    }
    snapshot = {
      title: service.name,
      unit: service.unit as Unit,
      unit_price: service.unit_price === null ? null : Number(service.unit_price),
      currency: service.currency,
    };
  } else {
    const title = clean(input.title, 200);
    if (!title) return fail("hub.createRequest", "empty title");
    snapshot = { title, unit: "item", unit_price: null, currency: "CZK" };
  }

  const quantity = Math.min(100, Math.max(1, Math.round(input.quantity) || 1));
  const { error } = await supabase.from("project_requests").insert({
    project_id: projectId,
    service_id: input.serviceId,
    ...snapshot,
    quantity,
    details: cleanOptional(input.details, LIMITS.notes),
    requested_by: user.id,
  });
  if (error) return fail("hub.createRequest", error, { projectId });
  refresh(projectId);
  revalidatePath("/projects");
  return { ok: true, data: null };
}

export async function setRequestStatus(
  projectId: string,
  requestId: string,
  status: RequestStatus,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !(REQUEST_STATUSES as readonly string[]).includes(status)) {
    return fail("hub.requestStatus", "invalid input");
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("project_requests")
    .update({ status, decided_by: user.id, decided_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) return fail("hub.requestStatus", error, { requestId });
  refresh(projectId);
  revalidatePath("/projects");
  return { ok: true, data: null };
}

export async function withdrawRequest(projectId: string, requestId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("project_requests").delete().eq("id", requestId);
  if (error) return fail("hub.withdrawRequest", error, { requestId });
  refresh(projectId);
  revalidatePath("/projects");
  return { ok: true, data: null };
}

/* -------------------------------------------------------------------------- */
/* Service catalog (studio)                                                   */
/* -------------------------------------------------------------------------- */

export interface ServiceInput {
  name: string;
  description: string;
  unit: Unit;
  unitPrice: string;
  currency: string;
  active: boolean;
}

export async function saveService(
  serviceId: string | null,
  input: ServiceInput,
): Promise<ActionResult> {
  const { t } = await getI18n();
  const name = clean(input.name, LIMITS.name);
  if (!name) return { ok: false, error: t("errors.generic") };
  const price = input.unitPrice.trim() === "" ? null : Number(input.unitPrice.replace(",", "."));
  if (price !== null && (!Number.isFinite(price) || price < 0))
    return { ok: false, error: t("errors.generic") };
  const currency = clean(input.currency, 3).toUpperCase() || "CZK";
  const row = {
    name,
    description: cleanOptional(input.description, 1000),
    unit: (UNITS as readonly string[]).includes(input.unit) ? input.unit : "item",
    unit_price: price,
    currency: currency.length === 3 ? currency : "CZK",
    active: input.active,
  };
  const supabase = await createSupabaseServerClient();
  const { error } = serviceId
    ? await supabase.from("services").update(row).eq("id", serviceId)
    : await supabase.from("services").insert({ ...row, position: Date.now() / 1000 });
  if (error) return fail("hub.saveService", error);
  revalidatePath("/settings");
  return { ok: true, data: null };
}

export async function deleteService(serviceId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("services").delete().eq("id", serviceId);
  if (error) return fail("hub.deleteService", error);
  revalidatePath("/settings");
  return { ok: true, data: null };
}
