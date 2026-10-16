"use server";

import { revalidatePath } from "next/cache";
import { describeError, fail, ok, type Result } from "@/lib/result";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";
import { cleanParty } from "@/lib/validate";

export async function saveContact(
  input: unknown,
  id: string | null,
): Promise<Result<{ id: string }>> {
  await requireUser();
  const party = cleanParty(input);
  if (!party.name) return fail("Vyplň název.");
  const values = {
    name: party.name,
    street: party.street ?? null,
    city: party.city ?? null,
    zip: party.zip ?? null,
    country: party.country ?? "CZ",
    ico: party.ico ?? null,
    dic: party.dic ?? null,
    email: party.email ?? null,
    phone: party.phone ?? null,
  };
  const supabase = await createSupabaseServerClient();
  const { data, error } = id
    ? await supabase.from("contacts").update(values).eq("id", id).select("id").single()
    : await supabase.from("contacts").insert(values).select("id").single();
  if (error || !data) {
    return fail(error?.code === "23505" ? "Kontakt s tímto IČO už máš." : describeError(error));
  }
  revalidatePath("/", "layout");
  return ok({ id: data.id });
}

export async function deleteContact(id: string): Promise<Result> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("contacts").delete().eq("id", id).select("id");
  if (error || !data?.length) return fail(describeError(error ?? { code: "42501" }));
  revalidatePath("/", "layout");
  return ok(undefined);
}
