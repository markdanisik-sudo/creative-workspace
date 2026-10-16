import { round2, type InvoiceData } from "@/lib/invoice/types";

/** Splits CSV text into rows; handles quotes, ; , or tab separators and CRLF. */
export function parseCsv(source: string): string[][] {
  const text = source.replace(/^﻿/, "");
  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  const separator = [";", "\t", ","]
    .map((char) => ({ char, count: firstLine.split(char).length }))
    .sort((a, b) => b.count - a.count)[0].char;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field === "") {
      quoted = true;
    } else if (char === separator) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index++;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

/** "Číslo dokladu" → "cislo dokladu". */
export function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Column names iDoklad (and similar tools) use, most specific first. */
const COLUMNS = {
  number: ["cislo dokladu", "cislo faktury", "cislo", "doklad", "number"],
  issued: ["datum vystaveni", "vystaveno", "vystavena", "datum vytvoreni", "datum"],
  due: ["datum splatnosti", "splatnost", "splatno"],
  taxable: ["duzp", "datum uskutecneni zdanitelneho plneni", "datum zdanitelneho plneni"],
  paidOn: ["datum uhrady", "uhrazeno dne", "datum zaplaceni", "datum platby"],
  paidState: ["stav uhrady", "stav platby", "uhrazeno", "zaplaceno", "stav"],
  customer: [
    "odberatel",
    "nazev odberatele",
    "odberatel nazev",
    "jmeno odberatele",
    "partner",
    "kontakt",
    "firma",
    "zakaznik",
    "nazev firmy",
  ],
  ico: ["ic odberatele", "ico odberatele", "odberatel ic", "ic", "ico"],
  dic: ["dic odberatele", "odberatel dic", "dic"],
  vs: ["variabilni symbol", "vs"],
  total: [
    "celkem s dph",
    "celkem vcetne dph",
    "castka celkem",
    "celkova castka",
    "celkem",
    "k uhrade",
    "castka",
    "suma",
  ],
  subtotal: ["celkem bez dph", "zaklad dph", "zaklad", "bez dph"],
  vat: ["dph celkem", "castka dph", "dph"],
  currency: ["mena", "kod meny"],
  rate: ["kurz", "smenny kurz"],
  description: ["popis", "predmet", "text", "nazev", "polozky"],
  type: ["typ dokladu", "druh dokladu", "typ"],
} as const;

type Column = keyof typeof COLUMNS;

/** Index of each known column in the header row. */
export function mapColumns(header: string[]): Partial<Record<Column, number>> {
  const normalized = header.map(normalizeHeader);
  const used = new Set<number>();
  const map: Partial<Record<Column, number>> = {};
  // Exact matches first, so "dph" doesn't steal "celkem s dph".
  for (const pass of ["exact", "prefix"] as const) {
    for (const [column, aliases] of Object.entries(COLUMNS) as [Column, readonly string[]][]) {
      if (map[column] !== undefined) continue;
      for (const alias of aliases) {
        const index = normalized.findIndex(
          (name, position) =>
            !used.has(position) &&
            (pass === "exact" ? name === alias : name.startsWith(`${alias} `)),
        );
        if (index >= 0) {
          map[column] = index;
          used.add(index);
          break;
        }
      }
    }
  }
  return map;
}

/** "16.10.2026", "16. 10. 2026", "2026-10-16", "16/10/2026" → "2026-10-16". */
export function parseDate(value: string): string | null {
  const text = value.trim();
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return iso(+match[1], +match[2], +match[3]);
  match = text.match(/^(\d{1,2})\s*[./]\s*(\d{1,2})\s*[./]\s*(\d{4})/);
  if (match) return iso(+match[3], +match[2], +match[1]);
  return null;
}

