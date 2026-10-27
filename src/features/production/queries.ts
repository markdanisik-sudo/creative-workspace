import "server-only";
import { logError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProductionItem, RentalOffer } from "./types";

export async function listProductionItems(projectId: string): Promise<ProductionItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("production_items")
    .select("id, kind, name, supplier, category, quantity, days, unit_price, done")
    .eq("project_id", projectId)
    .order("position")
    .order("created_at");
  if (error) logError("production.items", error, { projectId });
  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind === "rental" ? "rental" : "cost",
    name: row.name,
    supplier: row.supplier,
    category: row.category,
    quantity: Number(row.quantity),
    days: Number(row.days),
    unitPrice: Number(row.unit_price),
    done: row.done,
  }));
}

/** The viewer's own rental price lists. */
export async function listRentalCatalog(ownerId: string): Promise<RentalOffer[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("rental_catalog")
    .select("id, supplier, category, name, price_per_day")
    .eq("owner_id", ownerId)
    .order("supplier")
    .order("category", { nullsFirst: false })
    .order("name");
  if (error) logError("production.catalog", error);
  return (data ?? []).map((row) => ({
    id: row.id,
    supplier: row.supplier,
    category: row.category,
    name: row.name,
    pricePerDay: Number(row.price_per_day),
  }));
}
