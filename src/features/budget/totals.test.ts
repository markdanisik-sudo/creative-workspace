import { describe, expect, it } from "vitest";
import type { AddOnRequest } from "@/features/hub/types";
import { budgetTotals } from "./totals";

const request = (status: AddOnRequest["status"], unitPrice: number | null, quantity = 1) =>
  ({ status, unitPrice, quantity }) as AddOnRequest;

describe("budget totals", () => {
  it("counts the quote and approved add-ons, not pending ones", () => {
    const totals = budgetTotals(
      [{ id: "1", title: "Shoot day", quantity: 2, unit: "day", unitPrice: 20000 }],
      [
        request("approved", 15000),
        request("done", 5000, 2),
        request("requested", 9000),
        request("declined", 1000),
        request("approved", null),
      ],
      { payer: true, rate: 21 },
    );
    expect(totals.base).toBe(40000);
    expect(totals.addons).toBe(25000);
    expect(totals.pending).toBe(9000);
    expect(totals.unpriced).toBe(1);
    expect(totals.vat).toBe(13650);
    expect(totals.total).toBe(78650);
  });

  it("adds no VAT for a non-payer", () => {
    const totals = budgetTotals(
      [{ id: "1", title: "Edit", quantity: 1, unit: null, unitPrice: 999.5 }],
      [],
      {
        payer: false,
        rate: 21,
      },
    );
    expect(totals.vat).toBe(0);
    expect(totals.total).toBe(999.5);
  });
});
