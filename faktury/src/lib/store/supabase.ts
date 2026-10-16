import "server-only";
import type { Invoice, InvoiceLine, Party } from "@/lib/invoice/types";
import type { Database } from "@/lib/supabase/database.types";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { requireUser } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StoreError, type InvoiceRow, type InvoiceWrite, type Store } from "./types";

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

function toDb(invoice: Partial<InvoiceWrite>) {
  return {
    ...invoice,
    supplier: invoice.supplier as never,
    customer: invoice.customer as never,
    items: invoice.items as never,
  };
}

function check(error: { code?: string; message?: string } | null) {
  if (error) throw new StoreError(error.code ?? "unknown", error.message);
}

/** Data in Supabase, scoped to the signed-in account by row-level security. */
export async function createSupabaseStore(): Promise<Store> {
  const supabase = await createSupabaseServerClient();

  return {
    async getBusiness() {
      const user = await requireUser();
      const { data } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (!data) return null;
      const { owner_id: _owner, updated_at: _updated, ...business } = data;
      void _owner;
      void _updated;
      return business;
    },

    async saveBusiness(business) {
      const user = await requireUser();
      const { error } = await supabase
        .from("businesses")
        .upsert({ owner_id: user.id, ...business });
      check(error);
    },

    async listContacts() {
      const { data } = await supabase
        .from("contacts")
        .select("id, name, street, city, zip, country, ico, dic, email, phone")
        .order("name");
      return data ?? [];
    },

    async findContact(ico, name) {
      const query = supabase.from("contacts").select("id");
      const { data } = ico
        ? await query.eq("ico", ico).maybeSingle()
        : await query
            .ilike("name", name.replace(/[%_\\]/g, "\\$&"))
            .limit(1)
            .maybeSingle();
      return data?.id ?? null;
    },

    async insertContact(contact) {
      const { data, error } = await supabase.from("contacts").insert(contact).select("id").single();
      check(error);
      return data!.id;
    },

    async updateContact(id, contact) {
      const { data, error } = await supabase
        .from("contacts")
        .update(contact)
        .eq("id", id)
        .select("id");
      check(error);
      return Boolean(data?.length);
    },

    async deleteContact(id) {
      const { data, error } = await supabase.from("contacts").delete().eq("id", id).select("id");
      check(error);
      return Boolean(data?.length);
    },

    async listInvoiceRows() {
      const rows = await fetchAll((from, to) =>
        supabase
          .from("invoices")
          .select(
            "id, kind, number, issued_on, due_on, paid_on, currency, total, total_czk, customer, contact_id",
          )
          .order("issued_on", { ascending: false })
          .order("number", { ascending: false })
          .range(from, to),
      );
      return rows.map((row): InvoiceRow => {
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
          contact_id: row.contact_id,
        };
      });
    },

    async getInvoice(id) {
      const { data } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
      return data ? toInvoice(data) : null;
    },

    async listInvoices(year) {
      const rows = await fetchAll((from, to) => {
        let query = supabase.from("invoices").select("*");
        if (year) query = query.gte("issued_on", `${year}-01-01`).lte("issued_on", `${year}-12-31`);
        return query.order("issued_on").order("number").range(from, to);
      });
      return rows.map(toInvoice);
    },

    async existingInvoices(numbers, externalIds) {
      const keys = new Set<string>();
      const external = new Set<string>();
      if (numbers.length > 0) {
        const { data, error } = await supabase
          .from("invoices")
          .select("kind, number, external_id")
          .in("number", numbers);
        check(error);
        for (const item of data ?? []) {
          keys.add(`${item.kind}|${item.number}`);
          if (item.external_id) external.add(item.external_id);
        }
      }
      if (externalIds.length > 0) {
        const { data, error } = await supabase
          .from("invoices")
          .select("external_id")
          .in("external_id", externalIds);
        check(error);
        for (const item of data ?? []) if (item.external_id) external.add(item.external_id);
      }
      return { keys, external };
    },

    async insertInvoices(invoices) {
      if (invoices.length === 0) return [];
      const { data, error } = await supabase
        .from("invoices")
        .insert(invoices.map((invoice) => toDb(invoice) as InvoiceWrite as never))
        .select("id");
      check(error);
      return (data ?? []).map((item) => item.id);
    },

    async updateInvoice(id, invoice) {
      const { data, error } = await supabase
        .from("invoices")
        .update(toDb(invoice) as never)
        .eq("id", id)
        .select("id");
      check(error);
      return Boolean(data?.length);
    },

    async deleteInvoice(id) {
      const { data, error } = await supabase.from("invoices").delete().eq("id", id).select("id");
      check(error);
      return Boolean(data?.length);
    },
  };
}
