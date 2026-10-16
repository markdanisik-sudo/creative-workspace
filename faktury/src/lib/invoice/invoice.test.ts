import { describe, expect, it } from "vitest";
import { nextInvoiceNumber } from "./numbering";
import { yearStats, totalsByYear } from "./stats";
import { addDays, invoiceTotals, invoiceStatus } from "./types";

describe("numbering", () => {
  it("continues existing numbers", () => {
    expect(nextInvoiceNumber([], 2026)).toBe("20260001");
    expect(nextInvoiceNumber(["20260007", "20260003", "20250099"], 2026)).toBe("20260008");
    expect(nextInvoiceNumber(["2026007"], 2026)).toBe("2026008");
    expect(nextInvoiceNumber(["FV-2026-1", "2025001"], 2026)).toBe("20260001");
  });
});

describe("totals", () => {
  it("adds lines with VAT", () => {
    expect(
      invoiceTotals([
        { description: "a", quantity: 2, unit: null, unit_price: 100.1, vat_rate: 21 },
        { description: "b", quantity: 1, unit: null, unit_price: 50, vat_rate: 0 },
      ]),
    ).toEqual({ subtotal: 250.2, vat: 42.04, total: 292.24 });
  });

  it("knows status and dates", () => {
    expect(invoiceStatus({ paid_on: null, due_on: "2026-01-01" }, "2026-01-02")).toBe("overdue");
    expect(invoiceStatus({ paid_on: null, due_on: "2026-01-02" }, "2026-01-02")).toBe("unpaid");
    expect(invoiceStatus({ paid_on: "2026-01-01", due_on: "2025-01-02" }, "2026-01-02")).toBe(
      "paid",
    );
    expect(addDays("2026-12-25", 14)).toBe("2027-01-08");
  });
});

describe("stats", () => {
  const invoices = [
    {
      issued_on: "2026-01-10",
      due_on: "2026-01-24",
      paid_on: "2026-02-02",
      total_czk: 1000,
      customer_name: "A",
      customer_ico: "1",
    },
    {
      issued_on: "2026-03-10",
      due_on: "2026-03-24",
      paid_on: null,
      total_czk: 500,
      customer_name: "B",
      customer_ico: null,
    },
    {
      issued_on: "2026-10-10",
      due_on: "2026-10-24",
      paid_on: null,
      total_czk: 2000,
      customer_name: "A s.r.o.",
      customer_ico: "1",
    },
    {
      issued_on: "2025-05-10",
      due_on: "2025-05-24",
      paid_on: "2025-05-20",
      total_czk: 300,
      customer_name: "C",
      customer_ico: null,
    },
    {
      issued_on: "2025-11-10",
      due_on: "2025-11-24",
      paid_on: "2025-11-20",
      total_czk: 700,
      customer_name: "C",
      customer_ico: null,
    },
  ];

  it("sums a year by issue date", () => {
    const stats = yearStats(invoices, 2026, "issued", "2026-10-16");
    expect(stats).toMatchObject({
      invoiced: 3500,
      paid: 1000,
      unpaid: 2500,
      overdue: 500,
      overdueCount: 1,
      count: 3,
    });
    expect(stats.months[0].invoiced).toBe(1000);
    expect(stats.months[9].invoiced).toBe(2000);
    expect(stats.customers[0]).toMatchObject({ total: 3000, count: 2 });
    expect(stats.previousToDate).toBe(300);
  });

  it("sums a year by payment date", () => {
    const stats = yearStats(invoices, 2026, "paid", "2026-10-16");
    expect(stats.invoiced).toBe(1000);
    expect(stats.months[1].invoiced).toBe(1000);
  });

  it("totals per year", () => {
    expect(totalsByYear(invoices, "issued")).toEqual([
      { year: 2025, total: 1000 },
      { year: 2026, total: 3500 },
    ]);
  });
});
