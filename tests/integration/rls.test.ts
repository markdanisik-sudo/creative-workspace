/**
 * Row Level Security checks against a local Supabase stack.
 * Run with: npm run test:db (after `npx supabase start`).
 *
 * Cast: the studio (runs the workspace), a client invited to one project,
 * and an outsider with an account but no invitation.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

const url = process.env.SUPABASE_TEST_URL ?? "http://127.0.0.1:54321";
const publishableKey = process.env.SUPABASE_TEST_PUBLISHABLE_KEY ?? "";
const secretKey = process.env.SUPABASE_TEST_SECRET_KEY ?? "";

type Client = SupabaseClient<Database>;
interface Actor {
  client: Client;
  id: string;
  email: string;
}

async function createUser(admin: Client): Promise<Actor> {
  const email = `rls-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("no user");
  const client = createClient<Database>(url, publishableKey, { auth: { persistSession: false } });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { client, id: data.user.id, email };
}

function newInviteToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: createHash("sha256").update(token).digest("hex") };
}

describe.skipIf(!publishableKey || !secretKey)("row level security", () => {
  let admin: Client;
  let studio: Actor;
  let client: Actor;
  let outsider: Actor;
  let projectId: string;
  let boardId: string;

  beforeAll(async () => {
    admin = createClient<Database>(url, secretKey, { auth: { persistSession: false } });
    studio = await createUser(admin);
    client = await createUser(admin);
    outsider = await createUser(admin);
    const promote = await admin
      .from("studio_members")
      .upsert({ user_id: studio.id }, { onConflict: "user_id", ignoreDuplicates: true });
    if (promote.error) throw promote.error;

    const project = await studio.client
      .from("projects")
      .insert({ name: "Massimo Dutti", client_name: "Massimo Dutti" })
      .select()
      .single();
    if (project.error) throw project.error;
    projectId = project.data.id;

    const board = await studio.client
      .from("boards")
      .insert({ project_id: projectId, name: "Moodboard" })
      .select()
      .single();
    if (board.error) throw board.error;
    boardId = board.data.id;

    const object = await studio.client.from("canvas_objects").insert({
      board_id: boardId,
      id: "shape:1",
      type: "text",
      z_index: "a1",
      data: { props: { text: "hello" } },
    });
    if (object.error) throw object.error;
  });

  it("creates a profile for new users", async () => {
    const { data } = await studio.client.from("profiles").select("id").eq("id", studio.id);
    expect(data).toHaveLength(1);
  });

  it("only lets the studio create projects", async () => {
    const insert = await outsider.client.from("projects").insert({ name: "Nope" });
    expect(insert.error).not.toBeNull();
    const spoof = await outsider.client
      .from("projects")
      .insert({ name: "spoof", owner_id: studio.id });
    expect(spoof.error).not.toBeNull();
  });

  it("hides projects from people who are not invited", async () => {
    const projects = await client.client.from("projects").select("id").eq("id", projectId);
    const objects = await client.client.from("canvas_objects").select("id").eq("board_id", boardId);
    const summaries = await client.client
      .from("project_summaries")
      .select("id")
      .eq("id", projectId);
    expect(projects.data).toEqual([]);
    expect(objects.data).toEqual([]);
    expect(summaries.data).toEqual([]);
  });

  describe("invitations", () => {
    let token: string;

    beforeAll(async () => {
      const invite = newInviteToken();
      token = invite.token;
      const { error } = await studio.client.from("project_invitations").insert({
        project_id: projectId,
        email: client.email,
        token_hash: invite.hash,
        invited_by: studio.id,
      });
      if (error) throw error;
    });

    it("are not visible or creatable by clients", async () => {
      const read = await client.client.from("project_invitations").select("id");
      expect(read.data).toEqual([]);
      const forged = newInviteToken();
      const insert = await outsider.client.from("project_invitations").insert({
        project_id: projectId,
        email: outsider.email,
        token_hash: forged.hash,
        invited_by: outsider.id,
      });
      expect(insert.error).not.toBeNull();
    });

    it("can be looked up by token without signing in", async () => {
      const anon = createClient<Database>(url, publishableKey, { auth: { persistSession: false } });
      const { data } = await anon.rpc("get_invitation", { invite_token: token });
      expect(data?.[0]).toMatchObject({
        project_name: "Massimo Dutti",
        email: client.email,
        status: "pending",
      });
      const missing = await anon.rpc("get_invitation", { invite_token: "nope" });
      expect(missing.data).toEqual([]);
    });

    it("cannot be accepted by a different account", async () => {
      const { error } = await outsider.client.rpc("accept_invitation", { invite_token: token });
      expect(error?.message).toContain("invitation_email_mismatch");
    });

    it("joins the invited client to the project", async () => {
      const { data, error } = await client.client.rpc("accept_invitation", { invite_token: token });
      expect(error).toBeNull();
      expect(data).toBe(projectId);
      const projects = await client.client.from("projects").select("id").eq("id", projectId);
      expect(projects.data).toHaveLength(1);
      const again = await client.client.rpc("accept_invitation", { invite_token: token });
      expect(again.error).toBeNull();
    });
  });

  describe("as an invited client", () => {
    it("can work on board content", async () => {
      const insert = await client.client.from("canvas_objects").insert({
        board_id: boardId,
        id: "shape:client",
        type: "note",
        z_index: "a2",
      });
      expect(insert.error).toBeNull();
      const update = await client.client
        .from("canvas_objects")
        .update({ x: 42 })
        .eq("board_id", boardId)
        .eq("id", "shape:1")
        .select();
      expect(update.data).toHaveLength(1);
    });

    it("cannot manage boards, the project or its people", async () => {
      const board = await client.client.from("boards").insert({ project_id: projectId, name: "x" });
      expect(board.error).not.toBeNull();
      const rename = await client.client
        .from("projects")
        .update({ name: "Hijacked" })
        .eq("id", projectId)
        .select();
      expect(rename.data).toEqual([]);
      const remove = await client.client.from("projects").delete().eq("id", projectId).select();
      expect(remove.data).toEqual([]);
      const member = await client.client
        .from("project_members")
        .insert({ project_id: projectId, user_id: outsider.id });
      expect(member.error).not.toBeNull();
    });

    it("can request add-ons but not approve them", async () => {
      const request = await client.client
        .from("project_requests")
        .insert({ project_id: projectId, title: "Additional shoot day", unit: "day" })
        .select()
        .single();
      expect(request.error).toBeNull();
      const forged = await client.client
        .from("project_requests")
        .insert({ project_id: projectId, title: "Free day", status: "approved" });
      expect(forged.error).not.toBeNull();
      const approve = await client.client
        .from("project_requests")
        .update({ status: "approved" })
        .eq("id", request.data!.id)
        .select();
      expect(approve.data).toEqual([]);
      const studioApproves = await studio.client
        .from("project_requests")
        .update({ status: "approved", decided_by: studio.id })
        .eq("id", request.data!.id)
        .select();
      expect(studioApproves.data).toHaveLength(1);
    });

    it("can add tasks and comments but not change dates", async () => {
      const task = await client.client
        .from("project_tasks")
        .insert({ project_id: projectId, title: "Send logo files", created_by: client.id });
      expect(task.error).toBeNull();
      const comment = await client.client
        .from("comments")
        .insert({ project_id: projectId, board_id: boardId, body: "Love the palette" });
      expect(comment.error).toBeNull();
      const event = await client.client.from("project_events").insert({
        project_id: projectId,
        title: "Shoot",
        starts_at: new Date().toISOString(),
      });
      expect(event.error).not.toBeNull();
    });

    it("sees files uploaded by the studio, but cannot delete them", async () => {
      const path = `${studio.id}/${projectId}/${boardId}/brief.txt`;
      const upload = await studio.client.storage
        .from("assets")
        .upload(path, new Blob(["brief"], { type: "text/plain" }));
      expect(upload.error).toBeNull();
      const signed = await client.client.storage.from("assets").createSignedUrl(path, 60);
      expect(signed.error).toBeNull();
      const removed = await client.client.storage.from("assets").remove([path]);
      expect(removed.data ?? []).toEqual([]);
    });
  });

  it("keeps outsiders out of storage and content", async () => {
    const body = new Blob(["x"], { type: "text/plain" });
    const upload = await outsider.client.storage
      .from("assets")
      .upload(`${outsider.id}/${projectId}/${boardId}/evil.txt`, body);
    expect(upload.error).not.toBeNull();
    const read = await outsider.client.storage
      .from("assets")
      .createSignedUrl(`${studio.id}/${projectId}/${boardId}/brief.txt`, 60);
    expect(read.error).not.toBeNull();
    const objects = await outsider.client
      .from("canvas_objects")
      .select("id")
      .eq("board_id", boardId);
    expect(objects.data).toEqual([]);
    const comments = await outsider.client
      .from("comments")
      .select("id")
      .eq("project_id", projectId);
    expect(comments.data).toEqual([]);
  });

  it("rejects disallowed mime types", async () => {
    const exe = new Blob(["MZ"], { type: "application/x-msdownload" });
    const upload = await studio.client.storage
      .from("assets")
      .upload(`${studio.id}/${projectId}/${boardId}/app.exe`, exe);
    expect(upload.error).not.toBeNull();
  });

  it("summarises projects", async () => {
    const { data } = await studio.client
      .from("project_summaries")
      .select("item_count, board_count, open_request_count, phase")
      .eq("id", projectId)
      .single();
    expect(data).toEqual({ item_count: 2, board_count: 1, open_request_count: 0, phase: "brief" });
  });

  it("cascades project deletion", async () => {
    const remove = await studio.client.from("projects").delete().eq("id", projectId);
    expect(remove.error).toBeNull();
    const objects = await studio.client.from("canvas_objects").select("id").eq("board_id", boardId);
    expect(objects.data).toEqual([]);
  });
});
