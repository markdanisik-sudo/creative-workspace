import { invoiceStatus, round2 } from "./types";

export interface StatInvoice {
  issued_on: string;
  due_on: string;
  paid_on: string | null;
  total_czk: number;
  customer_name: string;
  customer_ico: string | null;
}

export type StatBasis = "issued" | "paid";

export interface YearStats {
  year: number;
  /** Per month (0–11), in CZK. */
  months: { invoiced: number; paid: number; count: number }[];
  invoiced: number;
  paid: number;
  unpaid: number;
  overdue: number;
  overdueCount: number;
  count: number;
  /** Same period of the previous year (Jan 1 → today's date), for comparison. */
  previousToDate: number | null;
  customers: { name: string; total: number; count: number }[];
}

/**
 * Totals for one calendar year. "issued" counts invoices by their issue date
 * (what was invoiced); "paid" counts paid invoices by payment date (what
 * actually came in — the basis for income tax with tax records).
 */
export function yearStats(
  invoices: StatInvoice[],
  year: number,
  basis: StatBasis,
  today: string,
): YearStats {
  const months = Array.from({ length: 12 }, () => ({ invoiced: 0, paid: 0, count: 0 }));
  const customers = new Map<string, { name: string; total: number; count: number }>();
  let invoiced = 0;
  let paid = 0;
  let unpaid = 0;
  let overdue = 0;
  let overdueCount = 0;
  let count = 0;
  let previousToDate = 0;
  let hasPrevious = false;
  const prefix = String(year);
  const previousPrefix = String(year - 1);
  const cutoff = `${year - 1}${today.slice(4)}`;

  for (const invoice of invoices) {
    const date = basis === "paid" ? invoice.paid_on : invoice.issued_on;
    if (date?.startsWith(previousPrefix)) {
      hasPrevious = true;
      if (date <= cutoff || today.slice(0, 4) !== prefix) previousToDate += invoice.total_czk;
    }
    if (!date?.startsWith(prefix)) continue;
    const month = Number(date.slice(5, 7)) - 1;
    const amount = invoice.total_czk;
    count++;
    invoiced += amount;
    months[month].invoiced += amount;
    months[month].count++;
    const status = invoiceStatus(invoice, today);
    if (status === "paid") {
      paid += amount;
      months[month].paid += amount;
    } else {
      unpaid += amount;
      if (status === "overdue") {
        overdue += amount;
        overdueCount++;
      }
    }
    const key = invoice.customer_ico || invoice.customer_name.trim().toLowerCase();
    const entry = customers.get(key) ?? { name: invoice.customer_name, total: 0, count: 0 };
    entry.total += amount;
    entry.count++;
    customers.set(key, entry);
  }

  return {
    year,
    months: months.map((month) => ({
      invoiced: round2(month.invoiced),
      paid: round2(month.paid),
      count: month.count,
    })),
    invoiced: round2(invoiced),
    paid: round2(paid),
    unpaid: round2(unpaid),
    overdue: round2(overdue),
    overdueCount,
    count,
    previousToDate: hasPrevious ? round2(previousToDate) : null,
    customers: [...customers.values()]
      .map((customer) => ({ ...customer, total: round2(customer.total) }))
      .sort((a, b) => b.total - a.total),
  };
}

/** Totals per year, oldest first, for the year-over-year comparison. */
export function totalsByYear(invoices: StatInvoice[], basis: StatBasis) {
  const years = new Map<number, number>();
  for (const invoice of invoices) {
    const date = basis === "paid" ? invoice.paid_on : invoice.issued_on;
    if (!date) continue;
    const year = Number(date.slice(0, 4));
    years.set(year, (years.get(year) ?? 0) + invoice.total_czk);
  }
  return [...years.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, total]) => ({ year, total: round2(total) }));
}

/** Turnover above which a Czech business must register for VAT (from 2025). */
export const VAT_THRESHOLD = 2_000_000;
