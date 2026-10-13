import "server-only";
import { cache } from "react";
import { isPhase } from "@/features/projects/types";
import { logError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AddOnRequest,
  Comment,
  EventKind,
  Invitation,
  Member,
  Person,
  ProjectDetails,
  ProjectEvent,
  RequestStatus,
  Service,
  Task,
  Unit,
} from "./types";

export const getProjectDetails = cache(
  async (projectId: string): Promise<ProjectDetails | null> => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, client_name, description, phase, updated_at")
      .eq("id", projectId)
      .maybeSingle();
    if (error) logError("hub.project", error, { projectId });
    if (!data) return null;
    return {
      id: data.id,
      name: data.name,
      clientName: data.client_name,
      description: data.description,
      phase: isPhase(data.phase) ? data.phase : "brief",
      updatedAt: data.updated_at,
    };
  },
);

/** Display names for a set of users, marking who belongs to the studio. */
const getPeople = cache(async (ids: string): Promise<Map<string, Person>> => {
  const list = ids ? ids.split(",") : [];
  const people = new Map<string, Person>();
  if (list.length === 0) return people;
  const supabase = await createSupabaseServerClient();
  const [profiles, studio] = await Promise.all([
    supabase.from("profiles").select("id, display_name").in("id", list),
    supabase.from("studio_members").select("user_id"),
  ]);
  const studioIds = new Set((studio.data ?? []).map((row) => row.user_id));
  for (const id of list) {
    const profile = profiles.data?.find((row) => row.id === id);
    people.set(id, { id, name: profile?.display_name || "—", isStudio: studioIds.has(id) });
  }
  return people;
});

function peopleFor(ids: (string | null)[]) {
  return getPeople([...new Set(ids.filter((id): id is string => Boolean(id)))].sort().join(","));
}

export async function listTasks(projectId: string): Promise<Task[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_tasks")
    .select("id, phase, title, notes, due_date, done, position")
    .eq("project_id", projectId)
    .order("position")
    .order("created_at");
  if (error) logError("hub.tasks", error, { projectId });
  return (data ?? []).map((row) => ({
    id: row.id,
    phase: isPhase(row.phase) ? row.phase : "brief",
    title: row.title,
    notes: row.notes,
    dueDate: row.due_date,
    done: row.done,
    position: row.position,
  }));
}

export async function listEvents(projectId: string): Promise<ProjectEvent[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_events")
    .select("id, kind, title, starts_at, ends_at, all_day, location, notes")
    .eq("project_id", projectId)
    .order("starts_at");
  if (error) logError("hub.events", error, { projectId });
  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind as EventKind,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    allDay: row.all_day,
    location: row.location,
    notes: row.notes,
  }));
}

export async function listComments(projectId: string, limit?: number): Promise<Comment[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("comments")
    .select("id, body, author_id, created_at, updated_at")
    .eq("project_id", projectId)
    .is("board_id", null)
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) logError("hub.comments", error, { projectId });
  const rows = (data ?? []).reverse();
  const people = await peopleFor(rows.map((row) => row.author_id));
  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    author: people.get(row.author_id)!,
    createdAt: row.created_at,
    edited: new Date(row.updated_at).getTime() - new Date(row.created_at).getTime() > 1000,
  }));
}

export async function listServices({ activeOnly }: { activeOnly: boolean }): Promise<Service[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("services")
    .select("id, name, description, unit, unit_price, currency, active")
    .order("position")
    .order("created_at");
  if (activeOnly) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) logError("hub.services", error);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    unit: row.unit as Unit,
    unitPrice: row.unit_price === null ? null : Number(row.unit_price),
    currency: row.currency,
    active: row.active,
  }));
}

export async function listRequests(projectId: string): Promise<AddOnRequest[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_requests")
    .select(
      "id, title, unit, unit_price, currency, quantity, details, status, requested_by, created_at",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) logError("hub.requests", error, { projectId });
  const rows = data ?? [];
  const people = await peopleFor(rows.map((row) => row.requested_by));
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    unit: row.unit as Unit,
    unitPrice: row.unit_price === null ? null : Number(row.unit_price),
    currency: row.currency,
    quantity: row.quantity,
    details: row.details,
    status: row.status as RequestStatus,
    requester: people.get(row.requested_by)!,
    requestedById: row.requested_by,
    createdAt: row.created_at,
  }));
}

export async function listMembers(projectId: string): Promise<Member[]> {
  const supabase = await createSupabaseServerClient();
  const [members, invitations] = await Promise.all([
    supabase
      .from("project_members")
      .select("user_id, created_at")
      .eq("project_id", projectId)
      .order("created_at"),
    supabase
      .from("project_invitations")
      .select("email, accepted_by")
      .eq("project_id", projectId)
      .not("accepted_by", "is", null),
  ]);
  if (members.error) logError("hub.members", members.error, { projectId });
  const rows = members.data ?? [];
  const people = await peopleFor(rows.map((row) => row.user_id));
  return rows.map((row) => ({
    ...people.get(row.user_id)!,
    email: invitations.data?.find((invite) => invite.accepted_by === row.user_id)?.email ?? null,
    joinedAt: row.created_at,
  }));
}

export async function listPendingInvitations(projectId: string): Promise<Invitation[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_invitations")
    .select("id, email, created_at, expires_at")
    .eq("project_id", projectId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });
  if (error) logError("hub.invitations", error, { projectId });
  const now = Date.now();
  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    createdAt: row.created_at,
    expired: new Date(row.expires_at).getTime() < now,
  }));
}
