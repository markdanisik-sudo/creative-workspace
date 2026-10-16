import "server-only";
import { cache } from "react";
import type { Invoice, InvoiceLine, Party } from "@/lib/invoice/types";
import type { Database } from "@/lib/supabase/database.types";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface InvoiceRow {
  id: string;
  kind: "invoice" | "credit_note";
  number: string;
  issued_on: string;
  due_on: string;
  paid_on: string | null;
  currency: string;
  total: number;
  total_czk: number;
  customer_name: string;
  customer_ico: string | null;
}

/** Every invoice, newest first, with just what lists and charts need. */
export const listInvoiceRows = cache(async (): Promise<InvoiceRow[]> => {
  const supabase = await createSupabaseServerClient();
  const rows = await fetchAll((from, to) =>
    supabase
      .from("invoices")
      .select("id, kind, number, issued_on, due_on, paid_on, currency, total, total_czk, customer")
      .order("issued_on", { ascending: false })
      .order("number", { ascending: false })
      .range(from, to),
  );
  return rows.map((row) => {
    const customer = (row.customer ?? {}) as Partial<Party>;
    return {
      id: row.id,
      kind: row.kind as InvoiceRow["kind"],
      number: row.number,
      issued_on: row.issued_on,
      due_on: row.due_on,
      paid_on: row.paid_on,
      currency: row.currency,
      total: Number(row.total),
      total_czk: Number(row.total_czk),
      customer_name: customer.name || "—",
      customer_ico: customer.ico ?? null,
    };
  });
});

type InvoiceDbRow = Database["public"]["Tables"]["invoices"]["Row"];

function toInvoice(data: InvoiceDbRow): Invoice {
  return {
    id: data.id,
    kind: data.kind as Invoice["kind"],
    number: data.number,
    variable_symbol: data.variable_symbol,
    issued_on: data.issued_on,
    taxable_on: data.taxable_on,
    due_on: data.due_on,
    paid_on: data.paid_on,
    currency: data.currency,
    exchange_rate: Number(data.exchange_rate),
    contact_id: data.contact_id,
    supplier: data.supplier as unknown as Party,
    customer: data.customer as unknown as Party,
    items: (data.items as unknown as InvoiceLine[]).map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      vat_rate: Number(item.vat_rate ?? 0),
    })),
    subtotal: Number(data.subtotal),
    vat: Number(data.vat),
    total: Number(data.total),
    total_czk: Number(data.total_czk),
    note: data.note,
    source: data.source as Invoice["source"],
    external_id: data.external_id,
    created_at: data.created_at,
  };
}

export const getInvoice = cache(async (id: string): Promise<Invoice | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  return data ? toInvoice(data) : null;
});

/** Full invoices, optionally of one year (by issue date), oldest first. */
export async function listInvoices(year: number | null): Promise<Invoice[]> {
  const supabase = await createSupabaseServerClient();
  const rows = await fetchAll((from, to) => {
    let query = supabase.from("invoices").select("*");
    if (year) query = query.gte("issued_on", `${year}-01-01`).lte("issued_on", `${year}-12-31`);
    return query.order("issued_on").order("number").range(from, to);
  });
  return rows.map(toInvoice);
}

/** All invoice numbers of a kind, for continuing the numbering. */
export async function listInvoiceNumbers(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const rows = await fetchAll((from, to) =>
    supabase.from("invoices").select("number").eq("kind", "invoice").range(from, to),
  );
  return rows.map((row) => row.number);
}
