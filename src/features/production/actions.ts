"use server";

import { revalidatePath } from "next/cache";
import { logError, type ActionResult } from "@/lib/errors";
import { getI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parsePriceList } from "./parse";
import type { ProductionKind } from "./types";

function clean(value: unknown, max: number): string {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

function toNumber(value: unknown): number {
  const number = Number(
    String(value ?? "")
      .replace(/\s/g, "")
      .replace(",", "."),
  );
  return Number.isFinite(number) ? number : NaN;
}

const round = (value: number) => Math.round(value * 100) / 100;

async function fail(context: string, error: unknown, extra?: Record<string, unknown>) {
  const { t } = await getI18n();
  logError(context, error, extra);
  return { ok: false, error: t("errors.generic") } as const;
}

function refresh(projectId: string) {
  revalidatePath(`/projects/${projectId}`, "layout");
}

/* The production list ----------------------------------------------------- */

export interface ProductionItemInput {
  kind: ProductionKind;
  name: string;
  supplier: string;
  quantity: string;
  days: string;
  unitPrice: string;
}

export async function saveProductionItem(
  projectId: string,
  itemId: string | null,
  input: ProductionItemInput,
): Promise<ActionResult> {
  const { t } = await getI18n();
  const name = clean(input.name, 200);
  const quantity = toNumber(input.quantity || "1");
  const days = input.kind === "rental" ? toNumber(input.days || "1") : 1;
  const unitPrice = toNumber(input.unitPrice || "0");
  if (!name || !(quantity > 0) || !(days > 0) || !(unitPrice >= 0)) {
    return { ok: false, error: t("production.invalid") };
  }
  const row = {
    kind: input.kind,
    name,
    supplier: clean(input.supplier, 100) || null,
    quantity: round(Math.min(quantity, 9999)),
    days: round(Math.min(days, 365)),
    unit_price: round(unitPrice),
  };
  const supabase = await createSupabaseServerClient();
  const { error } = itemId
    ? await supabase.from("production_items").update(row).eq("id", itemId)
    : await supabase
        .from("production_items")
        .insert({ ...row, project_id: projectId, position: Date.now() / 1000 });
  if (error) return fail("production.save", error, { projectId });
  refresh(projectId);
  return { ok: true, data: null };
}

export async function setProductionItemDone(
  projectId: string,
  itemId: string,
  done: boolean,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("production_items").update({ done }).eq("id", itemId);
  if (error) return fail("production.done", error, { itemId });
  refresh(projectId);
  return { ok: true, data: null };
}

export async function deleteProductionItem(
  projectId: string,
  itemId: string,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("production_items").delete().eq("id", itemId);
  if (error) return fail("production.delete", error, { itemId });
  refresh(projectId);
  return { ok: true, data: null };
}

/** Picked from the rental catalog: prices are taken from the catalog, not the browser. */
export async function addRentals(
  projectId: string,
  picks: { offerId: string; quantity: number }[],
  rawDays: number,
): Promise<ActionResult<{ added: number }>> {
  const days = round(Math.min(Math.max(Number(rawDays) || 1, 0.5), 365));
  const wanted = new Map(
    picks
      .filter((pick) => pick.quantity > 0)
      .map((pick) => [pick.offerId, round(Math.min(pick.quantity, 9999))]),
  );
  if (wanted.size === 0) return { ok: true, data: { added: 0 } };
  const supabase = await createSupabaseServerClient();
  const { data: offers, error } = await supabase
    .from("rental_catalog")
    .select("id, supplier, category, name, price_per_day")
    .in("id", [...wanted.keys()]);
  if (error) return fail("production.rentalsRead", error, { projectId });
  const start = Date.now() / 1000;
  const rows = (offers ?? []).map((offer, index) => ({
    project_id: projectId,
    kind: "rental" as const,
    name: offer.name,
    supplier: offer.supplier,
    category: offer.category,
    quantity: wanted.get(offer.id) ?? 1,
    days,
    unit_price: Number(offer.price_per_day),
    position: start + index / 1000,
  }));
  const inserted = await supabase.from("production_items").insert(rows);
  if (inserted.error) return fail("production.rentalsAdd", inserted.error, { projectId });
  refresh(projectId);
  return { ok: true, data: { added: rows.length } };
}

/* The rental catalog ------------------------------------------------------- */

/** Adds a pasted price list to the viewer's catalog. */
export async function importRentalCatalog(
  rawSupplier: string,
  text: string,
): Promise<ActionResult<{ added: number; skipped: number }>> {
  const { t } = await getI18n();
  const supplier = clean(rawSupplier, 100) || "Biofilms";
  const { items, skipped } = parsePriceList(String(text ?? "").slice(0, 200_000));
  if (items.length === 0) return { ok: false, error: t("production.importNothing") };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("rental_catalog").insert(
    items.slice(0, 2000).map((item) => ({
      supplier,
      category: item.category,
      name: item.name,
      price_per_day: item.pricePerDay,
    })),
  );
  if (error) return fail("production.import", error);
  revalidatePath("/projects", "layout");
  return { ok: true, data: { added: Math.min(items.length, 2000), skipped } };
}

export async function deleteRentalOffer(offerId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("rental_catalog").delete().eq("id", offerId);
  if (error) return fail("production.deleteOffer", error, { offerId });
  revalidatePath("/projects", "layout");
  return { ok: true, data: null };
}

/** Clears one supplier's price list (before importing a newer one). */
export async function clearRentalSupplier(supplier: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("rental_catalog").delete().eq("supplier", supplier);
  if (error) return fail("production.clearSupplier", error);
  revalidatePath("/projects", "layout");
  return { ok: true, data: null };
}
