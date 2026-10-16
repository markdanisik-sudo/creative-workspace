import { XMLParser } from "fast-xml-parser";
import { round2, type InvoiceData, type InvoiceLine, type Party } from "@/lib/invoice/types";

/** Why a file wasn't turned into an invoice. */
export class SkipError extends Error {}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true,
  isArray: (name) => ["InvoiceLine", "TaxSubTotal", "Payment", "PartyTaxScheme"].includes(name),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tree = any;

function text(value: Tree): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return text(value["#text"]);
  return String(value).trim();
}

function num(value: Tree): number {
  const parsed = Number(text(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

const orNull = (value: string) => (value === "" ? null : value);

function joinStreet(address: Tree): string | null {
  const street = text(address?.StreetName);
  const building = text(address?.BuildingNumber);
  return orNull([street, building].filter(Boolean).join(" "));
}

function readParty(node: Tree): Party {
  const party = node?.Party ?? {};
  const address = party.PostalAddress ?? {};
  const schemes: Tree[] = party.PartyTaxScheme ?? [];
  const vatScheme = schemes.find((scheme) => text(scheme.TaxScheme) === "VAT") ?? schemes[0];
  return {
    name: text(party.PartyName?.Name) || text(party.Contact?.Name) || "—",
    street: joinStreet(address),
    city: orNull(text(address.CityName)),
    zip: orNull(text(address.PostalZone)),
    country: orNull(text(address.Country?.IdentificationCode)) ?? "CZ",
    ico: orNull(text(party.PartyIdentification?.ID)),
    dic: vatScheme ? orNull(text(vatScheme.CompanyID)) : null,
    email: orNull(text(party.Contact?.ElectronicMail)),
    phone: orNull(text(party.Contact?.Telephone)),
  };
}

/**
 * Reads one ISDOC invoice (as iDoklad, Fakturoid, Pohoda… export them) into
 * the app's shape. Throws SkipError for documents that aren't revenue
 * (advance invoices, proformas).
 */
export function parseIsdoc(source: string): InvoiceData {
  const document = parser.parse(source);
  const invoice = document?.Invoice;
  if (!invoice) throw new SkipError("Soubor není faktura ve formátu ISDOC.");

  const type = text(invoice.DocumentType) || "1";
  // 1 invoice, 2 credit note, 3 debit note, 7 simplified tax document.
  // 4–6 are advance (záloha) documents: no revenue of their own.
  if (["4", "5", "6"].includes(type)) {
    throw new SkipError("Zálohový doklad — přeskočeno.");
  }
  const kind = type === "2" ? "credit_note" : "invoice";

  const local = text(invoice.LocalCurrencyCode) || "CZK";
  const foreign = text(invoice.ForeignCurrencyCode);
  const currency = foreign || local;
  const currRate = num(invoice.CurrRate) || 1;
  const refRate = num(invoice.RefCurrRate) || 1;
  const exchangeRate = foreign && local === "CZK" ? currRate / refRate : 1;

  const totals = invoice.LegalMonetaryTotal ?? {};
  const amount = (field: string) =>
    foreign && totals[`${field}Curr`] !== undefined
      ? num(totals[`${field}Curr`])
      : num(totals[field]);
  let subtotal = amount("TaxExclusiveAmount");
  let total = amount("TaxInclusiveAmount");
  let vat = round2(total - subtotal);

  const rawLines: Tree[] = invoice.InvoiceLines?.InvoiceLine ?? [];
  let items: InvoiceLine[] = rawLines.map((line) => {
    const quantity = num(line.InvoicedQuantity) || 1;
    const base =
      foreign && line.LineExtensionAmountCurr !== undefined
        ? num(line.LineExtensionAmountCurr)
        : num(line.LineExtensionAmount);
    const unitCode = line.InvoicedQuantity?.["@unitCode"];
    return {
      description: text(line.Item?.Description) || text(line.Note) || "Položka",
      quantity,
      unit: unitCode ? String(unitCode) : null,
      unit_price: round2(base / quantity),
      vat_rate: num(line.ClassifiedTaxCategory?.Percent),
    };
  });

  // Credit notes lower revenue: keep their amounts negative.
  if (kind === "credit_note" && total > 0) {
    subtotal = -subtotal;
    total = -total;
    vat = -vat;
    items = items.map((item) => ({ ...item, unit_price: -Math.abs(item.unit_price) }));
  }

  const payments: Tree[] = invoice.PaymentMeans?.Payment ?? [];
  const details = payments[0]?.Details ?? {};
  const supplier = readParty(invoice.AccountingSupplierParty);
  const accountId = text(details.ID);
  const bankCode = text(details.BankCode);
  if (accountId && bankCode) supplier.bank_account = `${accountId}/${bankCode}`;
  if (text(details.IBAN)) supplier.iban = text(details.IBAN);
  supplier.vat_payer = text(invoice.VATApplicable) === "true";

  const issuedOn = text(invoice.IssueDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(issuedOn)) throw new SkipError("Chybí datum vystavení.");
  const number = text(invoice.ID);
  if (!number) throw new SkipError("Chybí číslo faktury.");
  const dueOn = text(details.PaymentDueDate);

  return {
    kind,
    number,
    variable_symbol:
      orNull(text(details.VariableSymbol)) ?? orNull(number.replace(/\D/g, "").slice(0, 10)),
    issued_on: issuedOn,
    taxable_on: orNull(text(invoice.TaxPointDate)),
    due_on: /^\d{4}-\d{2}-\d{2}$/.test(dueOn) ? dueOn : issuedOn,
    paid_on: null,
    currency,
    exchange_rate: round2(exchangeRate * 10000) / 10000,
    supplier,
    customer: readParty(invoice.AccountingCustomerParty ?? invoice.AnonymousCustomerParty),
    items,
    subtotal: round2(subtotal),
    vat: round2(vat),
    total: round2(total),
    note: orNull(text(invoice.Note)),
    source: "isdoc",
    external_id: orNull(text(invoice.UUID)),
  };
}
