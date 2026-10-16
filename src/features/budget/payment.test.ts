import { describe, expect, it } from "vitest";
import { czechAccountToIban, isValidIban, payableIban, spaydString } from "./payment";

describe("payments", () => {
  it("turns a Czech account number into its IBAN", () => {
    // The example from the Czech National Bank's IBAN documentation.
    expect(czechAccountToIban("19-2000145399/0800")).toBe("CZ6508000000192000145399");
    expect(isValidIban("CZ65 0800 0000 1920 0014 5399")).toBe(true);
    expect(isValidIban("CZ6608000000192000145399")).toBe(false);
    expect(czechAccountToIban("not an account")).toBeNull();
  });

  it("prefers a valid IBAN and falls back to the account number", () => {
    expect(payableIban("CZ6508000000192000145399", null)).toBe("CZ6508000000192000145399");
    expect(payableIban("nonsense", "19-2000145399/0800")).toBe("CZ6508000000192000145399");
    expect(payableIban(null, null)).toBeNull();
  });

  it("builds a QR Platba string", () => {
    expect(
      spaydString({
        iban: "CZ65 0800 0000 1920 0014 5399",
        amount: 12500,
        currency: "czk",
        variableSymbol: "2026001",
        message: "Kampaň * Podzim",
        recipient: "m.studio",
      }),
    ).toBe(
      "SPD*1.0*ACC:CZ6508000000192000145399*AM:12500.00*CC:CZK*X-VS:2026001*RN:m.studio*MSG:Kampaň Podzim",
    );
  });
});
