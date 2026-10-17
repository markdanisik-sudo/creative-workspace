/**
 * Row Level Security checks against a local Supabase stack.
 * Run with: npm run test:db (after `npx supabase start`).
 *
 * Cast: the studio (runs the workspace), a client invited to one project,
 * and an outsider with an account but no invitation.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
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

/** The current 6-digit code for a base32 TOTP secret (what an authenticator app shows). */
function totp(secret: string): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of secret.replace(/=+$/, ""))
    bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((byte) => parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hash = createHmac("sha1", key).update(counter).digest();
  const offset = hash[hash.length - 1] & 15;
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
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

  it("lets people create only projects they own", async () => {
    const spoof = await outsider.client
      .from("projects")
      .insert({ name: "spoof", owner_id: studio.id });
    expect(spoof.error).not.toBeNull();
  });

  describe("projects started by a client", () => {
    let ownProjectId: string;

    beforeAll(async () => {
      // An account nobody invited can't start projects…
      const uninvited = await outsider.client.from("projects").insert({ name: "Spam" });
      expect(uninvited.error).not.toBeNull();

      // …a client invited to some other project can.
      const other = await admin
        .from("projects")
        .insert({ name: "Earlier job", owner_id: studio.id })
        .select("id")
        .single();
      if (other.error) throw other.error;
      const membership = await admin
        .from("project_members")
        .insert({ project_id: other.data.id, user_id: outsider.id });
      if (membership.error) throw membership.error;

      const project = await outsider.client
        .from("projects")
        .insert({ name: "Client brief" })
        .select()
        .single();
      if (project.error) throw project.error;
      ownProjectId = project.data.id;
    });

    it("makes the client a member and shows the project to the studio", async () => {
      const membership = await outsider.client
        .from("project_members")
        .select("user_id")
        .eq("project_id", ownProjectId);
      expect(membership.data).toEqual([{ user_id: outsider.id }]);

      const seen = await studio.client
        .from("project_summaries")
        .select("id, created_by_client")
        .eq("id", ownProjectId)
        .single();
      expect(seen.data).toEqual({ id: ownProjectId, created_by_client: true });

      const studioOwn = await studio.client
        .from("project_summaries")
        .select("created_by_client")
        .eq("id", projectId)
        .single();
      expect(studioOwn.data?.created_by_client).toBe(false);
    });

    it("keeps it private from other clients", async () => {
      const other = await client.client.from("projects").select("id").eq("id", ownProjectId);
      expect(other.data).toEqual([]);
    });

    it("lets the client manage boards in their own project only", async () => {
      const board = await outsider.client
        .from("boards")
        .insert({ project_id: ownProjectId, name: "Ideas" })
        .select()
        .single();
      expect(board.error).toBeNull();
      const rename = await outsider.client
        .from("boards")
        .update({ name: "References" })
        .eq("id", board.data!.id)
        .select();
      expect(rename.data).toHaveLength(1);

      const intoStudioProject = await outsider.client
        .from("boards")
        .insert({ project_id: projectId, name: "Nope" });
      expect(intoStudioProject.error).not.toBeNull();
    });

    it("leaves deleting the project to the studio", async () => {
      const removed = await outsider.client
        .from("projects")
        .delete()
        .eq("id", ownProjectId)
        .select();
      expect(removed.data ?? []).toEqual([]);
      const still = await studio.client.from("projects").select("id").eq("id", ownProjectId);
      expect(still.data).toHaveLength(1);
    });
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

  describe("joining from the list of invitations", () => {
    let invitationId: string;
    let invitee: Actor;

    beforeAll(async () => {
      invitee = await createUser(admin);
      const { data, error } = await studio.client
        .from("project_invitations")
        .insert({
          project_id: projectId,
          email: invitee.email.toLowerCase(),
          token_hash: newInviteToken().hash,
          invited_by: studio.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      invitationId = data.id;
    });

    it("stays off until sign-up confirms email addresses", async () => {
      const hidden = await invitee.client.rpc("my_invitations");
      expect(hidden.data ?? []).toEqual([]);
      const refused = await invitee.client.rpc("accept_invitation_by_id", {
        invitation_id: invitationId,
      });
      expect(refused.error).not.toBeNull();
      await admin.from("app_settings").update({ emails_verified: true }).eq("id", true);
    });

    it("lists an invitation only for the address it was sent to", async () => {
      const mine = await invitee.client.rpc("my_invitations");
      expect(mine.data?.map((row) => row.id)).toContain(invitationId);
      const theirs = await outsider.client.rpc("my_invitations");
      expect(theirs.data?.map((row) => row.id) ?? []).not.toContain(invitationId);
    });

    it("refuses someone else's invitation and accepts your own", async () => {
      const stolen = await outsider.client.rpc("accept_invitation_by_id", {
        invitation_id: invitationId,
      });
      expect(stolen.error).not.toBeNull();

      const joined = await invitee.client.rpc("accept_invitation_by_id", {
        invitation_id: invitationId,
      });
      expect(joined.data).toBe(projectId);
      const visible = await invitee.client.from("projects").select("id").eq("id", projectId);
      expect(visible.data).toHaveLength(1);
      const after = await invitee.client.rpc("my_invitations");
      expect(after.data?.map((row) => row.id) ?? []).not.toContain(invitationId);
      await admin.from("app_settings").update({ emails_verified: false }).eq("id", true);
    });
  });

  describe("production workspace", () => {
    it("lets members write the brief, shots and locations together", async () => {
      const brief = await client.client
        .from("project_workspaces")
        .upsert(
          { project_id: projectId, brief: { goal: "Autumn film" } },
          { onConflict: "project_id" },
        );
      expect(brief.error).toBeNull();
      const edit = await studio.client
        .from("project_workspaces")
        .update({ shot_defaults: { camera: "ARRI Alexa 35" } })
        .eq("project_id", projectId)
        .select("brief");
      expect(edit.data?.[0]?.brief).toEqual({ goal: "Autumn film" });

      const location = await client.client
        .from("project_locations")
        .insert({ project_id: projectId, name: "Rooftop" })
        .select("id")
        .single();
      expect(location.error).toBeNull();
      const shot = await client.client
        .from("shots")
        .insert({ project_id: projectId, location_id: location.data!.id, specs: { size: "CU" } })
        .select("id")
        .single();
      expect(shot.error).toBeNull();
      const done = await studio.client
        .from("shots")
        .update({ done: true })
        .eq("id", shot.data!.id)
        .select("done");
      expect(done.data).toEqual([{ done: true }]);
    });

    it("shares plan boxes with members; only authors and the studio delete rows", async () => {
      const setup = await studio.client
        .from("project_workspaces")
        .update({ medium: "both", template: "documentary", modules: ["brief", "interview"] })
        .eq("project_id", projectId)
        .select("modules");
      expect(setup.data?.[0]?.modules).toEqual(["brief", "interview"]);

      const question = await studio.client
        .from("plan_items")
        .insert({ project_id: projectId, module: "interview", data: { question: "Why?" } })
        .select("id")
        .single();
      expect(question.error).toBeNull();
      const own = await client.client
        .from("plan_items")
        .insert({ project_id: projectId, module: "gear", data: { item: "Tripod" } })
        .select("id")
        .single();
      expect(own.error).toBeNull();

      // The client ticks the studio's question off but can't delete it.
      const tick = await client.client
        .from("plan_items")
        .update({ done: true })
        .eq("id", question.data!.id)
        .select("done");
      expect(tick.data).toEqual([{ done: true }]);
      const steal = await client.client
        .from("plan_items")
        .delete()
        .eq("id", question.data!.id)
        .select("id");
      expect(steal.data).toEqual([]);
      const mine = await client.client
        .from("plan_items")
        .delete()
        .eq("id", own.data!.id)
        .select("id");
      expect(mine.data).toHaveLength(1);

      const unknown = await studio.client
        .from("plan_items")
        .insert({ project_id: projectId, module: "nonsense", data: {} });
      expect(unknown.error).not.toBeNull();
      const spoof = await client.client.from("plan_items").insert({
        project_id: projectId,
        module: "gear",
        data: { item: "x" },
        created_by: studio.id,
      });
      expect(spoof.error).not.toBeNull();

      const outside = await outsider.client
        .from("plan_items")
        .select("id")
        .eq("project_id", projectId);
      expect(outside.data).toEqual([]);
      const intrude = await outsider.client
        .from("plan_items")
        .insert({ project_id: projectId, module: "gear", data: { item: "x" } });
      expect(intrude.error).not.toBeNull();
    });

    it("lets messages be about a box; the studio or the author resolves them", async () => {
      const note = await client.client
        .from("comments")
        .insert({
          project_id: projectId,
          body: "Warmer palette please",
          topic: "moodboard",
          target: "palette",
        })
        .select("id")
        .single();
      expect(note.error).toBeNull();
      const badTarget = await client.client.from("comments").insert({
        project_id: projectId,
        body: "x",
        topic: "moodboard",
        target: "javascript:alert(1)",
      });
      expect(badTarget.error).not.toBeNull();

      // Nobody else can resolve it, nor edit the client's text.
      const stranger = await outsider.client.rpc("set_comment_resolved", {
        comment_id: note.data!.id,
        resolved: true,
      });
      expect(stranger.error).not.toBeNull();
      const rewrite = await studio.client
        .from("comments")
        .update({ body: "changed" })
        .eq("id", note.data!.id)
        .select("id");
      expect(rewrite.data).toEqual([]);

      const resolved = await studio.client.rpc("set_comment_resolved", {
        comment_id: note.data!.id,
        resolved: true,
      });
      expect(resolved.error).toBeNull();
      const row = await client.client
        .from("comments")
        .select("resolved_at, resolved_by, body, created_at, updated_at")
        .eq("id", note.data!.id)
        .single();
      // Resolving isn't editing: the message doesn't show as "edited".
      expect(row.data?.updated_at).toBe(row.data?.created_at);
      expect(row.data?.resolved_at).not.toBeNull();
      expect(row.data?.resolved_by).toBe(studio.id);
      expect(row.data?.body).toBe("Warmer palette please");

      const reopen = await client.client.rpc("set_comment_resolved", {
        comment_id: note.data!.id,
        resolved: false,
      });
      expect(reopen.error).toBeNull();
    });

    it("saves the moodboard palette for members only", async () => {
      const palette = { colors: [{ hex: "#0b1214" }], preset: "kodak-2383" };
      const save = await client.client
        .from("project_workspaces")
        .update({ palette })
        .eq("project_id", projectId)
        .select("palette");
      expect(save.data?.[0]?.palette).toEqual(palette);
      const peek = await outsider.client
        .from("project_workspaces")
        .select("palette")
        .eq("project_id", projectId);
      expect(peek.data).toEqual([]);
    });

    it("keeps outsiders out of the workspace", async () => {
      const brief = await outsider.client
        .from("project_workspaces")
        .select("brief")
        .eq("project_id", projectId);
      const shots = await outsider.client.from("shots").select("id").eq("project_id", projectId);
      expect(brief.data).toEqual([]);
      expect(shots.data).toEqual([]);
      const write = await outsider.client
        .from("shots")
        .insert({ project_id: projectId, description: "nope" });
      expect(write.error).not.toBeNull();
    });

    it("only records images from the uploader's own folder", async () => {
      const own = await client.client.from("project_images").insert({
        project_id: projectId,
        collection: "moodboard",
        storage_path: `${client.id}/${projectId}/images/a.jpg`,
      });
      expect(own.error).toBeNull();
      const spoofed = await client.client.from("project_images").insert({
        project_id: projectId,
        collection: "moodboard",
        storage_path: `${studio.id}/${projectId}/images/b.jpg`,
      });
      expect(spoofed.error).not.toBeNull();
    });
  });

  it("moves the project to the next phase when a phase's checklist is done", async () => {
    const task = await studio.client
      .from("project_tasks")
      .insert({
        project_id: projectId,
        phase: "brief",
        title: "Brief approved",
        created_by: studio.id,
      })
      .select("id")
      .single();
    expect(task.error).toBeNull();
    const before = await studio.client
      .from("projects")
      .select("phase")
      .eq("id", projectId)
      .single();
    expect(before.data?.phase).toBe("brief");

    // A client ticking the last item moves the phase, though clients can't edit projects.
    const { data: briefTasks } = await client.client
      .from("project_tasks")
      .select("id")
      .eq("project_id", projectId)
      .eq("phase", "brief");
    for (const row of briefTasks ?? []) {
      await client.client.from("project_tasks").update({ done: true }).eq("id", row.id);
    }
    const after = await studio.client.from("projects").select("phase").eq("id", projectId).single();
    expect(after.data?.phase).toBe("preproduction");
  });

  describe("budget and invoices", () => {
    it("keeps the quote and the studio's billing details with the studio", async () => {
      const line = await client.client
        .from("budget_items")
        .insert({ project_id: projectId, title: "Free day", unit_price: 0 });
      expect(line.error).not.toBeNull();
      const billing = await client.client
        .from("studio_billing")
        .update({ name: "Hacked" })
        .eq("id", true)
        .select();
      expect(billing.data ?? []).toEqual([]);

      const studioLine = await studio.client
        .from("budget_items")
        .insert({ project_id: projectId, title: "Shoot day", quantity: 2, unit_price: 20000 });
      expect(studioLine.error).toBeNull();
      const studioBilling = await studio.client
        .from("studio_billing")
        .update({ name: "m.studio", iban: "CZ6508000000192000145399" })
        .eq("id", true);
      expect(studioBilling.error).toBeNull();
    });

    it("lets the client issue their invoice, numbered once", async () => {
      const missing = await client.client.rpc("create_invoice", { target: projectId });
      expect(missing.error?.message).toContain("customer_missing");

      const billing = await client.client
        .from("project_budgets")
        .upsert({ project_id: projectId, client_billing: { name: "Massimo Dutti" } });
      expect(billing.error).toBeNull();

      const first = await client.client.rpc("create_invoice", { target: projectId });
      expect(first.error).toBeNull();
      const again = await client.client.rpc("create_invoice", { target: projectId });
      expect(again.data).toBe(first.data);

      const invoice = await client.client
        .from("invoices")
        .select("total, number")
        .eq("id", first.data!)
        .single();
      expect(Number(invoice.data?.total)).toBe(40000);
      expect(invoice.data?.number).toMatch(/^\d{7}$/);

      const paid = await client.client
        .from("invoices")
        .update({ paid_at: new Date().toISOString() })
        .eq("id", first.data!)
        .select();
      expect(paid.data ?? []).toEqual([]);
    });

    it("keeps outsiders away from budgets, invoices and links", async () => {
      const invoice = await outsider.client.rpc("create_invoice", { target: projectId });
      expect(invoice.error).not.toBeNull();
      const invoices = await outsider.client
        .from("invoices")
        .select("id")
        .eq("project_id", projectId);
      expect(invoices.data).toEqual([]);
      const link = await client.client
        .from("project_links")
        .insert({ project_id: projectId, url: "https://example.com" });
      expect(link.error).not.toBeNull();
      const studioLink = await studio.client
        .from("project_links")
        .insert({ project_id: projectId, url: "https://f.io/abc", label: "Final" });
      expect(studioLink.error).toBeNull();
    });
  });

  it("needs the second factor to change bank details once it is turned on", async () => {
    const email = `mfa-${randomUUID()}@example.test`;
    const password = `pw-${randomUUID()}`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    const userId = created.data.user!.id;
    await admin.from("studio_members").insert({ user_id: userId });

    const first = createClient<Database>(url, publishableKey, { auth: { persistSession: false } });
    await first.auth.signInWithPassword({ email, password });
    const enrolled = await first.auth.mfa.enroll({ factorType: "totp" });
    expect(enrolled.error).toBeNull();
    const verified = await first.auth.mfa.challengeAndVerify({
      factorId: enrolled.data!.id,
      code: totp(enrolled.data!.totp.secret),
    });
    expect(verified.error).toBeNull();

    // A password-only session (e.g. a leaked password) can't change them…
    const passwordOnly = createClient<Database>(url, publishableKey, {
      auth: { persistSession: false },
    });
    await passwordOnly.auth.signInWithPassword({ email, password });
    const blocked = await passwordOnly
      .from("studio_billing")
      .update({ iban: "CZ6508000000192000145399" })
      .eq("id", true)
      .select();
    expect(blocked.data ?? []).toEqual([]);

    // …the session that entered the code can.
    const allowed = await first
      .from("studio_billing")
      .update({ phone: "+420 777 000 000" })
      .eq("id", true)
      .select("phone");
    expect(allowed.data).toEqual([{ phone: "+420 777 000 000" }]);

    await admin.from("studio_members").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
  });

  it("cascades project deletion", async () => {
    const remove = await studio.client.from("projects").delete().eq("id", projectId);
    expect(remove.error).toBeNull();
    const objects = await studio.client.from("canvas_objects").select("id").eq("board_id", boardId);
    expect(objects.data).toEqual([]);
  });
});
