/** A party on an invoice (supplier or customer), as snapshotted on it. */
export interface Party {
  name: string;
  street?: string | null;
  city?: string | null;
  zip?: string | null;
  country?: string | null;
  ico?: string | null;
  dic?: string | null;
  email?: string | null;
  phone?: string | null;
  web?: string | null;
  registry?: string | null;
  bank_account?: string | null;
  iban?: string | null;
  bic?: string | null;
  vat_payer?: boolean;
}

export interface InvoiceLine {
  description: string;
  quantity: number;
  unit: string | null;
  /** Price per unit without VAT. */
  unit_price: number;
  vat_rate: number;
}

export type InvoiceKind = "invoice" | "credit_note";
export type InvoiceSource = "app" | "isdoc" | "csv";

/** An invoice as the app stores it, minus database bookkeeping. */
export interface InvoiceData {
  kind: InvoiceKind;
  number: string;
  variable_symbol: string | null;
  issued_on: string;
  taxable_on: string | null;
  due_on: string;
  paid_on: string | null;
  currency: string;
  exchange_rate: number;
  supplier: Party;
  customer: Party;
  items: InvoiceLine[];
  subtotal: number;
  vat: number;
  total: number;
  note: string | null;
  source: InvoiceSource;
  external_id: string | null;
}

export interface Invoice extends InvoiceData {
  id: string;
  contact_id: string | null;
  total_czk: number;
  created_at: string;
}

export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function lineTotals(line: InvoiceLine) {
  const base = round2(line.quantity * line.unit_price);
  const vat = round2((base * line.vat_rate) / 100);
  return { base, vat, total: round2(base + vat) };
}

export function invoiceTotals(items: InvoiceLine[]) {
  let subtotal = 0;
  let vat = 0;
  for (const item of items) {
    const totals = lineTotals(item);
    subtotal += totals.base;
    vat += totals.vat;
  }
  subtotal = round2(subtotal);
  vat = round2(vat);
  return { subtotal, vat, total: round2(subtotal + vat) };
}

export type InvoiceStatus = "paid" | "overdue" | "unpaid";

export function invoiceStatus(
  invoice: Pick<InvoiceData, "paid_on" | "due_on">,
  today: string,
): InvoiceStatus {
  if (invoice.paid_on) return "paid";
  return invoice.due_on < today ? "overdue" : "unpaid";
}

/** Today in Prague as YYYY-MM-DD. */
export function todayIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Prague" }).format(now);
}

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** "Ulice 12, 110 00 Praha" style one-line address. */
export function partyAddressLines(party: Party): string[] {
  const lines: string[] = [];
  if (party.street) lines.push(party.street);
  const city = [party.zip, party.city].filter(Boolean).join(" ");
  if (city) lines.push(city);
  if (party.country && party.country !== "CZ") lines.push(party.country);
  return lines;
}
