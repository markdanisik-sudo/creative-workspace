import {
  invoiceTotals,
  round2,
  type InvoiceData,
  type InvoiceLine,
  type Party,
} from "./invoice/types";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const str = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed === "" ? null : trimmed;
};

const finite = (value: unknown): number | null => {
  const parsed = typeof value === "string" ? Number(value.replace(",", ".")) : value;
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
};

const date = (value: unknown): string | null =>
  typeof value === "string" && DATE.test(value) && !Number.isNaN(Date.parse(value)) ? value : null;

export function cleanParty(value: unknown): Party {
  const input = (value ?? {}) as Record<string, unknown>;
  const country = str(input.country, 2)?.toUpperCase();
  return {
    name: str(input.name, 200) ?? "",
    street: str(input.street, 200),
    city: str(input.city, 100),
    zip: str(input.zip, 20),
    country: country && /^[A-Z]{2}$/.test(country) ? country : "CZ",
    ico: str(input.ico, 20),
    dic: str(input.dic, 20),
    email: str(input.email, 200),
    phone: str(input.phone, 50),
    web: str(input.web, 200),
    registry: str(input.registry, 300),
    bank_account: str(input.bank_account, 40),
    iban: str(input.iban, 40),
    bic: str(input.bic, 20),
    vat_payer: input.vat_payer === true,
  };
}

function cleanLines(value: unknown): InvoiceLine[] | null {
  if (!Array.isArray(value) || value.length > 500) return null;
  const lines: InvoiceLine[] = [];
  for (const raw of value) {
    const line = (raw ?? {}) as Record<string, unknown>;
    const quantity = finite(line.quantity);
    const unitPrice = finite(line.unit_price);
    const vatRate = finite(line.vat_rate) ?? 0;
    const description = str(line.description, 500);
    if (!description || quantity === null || unitPrice === null) return null;
    if (Math.abs(quantity) > 1e6 || Math.abs(unitPrice) > 1e10 || vatRate < 0 || vatRate > 100) {
      return null;
    }
    lines.push({
      description,
      quantity,
      unit: str(line.unit, 20),
      unit_price: round2(unitPrice),
      vat_rate: vatRate,
    });
  }
  return lines;
}

/**
 * Checks an invoice coming from the browser (form or import). Totals are
 * recomputed from the lines for invoices made here; imported ones keep the
 * totals of the original document.
 */
export function validateInvoice(
  value: unknown,
): { ok: true; invoice: InvoiceData } | { ok: false; error: string } {
  const input = (value ?? {}) as Record<string, unknown>;
  const number = str(input.number, 50);
  if (!number) return { ok: false, error: "Chybí číslo faktury." };
  const issuedOn = date(input.issued_on);
  const dueOn = date(input.due_on);
  if (!issuedOn || !dueOn)
    return { ok: false, error: `${number}: chybí datum vystavení nebo splatnosti.` };
  const items = cleanLines(input.items);
  if (!items) return { ok: false, error: `${number}: položky nejsou v pořádku.` };
  const source = input.source === "isdoc" || input.source === "csv" ? input.source : "app";
  if (source === "app" && items.length === 0)
    return { ok: false, error: "Přidej aspoň jednu položku." };
  const currency = (str(input.currency, 3) ?? "CZK").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) return { ok: false, error: `${number}: neznámá měna.` };
  const rate = finite(input.exchange_rate) ?? 1;
  if (rate <= 0 || rate > 100000) return { ok: false, error: `${number}: neplatný kurz.` };
  const customer = cleanParty(input.customer);
  if (!customer.name) return { ok: false, error: "Vyplň odběratele." };

  let totals = invoiceTotals(items);
  if (source !== "app") {
    const subtotal = finite(input.subtotal);
    const vat = finite(input.vat);
    const total = finite(input.total);
    if (subtotal === null || vat === null || total === null) {
      return { ok: false, error: `${number}: chybí částky.` };
    }
    totals = { subtotal: round2(subtotal), vat: round2(vat), total: round2(total) };
  }

  return {
    ok: true,
    invoice: {
      kind: input.kind === "credit_note" ? "credit_note" : "invoice",
      number,
      variable_symbol: str(input.variable_symbol, 20)?.replace(/\D/g, "").slice(0, 10) || null,
      issued_on: issuedOn,
      taxable_on: date(input.taxable_on),
      due_on: dueOn,
      paid_on: date(input.paid_on),
      currency,
      exchange_rate: currency === "CZK" ? 1 : rate,
      supplier: cleanParty(input.supplier),
      customer,
      items,
      ...totals,
      note: str(input.note, 2000),
      source,
      external_id: str(input.external_id, 100),
    },
  };
}
