import { payableIban } from "@/lib/payment";
import { lineTotals, round2, type InvoiceData, type Party } from "@/lib/invoice/types";

/**
 * ISDOC 6.0.2: the Czech standard for electronic invoices, which accounting
 * software (Pohoda, Money, ABRA, iDoklad, Fakturoid…) imports directly.
 * https://isdoc.cz
 */

const NAMESPACE = "http://isdoc.cz/namespace/2013";
const VERSION = "6.0.2";

function escape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

type Node = string | number | boolean | null | undefined | Node[] | { [tag: string]: Node };

/** Serialises {Tag: value} trees in insertion order (ISDOC's schema is ordered). */
function xml(tree: Record<string, Node>, depth = 1): string {
  const pad = "  ".repeat(depth);
  let out = "";
  for (const [tag, value] of Object.entries(tree)) {
    if (value === undefined || tag.startsWith("@")) continue;
    if (Array.isArray(value)) {
      for (const item of value) out += xml({ [tag]: item }, depth);
      continue;
    }
    if (value !== null && typeof value === "object") {
      // "@name" keys are attributes, "#text" is the element's text.
      const attributes = Object.entries(value)
        .filter(([key, item]) => key.startsWith("@") && item !== undefined && item !== null)
        .map(([key, item]) => ` ${key.slice(1)}="${escape(String(item))}"`)
        .join("");
      if ("#text" in value) {
        out += `${pad}<${tag}${attributes}>${escape(String(value["#text"]))}</${tag}>\n`;
        continue;
      }
      out += `${pad}<${tag}${attributes}>\n${xml(value, depth + 1)}${pad}</${tag}>\n`;
      continue;
    }
    const text = value === null ? "" : escape(String(value));
    out += text === "" ? `${pad}<${tag}/>\n` : `${pad}<${tag}>${text}</${tag}>\n`;
  }
  return out;
}

const amount = (value: number) => round2(value).toFixed(2);

/** "Dlouhá 12/3" → ["Dlouhá", "12/3"]. */
export function splitStreet(street: string | null | undefined): [string, string] {
  const value = (street ?? "").trim();
  const match = value.match(/^(.*\D)\s+(\d[\w/-]*)$/);
  return match ? [match[1].trim(), match[2]] : [value, ""];
}

/** "19-2000145399/0800" → { id: "19-2000145399", bank: "0800" }. */
function splitAccount(account: string | null | undefined) {
  const match = (account ?? "").replace(/\s+/g, "").match(/^((?:\d{1,6}-)?\d{2,10})\/(\d{4})$/);
  return match ? { id: match[1], bank: match[2] } : { id: account ?? "", bank: "" };
}

const COUNTRY_NAMES: Record<string, string> = {
  CZ: "Česká republika",
  SK: "Slovensko",
  DE: "Německo",
  AT: "Rakousko",
  PL: "Polsko",
};

function party(value: Party) {
  const [streetName, buildingNumber] = splitStreet(value.street);
  const country = (value.country || "CZ").toUpperCase();
  return {
    Party: {
      PartyIdentification: { ID: value.ico ?? "" },
      PartyName: { Name: value.name },
      PostalAddress: {
        StreetName: streetName,
        BuildingNumber: buildingNumber,
        CityName: value.city ?? "",
        PostalZone: (value.zip ?? "").replace(/\s+/g, ""),
        Country: { IdentificationCode: country, Name: COUNTRY_NAMES[country] ?? country },
      },
      PartyTaxScheme: value.dic ? { CompanyID: value.dic, TaxScheme: "VAT" } : undefined,
      RegisterIdentification: value.registry ? { Preformatted: value.registry } : undefined,
      Contact:
        value.email || value.phone
          ? { Telephone: value.phone ?? undefined, ElectronicMail: value.email ?? undefined }
          : undefined,
    },
  };
}

