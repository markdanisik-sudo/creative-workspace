import type { AddOnRequest } from "@/features/hub/types";
import type { BudgetLine } from "./types";

export interface BudgetTotals {
  base: number;
  addons: number;
  pending: number;
  unpriced: number;
  subtotal: number;
  vatRate: number;
  vat: number;
  total: number;
}

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * The project's price: the quote plus approved (or delivered) add-ons with a
 * price. Requested add-ons are shown apart until the studio approves them —
 * the same rule create_invoice() applies in the database.
 */
export function budgetTotals(
  lines: BudgetLine[],
  requests: AddOnRequest[],
  vat: { payer: boolean; rate: number },
): BudgetTotals {
  const base = round(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0));
  const counted = requests.filter(
    (request) => request.status === "approved" || request.status === "done",
  );
  const addons = round(
    counted.reduce((sum, request) => sum + (request.unitPrice ?? 0) * request.quantity, 0),
  );
  const pending = round(
    requests
      .filter((request) => request.status === "requested")
      .reduce((sum, request) => sum + (request.unitPrice ?? 0) * request.quantity, 0),
  );
  const unpriced = counted.filter((request) => request.unitPrice === null).length;
  const subtotal = round(base + addons);
  const vatRate = vat.payer ? vat.rate : 0;
  const vatAmount = round((subtotal * vatRate) / 100);
  return {
    base,
    addons,
    pending,
    unpriced,
    subtotal,
    vatRate,
    vat: vatAmount,
    total: round(subtotal + vatAmount),
  };
}
