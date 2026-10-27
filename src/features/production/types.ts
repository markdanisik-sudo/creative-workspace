export type ProductionKind = "rental" | "cost";

/** Something the shoot needs: gear to rent, or another cost. */
export interface ProductionItem {
  id: string;
  kind: ProductionKind;
  name: string;
  supplier: string | null;
  category: string | null;
  quantity: number;
  /** Rental days (1 for one-off costs). */
  days: number;
  unitPrice: number;
  /** Booked / sorted out. */
  done: boolean;
}

/** One line of a rental house's price list. */
export interface RentalOffer {
  id: string;
  supplier: string;
  category: string | null;
  name: string;
  pricePerDay: number;
}

export function itemTotal(item: Pick<ProductionItem, "quantity" | "days" | "unitPrice">) {
  return Math.round(item.quantity * item.days * item.unitPrice * 100) / 100;
}
