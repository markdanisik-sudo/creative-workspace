"use server";

import { redirect } from "next/navigation";
import { getI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";
import { siteOrigin } from "@/lib/site";

export interface AuthFormState {
  error?: string;
  fieldErrors?: { email?: string; password?: string; name?: string };
  email?: string;
  name?: string;
}

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Only allow same-origin relative redirects. */
function safeNextPath(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/projects";
}

function readForm(formData: FormData) {
  const invite = String(formData.get("invite") ?? "").trim();
  return {
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    password: String(formData.get("password") ?? ""),
    name: String(formData.get("name") ?? "")
      .trim()
      .slice(0, 80),
    invite: invite || null,
  };
}

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** Joins the invited project; returns where to go next, or an error message. */
async function acceptInvite(
  supabase: Supabase,
  token: string,
): Promise<{ path: string } | { error: string }> {
  const { t } = await getI18n();
  const { data, error } = await supabase.rpc("accept_invitation", { invite_token: token });
  if (error || !data) {
    if (error?.message.includes("invitation_email_mismatch")) {
      const { data: invite } = await supabase.rpc("get_invitation", { invite_token: token });
      return { error: t("invite.emailMismatch", { email: invite?.[0]?.email ?? "" }) };
    }
    if (error?.message.includes("invitation_expired")) return { error: t("invite.expiredTitle") };
    if (error?.message.includes("invitation_already_used"))
      return { error: t("invite.acceptedTitle") };
    logError("auth.acceptInvite", error);
    return { error: t("invite.notFoundTitle") };
  }
  return { path: `/projects/${data}` };
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { t } = await getI18n();
  const { email, password, invite } = readForm(formData);
  if (!EMAIL_PATTERN.test(email)) {
    return { email, fieldErrors: { email: t("auth.invalidEmail") } };
  }
  if (!password) return { email, fieldErrors: { password: t("auth.enterPassword") } };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "invalid_credentials") return { email, error: t("auth.invalidCredentials") };
    if (error.code === "email_not_confirmed") return { email, error: t("auth.emailNotConfirmed") };
    logError("auth.signIn", error);
    return { email, error: t("errors.generic") };
  }

  if (invite) {
    const result = await acceptInvite(supabase, invite);
    if ("error" in result) return { email, error: result.error };
    redirect(result.path);
  }
  redirect(safeNextPath(formData.get("next")));
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { t } = await getI18n();
  const { email, password, name, invite } = readForm(formData);

  const fieldErrors: AuthFormState["fieldErrors"] = {};
  if (!EMAIL_PATTERN.test(email)) fieldErrors.email = t("auth.invalidEmail");
  if (password.length < MIN_PASSWORD_LENGTH) {
    fieldErrors.password = t("auth.passwordLength", { min: MIN_PASSWORD_LENGTH });
  }
  if (Object.keys(fieldErrors).length > 0) return { email, name, fieldErrors };

  // Anyone can sign up; each account gets its own private workspace.
  const supabase = await createSupabaseServerClient();
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: name || null },
      emailRedirectTo: invite
        ? `${origin}/auth/callback?next=${encodeURIComponent(`/invite/${invite}`)}`
        : `${origin}/auth/callback`,
    },
  });

  if (error) {
    if (error.code === "user_already_exists") return { email, name, error: t("auth.userExists") };
    if (error.code === "weak_password") {
      return { email, name, fieldErrors: { password: t("auth.weakPassword") } };
    }
    logError("auth.signUp", error);
    return { email, name, error: t("errors.generic") };
  }

  // With email confirmation enabled there is no session until the link is clicked.
  if (!data.session) redirect(`/sign-in?check-email=1&email=${encodeURIComponent(email)}`);

  if (invite) {
    const result = await acceptInvite(supabase, invite);
    if ("error" in result) return { email, name, error: result.error };
    redirect(result.path);
  }
  redirect("/projects");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

/** Signs out on every device (revokes all refresh tokens). */
export async function signOutEverywhere() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/sign-in");
}

export interface PasswordFormState {
  error?: string;
  sentTo?: string;
  email?: string;
}

/**
 * Emails a link to set a new password. Says the same whether or not the
 * address has an account, so the form can't be used to find out who does.
 */
export async function requestPasswordReset(
  _prev: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const { t } = await getI18n();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return { email, error: t("auth.invalidEmail") };

  const supabase = await createSupabaseServerClient();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });
  if (error && error.code !== "user_not_found") {
    logError("auth.requestPasswordReset", error);
    if (error.status === 429) return { email, error: t("errors.generic") };
  }
  return { sentTo: email };
}

/** Sets a new password for the signed-in account (after the email link, or from Settings). */
export async function updatePassword(
  _prev: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const { t } = await getI18n();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: t("auth.passwordLength", { min: MIN_PASSWORD_LENGTH }) };
  }
  if (password !== confirm) return { error: t("auth.passwordsDiffer") };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { error: t("auth.samePassword") };
    if (error.code === "weak_password") return { error: t("auth.weakPassword") };
    if (error.code === "session_not_found" || error.status === 401) {
      redirect("/sign-in?link-expired=1");
    }
    logError("auth.updatePassword", error);
    return { error: t("errors.generic") };
  }
  redirect("/projects");
}
