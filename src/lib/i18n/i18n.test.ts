import { describe, expect, it } from "vitest";
import { localeFromAcceptLanguage, translator } from ".";

describe("translator", () => {
  it("interpolates parameters", () => {
    expect(translator("en").t("dashboard.greeting", { name: "Mark" })).toBe(
      "Good to see you, Mark.",
    );
    expect(translator("cs").t("dashboard.greeting", { name: "Mark" })).toBe(
      "Rádi vás vidíme, Mark.",
    );
  });

  it("chooses Czech plural forms", () => {
    const { tp } = translator("cs");
    expect(tp("plural.project", 1)).toBe("1 projekt");
    expect(tp("plural.project", 3)).toBe("3 projekty");
    expect(tp("plural.project", 5)).toBe("5 projektů");
    expect(tp("plural.item", 0)).toBe("0 položek");
  });

  it("chooses English plural forms", () => {
    const { tp } = translator("en");
    expect(tp("plural.board", 1)).toBe("1 board");
    expect(tp("plural.board", 2)).toBe("2 boards");
  });

  it("detects the browser language", () => {
    expect(localeFromAcceptLanguage("cs-CZ,cs;q=0.9,en;q=0.8")).toBe("cs");
    expect(localeFromAcceptLanguage("sk")).toBe("cs");
    expect(localeFromAcceptLanguage("de-DE,en;q=0.5")).toBe("en");
    expect(localeFromAcceptLanguage(null)).toBe("en");
  });
});
