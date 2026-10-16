"use server";

import { revalidatePath } from "next/cache";
import { describeError, fail, ok, type Result } from "@/lib/result";
import { requireUser } from "@/lib/session";
import { getStore, StoreError } from "@/lib/store";
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
  const store = await getStore();
  try {
    if (id) {
      if (!(await store.updateContact(id, values))) return fail("Kontakt neexistuje.");
    } else {
      id = await store.insertContact(values);
    }
  } catch (error) {
    if (error instanceof StoreError && error.code === "23505") {
      return fail("Kontakt s tímto IČO už máš.");
    }
    return fail(describeError(error));
  }
  revalidatePath("/", "layout");
  return ok({ id });
}

export async function deleteContact(id: string): Promise<Result> {
  await requireUser();
  try {
    if (!(await (await getStore()).deleteContact(id)))
      return fail(describeError({ code: "42501" }));
  } catch (error) {
    return fail(describeError(error));
  }
  revalidatePath("/", "layout");
  return ok(undefined);
}
