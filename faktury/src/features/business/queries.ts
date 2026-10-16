import "server-only";
import { cache } from "react";
import type { Party } from "@/lib/invoice/types";
import { requireUser } from "@/lib/session";
import { getStore } from "@/lib/store";

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
  await requireUser();
  const record = await (await getStore()).getBusiness();
  const business: Business = record ?? EMPTY;
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
  delete (party as { complete?: boolean }).complete;
  return party;
}
