import { describe, expect, it } from "vitest";
import { invoicesFromCsv, mapColumns, parseAmount, parseCsv, parseDate } from "./csv";

describe("CSV import", () => {
  it("parses quoted fields and separators", () => {
    expect(parseCsv('a;b\r\n"x;1";"he said ""hi"""\n')).toEqual([
      ["a", "b"],
      ["x;1", 'he said "hi"'],
    ]);
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("reads Czech dates and amounts", () => {
    expect(parseDate("16.10.2026")).toBe("2026-10-16");
    expect(parseDate("1. 2. 2025")).toBe("2025-02-01");
    expect(parseDate("2026-10-16T00:00:00")).toBe("2026-10-16");
    expect(parseDate("")).toBeNull();
    expect(parseAmount("12 345,50 Kč")).toBe(12345.5);
    expect(parseAmount("1,234.5")).toBe(1234.5);
    expect(parseAmount("-1 000")).toBe(-1000);
    expect(parseAmount("")).toBeNull();
  });

  it("maps iDoklad column names", () => {
    const map = mapColumns([
      "Číslo dokladu",
      "Odběratel",
      "IČ",
      "Celkem bez DPH",
      "DPH",
      "Celkem s DPH",
      "Datum vystavení",
    ]);
    expect(map).toMatchObject({
      number: 0,
      customer: 1,
      ico: 2,
      subtotal: 3,
      vat: 4,
      total: 5,
      issued: 6,
    });
  });

  it("turns rows into invoices", () => {
    const csv = [
      "Číslo dokladu;Datum vystavení;Datum splatnosti;Odběratel;IČ;Celkem;Měna;Datum úhrady;Typ dokladu",
      "20250001;3.1.2025;17.1.2025;Klient a.s.;12345678;10 000,00;CZK;15.1.2025;Faktura",
      "20250002;10.2.2025;24.2.2025;Jiný;;5000;CZK;;Faktura",
      "D20250001;12.2.2025;12.2.2025;Klient a.s.;12345678;1 000;CZK;;Opravný daňový doklad",
      "Z1;1.3.2025;1.3.2025;X;;100;CZK;;Zálohová faktura",
      ";;;;;;;;",
    ].join("\n");
    const result = invoicesFromCsv(csv);
    expect(result.missing).toEqual([]);
    expect(result.invoices).toHaveLength(3);
    expect(result.invoices[0]).toMatchObject({
      number: "20250001",
      issued_on: "2025-01-03",
      due_on: "2025-01-17",
      paid_on: "2025-01-15",
      total: 10000,
      customer: { name: "Klient a.s.", ico: "12345678" },
    });
    expect(result.invoices[1].paid_on).toBeNull();
    expect(result.invoices[2]).toMatchObject({ kind: "credit_note", total: -1000 });
    expect(result.skipped).toHaveLength(1);
  });

  it("reports missing columns", () => {
    expect(invoicesFromCsv("Foo;Bar\n1;2").missing).toEqual(["number", "issued", "total"]);
  });
});
