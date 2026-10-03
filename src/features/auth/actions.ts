"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { friendlyErrors, logError } from "@/lib/errors";

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

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { email, password } = readCredentials(formData);
  if (!EMAIL_PATTERN.test(email)) {
    return { email, fieldErrors: { email: "Enter a valid email address." } };
  }
  if (!password) return { email, fieldErrors: { password: "Enter your password." } };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "invalid_credentials") {
      return { email, error: "That email and password don't match." };
    }
    if (error.code === "email_not_confirmed") {
      return { email, error: "Please confirm your email first. Check your inbox for the link." };
    }
    logError("auth.signIn", error);
    return { email, error: friendlyErrors.generic };
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { email, password } = readCredentials(formData);
  const name = String(formData.get("name") ?? "")
    .trim()
    .slice(0, 80);

  const fieldErrors: AuthFormState["fieldErrors"] = {};
  if (!EMAIL_PATTERN.test(email)) fieldErrors.email = "Enter a valid email address.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    fieldErrors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (Object.keys(fieldErrors).length > 0) return { email, name, fieldErrors };

  const supabase = await createSupabaseServerClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: name || null },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    if (error.code === "user_already_exists") {
      return { email, name, error: "An account with this email already exists. Try signing in." };
    }
    if (error.code === "weak_password") {
      return { email, name, fieldErrors: { password: "Choose a stronger password." } };
    }
    logError("auth.signUp", error);
    return { email, name, error: friendlyErrors.generic };
  }

  // With email confirmation enabled there is no session until the link is clicked.
  if (!data.session) redirect(`/sign-in?check-email=1&email=${encodeURIComponent(email)}`);
  redirect("/projects");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
