"use server";

import { revalidatePath } from "next/cache";
import { isValidIban } from "@/lib/payment";
import { describeError, fail, ok, type Result } from "@/lib/result";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";
import { cleanParty } from "@/lib/validate";

export async function saveBusiness(input: unknown): Promise<Result> {
  const user = await requireUser();
  const raw = (input ?? {}) as Record<string, unknown>;
  const party = cleanParty(input);
  if (!party.name) return fail("Vyplň název nebo jméno.");
  if (party.iban && !isValidIban(party.iban)) return fail("IBAN nevypadá správně.");
  if (
    party.bank_account &&
    !/^(\d{1,6}-)?\d{2,10}\/\d{4}$/.test(party.bank_account.replace(/\s+/g, ""))
  ) {
    return fail("Číslo účtu zadej ve tvaru 123456789/0100.");
  }
  const dueDays = Math.round(Number(raw.due_days));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("businesses").upsert({
    owner_id: user.id,
    name: party.name,
    street: party.street ?? null,
    city: party.city ?? null,
    zip: party.zip ?? null,
    country: party.country ?? "CZ",
    ico: party.ico ?? null,
    dic: party.dic ?? null,
    registry: party.registry ?? null,
    bank_account: party.bank_account?.replace(/\s+/g, "") ?? null,
    iban: party.iban?.replace(/\s+/g, "").toUpperCase() ?? null,
    bic: party.bic?.toUpperCase() ?? null,
    email: party.email ?? null,
    phone: party.phone ?? null,
    web: party.web ?? null,
    vat_payer: party.vat_payer ?? false,
    due_days: Number.isFinite(dueDays) && dueDays >= 0 && dueDays <= 365 ? dueDays : 14,
    invoice_note:
      typeof raw.invoice_note === "string" ? raw.invoice_note.trim().slice(0, 1000) || null : null,
  });
  if (error) return fail(describeError(error));
  revalidatePath("/", "layout");
  return ok(undefined);
}
