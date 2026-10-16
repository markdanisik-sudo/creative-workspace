"use server";

import { revalidatePath } from "next/cache";
import { getBusiness, supplierSnapshot } from "@/features/business/queries";
import { listInvoiceNumbers } from "@/features/invoices/queries";
import { nextInvoiceNumber } from "@/lib/invoice/numbering";
import type { InvoiceData, Party } from "@/lib/invoice/types";
import { describeError, fail, ok, type Result } from "@/lib/result";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";
import { validateInvoice } from "@/lib/validate";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function refresh() {
  revalidatePath("/", "layout");
}

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** Finds the customer among contacts (by IČO, then name) or adds them. */
async function upsertContact(supabase: Supabase, customer: Party): Promise<string | null> {
  if (!customer.name) return null;
  const query = supabase.from("contacts").select("id");
  const { data: existing } = customer.ico
    ? await query.eq("ico", customer.ico).maybeSingle()
    : await query
        .ilike("name", customer.name.replace(/[%_\\]/g, "\\$&"))
        .limit(1)
        .maybeSingle();
  if (existing) return existing.id;
  const { data } = await supabase
    .from("contacts")
    .insert({
      name: customer.name,
      street: customer.street ?? null,
      city: customer.city ?? null,
      zip: customer.zip ?? null,
      country: customer.country ?? "CZ",
      ico: customer.ico ?? null,
      dic: customer.dic ?? null,
      email: customer.email ?? null,
      phone: customer.phone ?? null,
    })
    .select("id")
    .single();
  return data?.id ?? null;
}

function row(invoice: InvoiceData) {
  return {
    kind: invoice.kind,
    number: invoice.number,
    variable_symbol: invoice.variable_symbol,
    issued_on: invoice.issued_on,
    taxable_on: invoice.taxable_on,
    due_on: invoice.due_on,
    paid_on: invoice.paid_on,
    currency: invoice.currency,
    exchange_rate: invoice.exchange_rate,
    supplier: invoice.supplier as never,
    customer: invoice.customer as never,
    items: invoice.items as never,
    subtotal: invoice.subtotal,
    vat: invoice.vat,
    total: invoice.total,
    note: invoice.note,
    source: invoice.source,
    external_id: invoice.external_id,
  };
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
  const business = await getBusiness();
  if (!id) invoice.supplier = supplierSnapshot(business);

  const supabase = await createSupabaseServerClient();
  const contactId = saveContact ? await upsertContact(supabase, invoice.customer) : null;

  if (id) {
    const { data: current } = await supabase
      .from("invoices")
      .select("supplier, source, external_id")
      .eq("id", id)
      .maybeSingle();
    if (!current) return fail("Faktura neexistuje.");
    const { error } = await supabase
      .from("invoices")
      .update({
        ...row(invoice),
        // Keep where it came from and who issued it.
        supplier: current.supplier,
        source: current.source,
        external_id: current.external_id,
        ...(contactId ? { contact_id: contactId } : {}),
      })
      .eq("id", id);
    if (error) return fail(describeError(error));
    refresh();
    return ok({ id });
  }

  const { data, error } = await supabase
    .from("invoices")
    .insert({ ...row(invoice), contact_id: contactId })
    .select("id")
    .single();
  if (error || !data) return fail(describeError(error));
  refresh();
  return ok({ id: data.id });
}

export async function suggestNumber(year: number): Promise<string> {
  await requireUser();
  return nextInvoiceNumber(await listInvoiceNumbers(), year);
}

export async function setInvoicePaid(id: string, paidOn: string | null): Promise<Result> {
  await requireUser();
  if (paidOn !== null && !DATE.test(paidOn)) return fail("Neplatné datum.");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("invoices")
    .update({ paid_on: paidOn })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) return fail(describeError(error ?? { code: "42501" }));
  refresh();
  return ok(undefined);
}

export async function deleteInvoice(id: string): Promise<Result> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("invoices").delete().eq("id", id).select("id");
  if (error || !data?.length) return fail(describeError(error ?? { code: "42501" }));
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
  const supabase = await createSupabaseServerClient();
  const business = await getBusiness();

  const { data: existing, error: readError } = await supabase
    .from("invoices")
    .select("kind, number, external_id")
    .in(
      "number",
      input.map((item) => String((item as { number?: unknown })?.number ?? "")).slice(0, 500),
    );
  if (readError) return fail(describeError(readError));
  const taken = new Set((existing ?? []).map((item) => `${item.kind}|${item.number}`));
  const takenExternal = new Set((existing ?? []).map((item) => item.external_id).filter(Boolean));
  if (input.some((item) => (item as { external_id?: unknown })?.external_id)) {
    const ids = input
      .map((item) => (item as { external_id?: unknown })?.external_id)
      .filter((value): value is string => typeof value === "string");
    const { data } = await supabase.from("invoices").select("external_id").in("external_id", ids);
    for (const item of data ?? []) takenExternal.add(item.external_id);
  }

  const today = new Date().toISOString().slice(0, 10);
  const summary: ImportSummary = { added: 0, duplicates: 0, errors: [] };
  const rows: ReturnType<typeof row>[] = [];
  const contactIds = new Map<string, string | null>();

  for (const raw of input) {
    const checked = validateInvoice(raw);
    if (!checked.ok) {
      summary.errors.push(checked.error);
      continue;
    }
    const invoice = checked.invoice;
    const key = `${invoice.kind}|${invoice.number}`;
    if (taken.has(key) || (invoice.external_id && takenExternal.has(invoice.external_id))) {
      summary.duplicates++;
      continue;
    }
    taken.add(key);
    if (invoice.external_id) takenExternal.add(invoice.external_id);
    // CSV rows carry no supplier: it's this business.
    if (!invoice.supplier.name) invoice.supplier = supplierSnapshot(business);
    if (options.markPastDuePaid && !invoice.paid_on && invoice.due_on < today) {
      invoice.paid_on = invoice.due_on;
    }
    rows.push(row(invoice));
  }

  // Customers become contacts, once each.
  const withContacts = [];
  for (const item of rows) {
    const customer = item.customer as unknown as Party;
    const contactKey = customer.ico || customer.name.toLowerCase();
    if (!contactIds.has(contactKey)) {
      contactIds.set(
        contactKey,
        customer.name !== "—" ? await upsertContact(supabase, customer) : null,
      );
    }
    withContacts.push({ ...item, contact_id: contactIds.get(contactKey) ?? null });
  }

  if (withContacts.length > 0) {
    const { error } = await supabase.from("invoices").insert(withContacts);
    if (error) return fail(describeError(error));
    summary.added = withContacts.length;
  }
  refresh();
  return ok(summary);
}
