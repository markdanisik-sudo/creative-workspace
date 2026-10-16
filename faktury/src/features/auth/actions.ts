"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AuthFormState {
  email?: string;
  error?: string;
}

/** Only same-site paths, never "//evil.com". */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function signIn(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { email, error: "Vyplň e-mail a heslo." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { email, error: "E-mail nebo heslo nesedí." };
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!/^\S+@\S+\.\S+$/.test(email)) return { email, error: "Zadej platný e-mail." };
  if (password.length < 10) return { email, error: "Heslo musí mít aspoň 10 znaků." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    const closed = /database error|sign_up_closed/i.test(error.message);
    return {
      email,
      error: closed ? "Účet už existuje — přihlas se." : "Účet se nepodařilo založit.",
    };
  }
  if (!data.session) {
    return { email, error: "Potvrď e-mail odkazem, který ti přišel, a pak se přihlas." };
  }
  redirect("/nastaveni?vitej=1");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

export async function signOutEverywhere() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/sign-in");
}