function iso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "12 345,50 Kč", "12345.50", "-1 000" → number. */
export function parseAmount(value: string): number | null {
  let text = value.replace(/[\s  ]/g, "").replace(/[^\d,.-]/g, "");
  if (!text || !/\d/.test(text)) return null;
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  if (lastComma > lastDot) text = text.replace(/\./g, "").replace(",", ".");
  else text = text.replace(/,/g, "");
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

const PAID = /^(ano|yes|true|1|uhrazen|uhrazeno|zaplaceno|zaplacena|paid)$/;

export interface CsvResult {
  invoices: InvoiceData[];
  skipped: string[];
  missing: Column[];
}

/**
 * Turns an exported list of issued invoices (iDoklad: Vydané faktury →
 * Export → CSV) into invoices. One row is one invoice; without item detail
 * each gets a single line with its description.
 */
export function invoicesFromCsv(source: string): CsvResult {
  const rows = parseCsv(source);
  if (rows.length < 2) return { invoices: [], skipped: ["Soubor CSV je prázdný."], missing: [] };
  const columns = mapColumns(rows[0]);
  const missing = (["number", "issued", "total"] as const).filter(
    (column) => columns[column] === undefined,
  );
  if (missing.length > 0) return { invoices: [], skipped: [], missing: [...missing] };

  const invoices: InvoiceData[] = [];
  const skipped: string[] = [];
  const cell = (row: string[], column: Column) => {
    const index = columns[column];
    return index === undefined ? "" : (row[index] ?? "").trim();
  };

  rows.slice(1).forEach((row, position) => {
    const line = position + 2;
    const number = cell(row, "number");
    const issued = parseDate(cell(row, "issued"));
    let total = parseAmount(cell(row, "total"));
    if (!number || !issued || total === null) {
      skipped.push(`Řádek ${line}: chybí číslo, datum nebo částka.`);
      return;
    }
    const type = normalizeHeader(cell(row, "type"));
    if (/zaloh|proform/.test(type)) {
      skipped.push(`${number}: zálohový doklad — přeskočeno.`);
      return;
    }
    const kind = /oprav|dobropis|credit/.test(type) ? "credit_note" : "invoice";
    let subtotal = parseAmount(cell(row, "subtotal"));
    let vat = parseAmount(cell(row, "vat"));
    if (subtotal === null && vat !== null) subtotal = round2(total - vat);
    if (subtotal === null) subtotal = total;
    if (vat === null) vat = round2(total - subtotal);
    if (kind === "credit_note" && total > 0) {
      total = -total;
      subtotal = -subtotal;
      vat = -vat;
    }
    const paidOn = parseDate(cell(row, "paidOn"));
    // Either a word ("Uhrazeno", "Ano") or the amount paid so far.
    const paidRaw = cell(row, "paidState");
    const paidAmount = /[a-z]/i.test(paidRaw) ? null : parseAmount(paidRaw);
    const isPaid =
      PAID.test(normalizeHeader(paidRaw)) ||
      (paidAmount !== null && total !== 0 && Math.abs(paidAmount) >= Math.abs(total) - 0.01);
    const due = parseDate(cell(row, "due")) ?? issued;
    const currency = (
      cell(row, "currency")
        .toUpperCase()
        .match(/[A-Z]{3}/)?.[0] ?? "CZK"
    ).replace("KC", "CZK");
    const rate = parseAmount(cell(row, "rate"));
    const vatRate = subtotal !== 0 ? Math.round((vat / subtotal) * 100) : 0;

    invoices.push({
      kind,
      number,
      variable_symbol: cell(row, "vs") || number.replace(/\D/g, "").slice(0, 10) || null,
      issued_on: issued,
      taxable_on: parseDate(cell(row, "taxable")),
      due_on: due,
      paid_on: paidOn ?? (isPaid ? due : null),
      currency: currency === "KC" ? "CZK" : currency,
      exchange_rate: currency === "CZK" ? 1 : rate && rate > 0 ? rate : 1,
      supplier: { name: "" },
      customer: {
        name: cell(row, "customer") || "—",
        ico: cell(row, "ico") || null,
        dic: cell(row, "dic") || null,
      },
      items: [
        {
          description: cell(row, "description") || `Faktura ${number}`,
          quantity: 1,
          unit: null,
          unit_price: subtotal,
          vat_rate: vatRate,
        },
      ],
      subtotal: round2(subtotal),
      vat: round2(vat),
      total: round2(total),
      note: null,
      source: "csv",
      external_id: null,
    });
  });

  return { invoices, skipped, missing: [] };
}