/** A stable UUID for the document, derived from its id so re-exports match. */
function documentUuid(id: string): string {
  const hex = id.replace(/-/g, "").toUpperCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * The ISDOC XML for an invoice. Amounts are in CZK; an invoice in another
 * currency carries both (…Curr elements hold the foreign amounts).
 */
export function buildIsdoc(invoice: InvoiceData & { id: string }): string {
  const foreign = invoice.currency !== "CZK";
  const rate = foreign ? invoice.exchange_rate : 1;
  const local = (value: number) => amount(value * rate);
  const curr = (value: number) => (foreign ? amount(value) : undefined);
  const vatApplicable = Boolean(invoice.supplier.vat_payer) || invoice.vat !== 0;

  const lines = invoice.items.map((item, index) => {
    const totals = lineTotals(item);
    const unitVat = round2(item.unit_price * (1 + item.vat_rate / 100));
    return {
      ID: index + 1,
      InvoicedQuantity: { "@unitCode": item.unit ?? undefined, "#text": item.quantity },
      LineExtensionAmountCurr: curr(totals.base),
      LineExtensionAmount: local(totals.base),
      LineExtensionAmountTaxInclusiveCurr: curr(totals.total),
      LineExtensionAmountTaxInclusive: local(totals.total),
      LineExtensionTaxAmount: local(totals.vat),
      UnitPrice: local(item.unit_price),
      UnitPriceTaxInclusive: local(unitVat),
      ClassifiedTaxCategory: {
        Percent: item.vat_rate,
        VATCalculationMethod: 0,
        VATApplicable: vatApplicable,
      },
      Item: { Description: item.description },
    };
  });

  // Group the tax recap by rate.
  const byRate = new Map<number, { base: number; vat: number }>();
  for (const item of invoice.items) {
    const totals = lineTotals(item);
    const entry = byRate.get(item.vat_rate) ?? { base: 0, vat: 0 };
    entry.base += totals.base;
    entry.vat += totals.vat;
    byRate.set(item.vat_rate, entry);
  }
  if (byRate.size === 0) byRate.set(0, { base: 0, vat: 0 });
  const subTotals = [...byRate.entries()].map(([percent, sums]) => ({
    TaxableAmountCurr: curr(sums.base),
    TaxableAmount: local(sums.base),
    TaxAmountCurr: curr(sums.vat),
    TaxAmount: local(sums.vat),
    TaxInclusiveAmountCurr: curr(sums.base + sums.vat),
    TaxInclusiveAmount: local(sums.base + sums.vat),
    AlreadyClaimedTaxableAmountCurr: curr(0),
    AlreadyClaimedTaxableAmount: amount(0),
    AlreadyClaimedTaxAmountCurr: curr(0),
    AlreadyClaimedTaxAmount: amount(0),
    AlreadyClaimedTaxInclusiveAmountCurr: curr(0),
    AlreadyClaimedTaxInclusiveAmount: amount(0),
    DifferenceTaxableAmountCurr: curr(sums.base),
    DifferenceTaxableAmount: local(sums.base),
    DifferenceTaxAmountCurr: curr(sums.vat),
    DifferenceTaxAmount: local(sums.vat),
    DifferenceTaxInclusiveAmountCurr: curr(sums.base + sums.vat),
    DifferenceTaxInclusiveAmount: local(sums.base + sums.vat),
    TaxCategory: { Percent: percent, VATApplicable: vatApplicable },
  }));

  const account = splitAccount(invoice.supplier.bank_account);
  const iban = payableIban(invoice.supplier.iban ?? null, invoice.supplier.bank_account ?? null);

  const body = xml({
    DocumentType: invoice.kind === "credit_note" ? 2 : 1,
    ID: invoice.number,
    UUID: documentUuid(invoice.id),
    IssuingSystem: "Faktury",
    IssueDate: invoice.issued_on,
    TaxPointDate: invoice.taxable_on ?? undefined,
    VATApplicable: vatApplicable,
    ElectronicPossibilityAgreementReference: null,
    Note: invoice.note ?? undefined,
    LocalCurrencyCode: "CZK",
    ForeignCurrencyCode: foreign ? invoice.currency : undefined,
    CurrRate: foreign ? rate : 1,
    RefCurrRate: 1,
    AccountingSupplierParty: party(invoice.supplier),
    AccountingCustomerParty: party(invoice.customer),
    InvoiceLines: { InvoiceLine: lines },
    TaxTotal: {
      TaxSubTotal: subTotals,
      TaxAmountCurr: curr(invoice.vat),
      TaxAmount: local(invoice.vat),
    },
    LegalMonetaryTotal: {
      TaxExclusiveAmount: local(invoice.subtotal),
      TaxExclusiveAmountCurr: curr(invoice.subtotal),
      TaxInclusiveAmount: local(invoice.total),
      TaxInclusiveAmountCurr: curr(invoice.total),
      AlreadyClaimedTaxExclusiveAmount: amount(0),
      AlreadyClaimedTaxExclusiveAmountCurr: curr(0),
      AlreadyClaimedTaxInclusiveAmount: amount(0),
      AlreadyClaimedTaxInclusiveAmountCurr: curr(0),
      DifferenceTaxExclusiveAmount: local(invoice.subtotal),
      DifferenceTaxExclusiveAmountCurr: curr(invoice.subtotal),
      DifferenceTaxInclusiveAmount: local(invoice.total),
      DifferenceTaxInclusiveAmountCurr: curr(invoice.total),
      PaidDepositsAmount: amount(0),
      PaidDepositsAmountCurr: curr(0),
      PayableAmount: local(invoice.total),
      PayableAmountCurr: curr(invoice.total),
    },
    PaymentMeans: {
      Payment: {
        PaidAmount: foreign ? amount(invoice.total) : local(invoice.total),
        PaymentMeansCode: 42,
        Details: {
          PaymentDueDate: invoice.due_on,
          ID: account.id,
          BankCode: account.bank,
          Name: "",
          IBAN: iban ?? "",
          BIC: invoice.supplier.bic ?? "",
          VariableSymbol: invoice.variable_symbol ?? undefined,
        },
      },
    },
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<Invoice xmlns="${NAMESPACE}" version="${VERSION}">\n${body}</Invoice>\n`;
}
