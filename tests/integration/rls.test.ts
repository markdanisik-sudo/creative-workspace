/**
 * Row Level Security checks against a local Supabase stack.
 * Run with: npm run test:db (after `npx supabase start`).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";

const url = process.env.SUPABASE_TEST_URL ?? "http://127.0.0.1:54321";
const publishableKey = process.env.SUPABASE_TEST_PUBLISHABLE_KEY ?? "";
const secretKey = process.env.SUPABASE_TEST_SECRET_KEY ?? "";

type Client = SupabaseClient<Database>;

async function createUser(admin: Client): Promise<{ client: Client; id: string }> {
  const email = `rls-${randomUUID()}@example.test`;
  const password = `pw-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("no user");
  const client = createClient<Database>(url, publishableKey, {
    auth: { persistSession: false },
  });
  const signIn = await client.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  return { client, id: data.user.id };
}

describe.skipIf(!publishableKey || !secretKey)("row level security", () => {
  let alice: { client: Client; id: string };
  let bob: { client: Client; id: string };
  let projectId: string;
  let boardId: string;

  beforeAll(async () => {
    const admin = createClient<Database>(url, secretKey, { auth: { persistSession: false } });
    alice = await createUser(admin);
    bob = await createUser(admin);

    const project = await alice.client
      .from("projects")
      .insert({ name: "Alice's" })
      .select()
      .single();
    if (project.error) throw project.error;
    projectId = project.data.id;

    const board = await alice.client
      .from("boards")
      .insert({ project_id: projectId, name: "Moodboard" })
      .select()
      .single();
    if (board.error) throw board.error;
    boardId = board.data.id;

    const object = await alice.client.from("canvas_objects").insert({
      board_id: boardId,
      id: "shape:1",
      type: "text",
      z_index: "a1",
      data: { props: { text: "hello" } },
    });
    if (object.error) throw object.error;
  });

  it("creates a profile for new users", async () => {
    const { data } = await alice.client.from("profiles").select("id").eq("id", alice.id);
    expect(data).toHaveLength(1);
  });

  it("hides other users' projects, boards and objects", async () => {
    const projects = await bob.client.from("projects").select("id").eq("id", projectId);
    const boards = await bob.client.from("boards").select("id").eq("id", boardId);
    const objects = await bob.client.from("canvas_objects").select("id").eq("board_id", boardId);
    const summaries = await bob.client.from("project_summaries").select("id").eq("id", projectId);
    expect(projects.data).toEqual([]);
    expect(boards.data).toEqual([]);
    expect(objects.data).toEqual([]);
    expect(summaries.data).toEqual([]);
  });

  it("prevents writing into another user's board", async () => {
    const insert = await bob.client.from("canvas_objects").insert({
      board_id: boardId,
      id: "shape:evil",
      type: "text",
      z_index: "a2",
    });
    expect(insert.error).not.toBeNull();

    const board = await bob.client.from("boards").insert({ project_id: projectId, name: "x" });
    expect(board.error).not.toBeNull();

    const update = await bob.client
      .from("canvas_objects")
      .update({ x: 999 })
      .eq("board_id", boardId)
      .select();
    expect(update.data).toEqual([]);

    const remove = await bob.client.from("projects").delete().eq("id", projectId).select();
    expect(remove.data).toEqual([]);
  });

  it("prevents spoofing project ownership", async () => {
    const insert = await bob.client.from("projects").insert({ name: "spoof", owner_id: alice.id });
    expect(insert.error).not.toBeNull();
  });

  it("isolates storage by user and project folder", async () => {
    const body = new Blob(["hello"], { type: "text/plain" });
    const own = await alice.client.storage
      .from("assets")
      .upload(`${alice.id}/${projectId}/${boardId}/note.txt`, body);
    expect(own.error).toBeNull();

    const intoAlice = await bob.client.storage
      .from("assets")
      .upload(`${alice.id}/${projectId}/${boardId}/evil.txt`, body);
    expect(intoAlice.error).not.toBeNull();

    const ownFolderForeignProject = await bob.client.storage
      .from("assets")
      .upload(`${bob.id}/${projectId}/${boardId}/evil.txt`, body);
    expect(ownFolderForeignProject.error).not.toBeNull();

    const read = await bob.client.storage
      .from("assets")
      .createSignedUrl(`${alice.id}/${projectId}/${boardId}/note.txt`, 60);
    expect(read.error).not.toBeNull();
  });

  it("rejects disallowed mime types", async () => {
    const exe = new Blob(["MZ"], { type: "application/x-msdownload" });
    const upload = await alice.client.storage
      .from("assets")
      .upload(`${alice.id}/${projectId}/${boardId}/app.exe`, exe);
    expect(upload.error).not.toBeNull();
  });

  it("summarises projects and tracks modification", async () => {
    const { data } = await alice.client
      .from("project_summaries")
      .select("item_count, board_count")
      .eq("id", projectId)
      .single();
    expect(data).toEqual({ item_count: 1, board_count: 1 });
  });

  it("cascades project deletion", async () => {
    const remove = await alice.client.from("projects").delete().eq("id", projectId);
    expect(remove.error).toBeNull();
    const objects = await alice.client.from("canvas_objects").select("id").eq("board_id", boardId);
    expect(objects.data).toEqual([]);
  });
});
