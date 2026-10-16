"use server";

import { revalidatePath } from "next/cache";
import { getBusiness, supplierSnapshot } from "@/features/business/queries";
import { listInvoiceNumbers } from "@/features/invoices/queries";
import { nextInvoiceNumber } from "@/lib/invoice/numbering";
import type { InvoiceData, Party } from "@/lib/invoice/types";
import { describeError, fail, ok, type Result } from "@/lib/result";
import { requireUser } from "@/lib/session";
import { getStore, type InvoiceWrite, type Store } from "@/lib/store";
import { validateInvoice } from "@/lib/validate";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function refresh() {
  revalidatePath("/", "layout");
}

/** Finds the customer among contacts (by IČO, then name) or adds them. */
async function upsertContact(store: Store, customer: Party): Promise<string | null> {
  if (!customer.name || customer.name === "—") return null;
  const existing = await store.findContact(customer.ico ?? null, customer.name);
  if (existing) return existing;
  try {
    return await store.insertContact({
      name: customer.name,
      street: customer.street ?? null,
      city: customer.city ?? null,
      zip: customer.zip ?? null,
      country: customer.country ?? "CZ",
      ico: customer.ico ?? null,
      dic: customer.dic ?? null,
      email: customer.email ?? null,
      phone: customer.phone ?? null,
    });
  } catch {
    return null;
  }
}

/** Creates (no id) or updates an invoice made in the app. */
export async function saveInvoice(
  input: unknown,
  id: string | null,
  saveContact: boolean,
): Promise<Result<{ id: string }>> {
  await requireUser();
  const checked = validateInvoice({ ...(input as object), source: "app" });
  if (!checked.ok) return fail(checked.error);
  const invoice = checked.invoice;
  const store = await getStore();

  try {
    const contactId = saveContact ? await upsertContact(store, invoice.customer) : null;
    if (id) {
      const current = await store.getInvoice(id);
      if (!current) return fail("Faktura neexistuje.");
      // Keep who issued it and where it came from.
      const { supplier: _supplier, source: _source, external_id: _external, ...changes } = invoice;
      void _supplier;
      void _source;
      void _external;
      const updated = await store.updateInvoice(id, {
        ...changes,
        ...(contactId ? { contact_id: contactId } : {}),
      });
      if (!updated) return fail(describeError({ code: "42501" }));
      refresh();
      return ok({ id });
    }
    invoice.supplier = supplierSnapshot(await getBusiness());
    const [newId] = await store.insertInvoices([{ ...invoice, contact_id: contactId }]);
    refresh();
    return ok({ id: newId });
  } catch (error) {
    return fail(describeError(error));
  }
}

export async function suggestNumber(year: number): Promise<string> {
  await requireUser();
  return nextInvoiceNumber(await listInvoiceNumbers(), year);
}

export async function setInvoicePaid(id: string, paidOn: string | null): Promise<Result> {
  await requireUser();
  if (paidOn !== null && !DATE.test(paidOn)) return fail("Neplatné datum.");
  try {
    if (!(await (await getStore()).updateInvoice(id, { paid_on: paidOn }))) {
      return fail(describeError({ code: "42501" }));
    }
  } catch (error) {
    return fail(describeError(error));
  }
  refresh();
  return ok(undefined);
}

export async function deleteInvoice(id: string): Promise<Result> {
  await requireUser();
  try {
    if (!(await (await getStore()).deleteInvoice(id)))
      return fail(describeError({ code: "42501" }));
  } catch (error) {
    return fail(describeError(error));
  }
  refresh();
  return ok(undefined);
}

export interface ImportSummary {
  added: number;
  duplicates: number;
  errors: string[];
}

/**
 * Saves a batch of invoices read from an export. Invoices already here (same
 * number, or same ISDOC document) are left alone, so importing twice is safe.
 */
export async function importInvoices(
  input: unknown[],
  options: { markPastDuePaid: boolean },
): Promise<Result<ImportSummary>> {
  await requireUser();
  if (!Array.isArray(input) || input.length > 500) return fail("Příliš mnoho faktur najednou.");
  const store = await getStore();
  const business = await getBusiness();

  const checked: InvoiceData[] = [];
  const summary: ImportSummary = { added: 0, duplicates: 0, errors: [] };
  for (const raw of input) {
    const result = validateInvoice(raw);
    if (result.ok) checked.push(result.invoice);
    else summary.errors.push(result.error);
  }

  try {
    const { keys, external } = await store.existingInvoices(
      checked.map((invoice) => invoice.number),
      checked
        .map((invoice) => invoice.external_id)
        .filter((value): value is string => Boolean(value)),
    );

    const today = new Date().toISOString().slice(0, 10);
    const contactIds = new Map<string, string | null>();
    const rows: InvoiceWrite[] = [];
    for (const invoice of checked) {
      const key = `${invoice.kind}|${invoice.number}`;
      if (keys.has(key) || (invoice.external_id && external.has(invoice.external_id))) {
        summary.duplicates++;
        continue;
      }
      keys.add(key);
      if (invoice.external_id) external.add(invoice.external_id);
      // CSV rows carry no supplier: it's this business.
      if (!invoice.supplier.name) invoice.supplier = supplierSnapshot(business);
      if (options.markPastDuePaid && !invoice.paid_on && invoice.due_on < today) {
        invoice.paid_on = invoice.due_on;
      }
      // Customers become contacts, once each.
      const contactKey = invoice.customer.ico || invoice.customer.name.toLowerCase();
      if (!contactIds.has(contactKey)) {
        contactIds.set(contactKey, await upsertContact(store, invoice.customer));
      }
      rows.push({ ...invoice, contact_id: contactIds.get(contactKey) ?? null });
    }

    await store.insertInvoices(rows);
    summary.added = rows.length;
  } catch (error) {
    return fail(describeError(error));
  }
  refresh();
  return ok(summary);
}
