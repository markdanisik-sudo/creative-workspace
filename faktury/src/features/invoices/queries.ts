import "server-only";
import { cache } from "react";
import { getStore } from "@/lib/store";

export type { InvoiceRow } from "@/lib/store/types";

/** Every invoice, newest first, with just what lists and charts need. */
export const listInvoiceRows = cache(async () => (await getStore()).listInvoiceRows());

export const getInvoice = cache(async (id: string) => (await getStore()).getInvoice(id));

/** Full invoices, optionally of one year (by issue date), oldest first. */
export async function listInvoices(year: number | null) {
  return (await getStore()).listInvoices(year);
}

/** All invoice numbers, for continuing the numbering. */
export async function listInvoiceNumbers(): Promise<string[]> {
  const rows = await listInvoiceRows();
  return rows.filter((row) => row.kind === "invoice").map((row) => row.number);
}
