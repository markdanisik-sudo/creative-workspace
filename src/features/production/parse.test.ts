import { describe, expect, it } from "vitest";
import { parsePrice, parsePriceList } from "./parse";

describe("parsePrice", () => {
  it("reads Czech and plain prices", () => {
    expect(parsePrice("1 500 Kč")).toBe(1500);
    expect(parsePrice("1.500 CZK")).toBe(1500);
    expect(parsePrice("2500,-")).toBe(2500);
    expect(parsePrice("350,50")).toBe(350.5);
    expect(parsePrice("12 000 Kč / den")).toBe(12000);
    expect(parsePrice("na dotaz")).toBeNull();
  });
});

describe("parsePriceList", () => {
  it("reads spreadsheet rows with a category", () => {
    const list = parsePriceList(
      "Kamery\tARRI Alexa Mini LF\t12 000 Kč\nSvětla;Aputure 600d Pro;1 200",
    );
    expect(list.items).toEqual([
      { category: "Kamery", name: "ARRI Alexa Mini LF", pricePerDay: 12000 },
      { category: "Světla", name: "Aputure 600d Pro", pricePerDay: 1200 },
    ]);
  });

  it("uses a line without a price as the heading for the lines below", () => {
    const list = parsePriceList(
      "Objektivy:\nZeiss Supreme Prime 50mm 1 800 Kč\nCooke S4/i 32mm – 1500,-",
    );
    expect(list.items).toEqual([
      { category: "Objektivy", name: "Zeiss Supreme Prime 50mm", pricePerDay: 1800 },
      { category: "Objektivy", name: "Cooke S4/i 32mm", pricePerDay: 1500 },
    ]);
  });

  it("counts rows whose price can't be read", () => {
    const list = parsePriceList("Kamery;Sony Venice 2;na dotaz\nKamery;Sony FX6;2 500");
    expect(list.items).toHaveLength(1);
    expect(list.skipped).toBe(1);
  });
});
