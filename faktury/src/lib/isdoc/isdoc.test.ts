import { describe, expect, it } from "vitest";
import type { InvoiceData } from "@/lib/invoice/types";
import { buildIsdoc, splitStreet } from "./build";
import { parseIsdoc, SkipError } from "./parse";

const invoice: InvoiceData & { id: string } = {
  id: "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
  kind: "invoice",
  number: "20260012",
  variable_symbol: "20260012",
  issued_on: "2026-10-16",
  taxable_on: "2026-10-16",
  due_on: "2026-10-30",
  paid_on: null,
  currency: "CZK",
  exchange_rate: 1,
  supplier: {
    name: "Studio & spol.",
    street: "Dlouhá 12/3",
    city: "Praha",
    zip: "110 00",
    country: "CZ",
    ico: "12345678",
    bank_account: "19-2000145399/0800",
    vat_payer: false,
  },
  customer: {
    name: "Klient s.r.o.",
    street: "Nádražní 5",
    city: "Brno",
    zip: "60200",
    ico: "87654321",
    dic: "CZ87654321",
  },
  items: [
    { description: "Natáčení <den>", quantity: 2, unit: "den", unit_price: 15000, vat_rate: 0 },
    { description: "Střih", quantity: 1, unit: null, unit_price: 8000.5, vat_rate: 0 },
  ],
  subtotal: 38000.5,
  vat: 0,
  total: 38000.5,
  note: null,
  source: "app",
  external_id: null,
};

describe("ISDOC", () => {
  it("writes a non-VAT invoice", () => {
    const xml = buildIsdoc(invoice);
    expect(xml).toContain('<Invoice xmlns="http://isdoc.cz/namespace/2013" version="6.0.2">');
    expect(xml).toContain("<DocumentType>1</DocumentType>");
    expect(xml).toContain("<VATApplicable>false</VATApplicable>");
    expect(xml).toContain("<Name>Studio &amp; spol.</Name>");
    expect(xml).toContain("<Description>Natáčení &lt;den&gt;</Description>");
    expect(xml).toContain("<StreetName>Dlouhá</StreetName>");
    expect(xml).toContain("<BuildingNumber>12/3</BuildingNumber>");
    expect(xml).toContain("<PayableAmount>38000.50</PayableAmount>");
    expect(xml).toContain("<ID>19-2000145399</ID>");
    expect(xml).toContain("<BankCode>0800</BankCode>");
    expect(xml).toContain("<IBAN>CZ6508000000192000145399</IBAN>");
    expect(xml).toContain("<UUID>3F2504E0-4F89-11D3-9A0C-0305E82C3301</UUID>");
    expect(xml).not.toContain("Curr>");
  });

  it("reads back what it writes", () => {
    const parsed = parseIsdoc(buildIsdoc(invoice));
    expect(parsed).toMatchObject({
      kind: "invoice",
      number: "20260012",
      variable_symbol: "20260012",
      issued_on: "2026-10-16",
      due_on: "2026-10-30",
      currency: "CZK",
      total: 38000.5,
      subtotal: 38000.5,
      vat: 0,
      source: "isdoc",
      external_id: "3F2504E0-4F89-11D3-9A0C-0305E82C3301",
    });
    expect(parsed.customer).toMatchObject({
      name: "Klient s.r.o.",
      ico: "87654321",
      dic: "CZ87654321",
      zip: "60200",
    });
    expect(parsed.supplier.bank_account).toBe("19-2000145399/0800");
    expect(parsed.items).toHaveLength(2);
    expect(parsed.items[0]).toMatchObject({ description: "Natáčení <den>", unit_price: 15000 });
  });

  it("keeps foreign-currency amounts and the rate", () => {
    const xml = buildIsdoc({ ...invoice, currency: "EUR", exchange_rate: 25 });
    expect(xml).toContain("<ForeignCurrencyCode>EUR</ForeignCurrencyCode>");
    expect(xml).toContain("<PayableAmount>950012.50</PayableAmount>");
    expect(xml).toContain("<PayableAmountCurr>38000.50</PayableAmountCurr>");
    const parsed = parseIsdoc(xml);
    expect(parsed.currency).toBe("EUR");
    expect(parsed.exchange_rate).toBe(25);
    expect(parsed.total).toBe(38000.5);
  });

  it("makes credit notes negative", () => {
    const xml = buildIsdoc({ ...invoice, kind: "credit_note" });
    const parsed = parseIsdoc(xml);
    expect(parsed.kind).toBe("credit_note");
    expect(parsed.total).toBe(-38000.5);
  });

  it("skips advance invoices and non-invoices", () => {
    const advance = buildIsdoc(invoice).replace("<DocumentType>1<", "<DocumentType>4<");
    expect(() => parseIsdoc(advance)).toThrow(SkipError);
    expect(() => parseIsdoc("<foo/>")).toThrow(SkipError);
  });

  it("splits street and building number", () => {
    expect(splitStreet("Na Příkopě 1096/12")).toEqual(["Na Příkopě", "1096/12"]);
    expect(splitStreet("Hlavní")).toEqual(["Hlavní", ""]);
    expect(splitStreet("Dobrá 3a")).toEqual(["Dobrá", "3a"]);
  });
});
