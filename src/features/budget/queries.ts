import "server-only";
import { cache } from "react";
import { logError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Budget, ClientBilling, DeliveryLink, StudioBilling } from "./types";

export const getStudioBilling = cache(async (): Promise<StudioBilling> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("studio_billing").select("*").maybeSingle();
  if (error) logError("budget.studioBilling", error);
  return {
    name: data?.name ?? "",
    address: data?.address ?? null,
    ico: data?.ico ?? null,
    dic: data?.dic ?? null,
    iban: data?.iban ?? null,
    bankAccount: data?.bank_account ?? null,
    email: data?.email ?? null,
    phone: data?.phone ?? null,
    vatPayer: data?.vat_payer ?? false,
    vatRate: Number(data?.vat_rate ?? 21),
    dueDays: data?.due_days ?? 14,
    invoiceNote: data?.invoice_note ?? null,
  };
});

export async function getBudget(projectId: string): Promise<Budget> {
  const supabase = await createSupabaseServerClient();
  const [budget, lines, invoices] = await Promise.all([
    supabase
      .from("project_budgets")
      .select("currency, client_billing, approved_at")
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("budget_items")
      .select("id, title, quantity, unit, unit_price")
      .eq("project_id", projectId)
      .order("position")
      .order("created_at"),
    supabase
      .from("invoices")
      .select("id, number, issued_on, due_on, total, currency, paid_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
  ]);
  for (const [name, result] of Object.entries({ budget, lines, invoices })) {
    if (result.error) logError(`budget.${name}`, result.error, { projectId });
  }
  return {
    currency: budget.data?.currency ?? "CZK",
    clientBilling: (budget.data?.client_billing ?? {}) as ClientBilling,
    approvedAt: budget.data?.approved_at ?? null,
    lines: (lines.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      quantity: Number(row.quantity),
      unit: row.unit,
      unitPrice: Number(row.unit_price),
    })),
    invoices: (invoices.data ?? []).map((row) => ({
      id: row.id,
      number: row.number,
      issuedOn: row.issued_on,
      dueOn: row.due_on,
      total: Number(row.total),
      currency: row.currency,
      paidAt: row.paid_at,
    })),
  };
}

export const listDeliveryLinks = cache(async (projectId: string): Promise<DeliveryLink[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_links")
    .select("id, label, url")
    .eq("project_id", projectId)
    .eq("kind", "delivery")
    .order("created_at");
  if (error) logError("budget.links", error, { projectId });
  return data ?? [];
});
