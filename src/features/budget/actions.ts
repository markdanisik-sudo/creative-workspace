"use server";

import { revalidatePath } from "next/cache";
import { logError, type ActionResult } from "@/lib/errors";
import { getI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { czechAccountToIban, isValidIban, normalizeIban } from "./payment";
import { CLIENT_BILLING_FIELDS, type ClientBilling } from "./types";

function clean(value: unknown, max: number): string {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function cleanOptional(value: unknown, max: number): string | null {
  return clean(value, max) || null;
}

function toNumber(value: unknown): number {
  const number = Number(
    String(value ?? "")
      .replace(/\s/g, "")
      .replace(",", "."),
  );
  return Number.isFinite(number) ? number : NaN;
}

async function fail(context: string, error: unknown, extra?: Record<string, unknown>) {
  const { t } = await getI18n();
  logError(context, error, extra);
  return { ok: false, error: t("errors.generic") } as const;
}

function refresh(projectId: string) {
  revalidatePath(`/projects/${projectId}`, "layout");
}

/* Budget lines (studio) -------------------------------------------------- */

export interface BudgetLineInput {
  title: string;
  quantity: string;
  unit: string;
  unitPrice: string;
}

export async function saveBudgetLine(
  projectId: string,
  lineId: string | null,
  input: BudgetLineInput,
): Promise<ActionResult> {
  const { t } = await getI18n();
  const title = clean(input.title, 200);
  const quantity = toNumber(input.quantity || "1");
  const unitPrice = toNumber(input.unitPrice || "0");
  if (!title || !(quantity > 0) || !(unitPrice >= 0)) {
    return { ok: false, error: t("budget.invalidLine") };
  }
  const row = {
    title,
    quantity: Math.round(quantity * 100) / 100,
    unit: cleanOptional(input.unit, 20),
    unit_price: Math.round(unitPrice * 100) / 100,
  };
  const supabase = await createSupabaseServerClient();
  const { error } = lineId
    ? await supabase.from("budget_items").update(row).eq("id", lineId)
    : await supabase
        .from("budget_items")
        .insert({ ...row, project_id: projectId, position: Date.now() / 1000 });
  if (error) return fail("budget.saveLine", error, { projectId });
  refresh(projectId);
  return { ok: true, data: null };
}

export async function deleteBudgetLine(projectId: string, lineId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("budget_items").delete().eq("id", lineId);
  if (error) return fail("budget.deleteLine", error, { lineId });
  refresh(projectId);
  return { ok: true, data: null };
}

/** The studio prices an add-on that was "price on request". */
export async function setRequestPrice(
  projectId: string,
  requestId: string,
  rawPrice: string,
): Promise<ActionResult> {
  const { t } = await getI18n();
  const price = toNumber(rawPrice);
  if (!(price >= 0)) return { ok: false, error: t("budget.invalidLine") };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("project_requests")
    .update({ unit_price: Math.round(price * 100) / 100 })
    .eq("id", requestId);
  if (error) return fail("budget.setRequestPrice", error, { requestId });
  refresh(projectId);
  return { ok: true, data: null };
}

/* Client side: billing details and approval ------------------------------- */

export async function saveClientBilling(
  projectId: string,
  billing: ClientBilling,
): Promise<ActionResult> {
  const content = Object.fromEntries(
    CLIENT_BILLING_FIELDS.flatMap((field) => {
      const value = clean(billing[field], field === "address" ? 500 : 200);
      return value ? [[field, value]] : [];
    }),
  );
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("project_budgets")
    .upsert({ project_id: projectId, client_billing: content }, { onConflict: "project_id" });
  if (error) return fail("budget.saveClientBilling", error, { projectId });
  refresh(projectId);
  return { ok: true, data: null };
}

export async function approveBudget(projectId: string, approve: boolean): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getClaims();
  const { error } = await supabase.from("project_budgets").upsert(
    {
      project_id: projectId,
      approved_at: approve ? new Date().toISOString() : null,
      approved_by: approve ? (auth?.claims?.sub ?? null) : null,
    },
    { onConflict: "project_id" },
  );
  if (error) return fail("budget.approve", error, { projectId });
  refresh(projectId);
  return { ok: true, data: null };
}

/* Invoices ----------------------------------------------------------------- */

export async function issueInvoice(projectId: string): Promise<ActionResult<{ id: string }>> {
  const { t } = await getI18n();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_invoice", { target: projectId });
  if (error || !data) {
    const message = error?.message ?? "";
    if (message.includes("customer_missing"))
      return { ok: false, error: t("budget.customerMissing") };
    if (message.includes("supplier_missing"))
      return { ok: false, error: t("budget.supplierMissing") };
    if (message.includes("empty_budget")) return { ok: false, error: t("budget.emptyBudget") };
    return fail("budget.issueInvoice", error, { projectId });
  }
  refresh(projectId);
  return { ok: true, data: { id: data } };
}

export async function setInvoicePaid(
  projectId: string,
  invoiceId: string,
  paid: boolean,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("invoices")
    .update({ paid_at: paid ? new Date().toISOString() : null })
    .eq("id", invoiceId);
  if (error) return fail("budget.setPaid", error, { invoiceId });
  refresh(projectId);
  return { ok: true, data: null };
}

export async function deleteInvoice(projectId: string, invoiceId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("invoices").delete().eq("id", invoiceId);
  if (error) return fail("budget.deleteInvoice", error, { invoiceId });
  refresh(projectId);
  return { ok: true, data: null };
}

/* Studio billing (Settings) ----------------------------------------------- */

export interface StudioBillingInput {
  name: string;
  address: string;
  ico: string;
  dic: string;
  iban: string;
  bankAccount: string;
  email: string;
  phone: string;
  vatPayer: boolean;
  vatRate: string;
  dueDays: string;
  invoiceNote: string;
}

export async function saveStudioBilling(input: StudioBillingInput): Promise<ActionResult> {
  const { t } = await getI18n();
  const iban = clean(input.iban, 40);
  const bankAccount = clean(input.bankAccount, 40);
  if (iban && !isValidIban(iban)) return { ok: false, error: t("billing.invalidIban") };
  if (!iban && bankAccount && !czechAccountToIban(bankAccount)) {
    return { ok: false, error: t("billing.invalidAccount") };
  }
  const vatRate = toNumber(input.vatRate || "21");
  const dueDays = Math.round(toNumber(input.dueDays || "14"));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("studio_billing")
    .update({
      name: clean(input.name, 200),
      address: cleanOptional(input.address, 500),
      ico: cleanOptional(input.ico, 20),
      dic: cleanOptional(input.dic, 20),
      iban: iban ? normalizeIban(iban) : null,
      bank_account: cleanOptional(bankAccount, 40),
      email: cleanOptional(input.email, 200),
      phone: cleanOptional(input.phone, 50),
      vat_payer: input.vatPayer,
      vat_rate: Number.isFinite(vatRate) ? Math.min(100, Math.max(0, vatRate)) : 21,
      due_days: Number.isFinite(dueDays) ? Math.min(365, Math.max(0, dueDays)) : 14,
      invoice_note: cleanOptional(input.invoiceNote, 1000),
    })
    .eq("id", true);
  if (error) return fail("budget.saveStudioBilling", error);
  revalidatePath("/", "layout");
  return { ok: true, data: null };
}

/* Delivery links ------------------------------------------------------------ */

export async function addDeliveryLink(
  projectId: string,
  rawUrl: string,
  rawLabel: string,
): Promise<ActionResult> {
  const { t } = await getI18n();
  let url = clean(rawUrl, 2000);
  if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    new URL(url);
  } catch {
    return { ok: false, error: t("delivery.invalidUrl") };
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("project_links")
    .insert({ project_id: projectId, url, label: cleanOptional(rawLabel, 200) });
  if (error) return fail("budget.addLink", error, { projectId });
  refresh(projectId);
  return { ok: true, data: null };
}

export async function deleteDeliveryLink(projectId: string, linkId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("project_links").delete().eq("id", linkId);
  if (error) return fail("budget.deleteLink", error, { linkId });
  refresh(projectId);
  return { ok: true, data: null };
}
