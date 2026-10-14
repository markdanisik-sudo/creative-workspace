"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { logError, type ActionResult } from "@/lib/errors";
import { siteOrigin } from "@/lib/site";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a single-use invitation for a client and returns the link to send.
 * Only the token's hash is stored, so the link is shown exactly once.
 */
export async function createInvitation(
  projectId: string,
  rawEmail: string,
): Promise<ActionResult<{ link: string }>> {
  const { t } = await getI18n();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: t("errors.generic") };

  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return { ok: false, error: t("auth.invalidEmail") };

  const token = randomBytes(32).toString("base64url");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("project_invitations").insert({
    project_id: projectId,
    email,
    token_hash: hashToken(token),
    invited_by: user.id,
  });
  if (error) {
    logError("people.invite", error, { projectId });
    return { ok: false, error: t("errors.generic") };
  }

  revalidatePath(`/projects/${projectId}`, "layout");
  return { ok: true, data: { link: `${await siteOrigin()}/invite/${token}` } };
}

export async function revokeInvitation(
  invitationId: string,
  projectId: string,
): Promise<ActionResult> {
  const { t } = await getI18n();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("project_invitations").delete().eq("id", invitationId);
  if (error) {
    logError("people.revoke", error, { invitationId });
    return { ok: false, error: t("errors.generic") };
  }
  revalidatePath(`/projects/${projectId}`, "layout");
  return { ok: true, data: null };
}

export async function removeMember(projectId: string, userId: string): Promise<ActionResult> {
  const { t } = await getI18n();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (error) {
    logError("people.remove", error, { projectId });
    return { ok: false, error: t("errors.generic") };
  }
  revalidatePath(`/projects/${projectId}`, "layout");
  return { ok: true, data: null };
}

/** For a signed-in visitor on the invite page: join the project and open it. */
export async function acceptInvitation(token: string): Promise<ActionResult> {
  const { t } = await getI18n();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("accept_invitation", { invite_token: token });
  if (error || !data) {
    if (error?.message.includes("invitation_email_mismatch")) {
      const { data: invite } = await supabase.rpc("get_invitation", { invite_token: token });
      return { ok: false, error: t("invite.emailMismatch", { email: invite?.[0]?.email ?? "" }) };
    }
    logError("people.accept", error);
    return { ok: false, error: t("invite.notFoundTitle") };
  }
  redirect(`/projects/${data}`);
}
