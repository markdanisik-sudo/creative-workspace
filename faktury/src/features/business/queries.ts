import "server-only";
import { cache } from "react";
import type { Party } from "@/lib/invoice/types";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";

export interface Business extends Party {
  name: string;
  vat_payer: boolean;
  due_days: number;
  invoice_note: string | null;
}

const EMPTY: Business = {
  name: "",
  country: "CZ",
  vat_payer: false,
  due_days: 14,
  invoice_note: null,
};

/** The business issuing invoices (empty until filled in Settings). */
export const getBusiness = cache(async (): Promise<Business & { complete: boolean }> => {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();
  const business: Business = data
    ? {
        name: data.name,
        street: data.street,
        city: data.city,
        zip: data.zip,
        country: data.country,
        ico: data.ico,
        dic: data.dic,
        registry: data.registry,
        bank_account: data.bank_account,
        iban: data.iban,
        bic: data.bic,
        email: data.email,
        phone: data.phone,
        web: data.web,
        vat_payer: data.vat_payer,
        due_days: data.due_days,
        invoice_note: data.invoice_note,
      }
    : EMPTY;
  return {
    ...business,
    complete: Boolean(business.name && (business.bank_account || business.iban)),
  };
});

/** The supplier block snapshotted onto a new invoice. */
export function supplierSnapshot(business: Business): Party {
  const { invoice_note: _note, due_days: _due, ...party } = business;
  void _note;
  void _due;
  return party;
}
