import { describe, expect, it } from "vitest";
import { formatBytes, formatEdited, formatMoney, initials } from "./format";

describe("formatEdited", () => {
  const now = new Date("2026-10-03T12:00:00Z");
  it("says now for recent edits", () => {
    expect(formatEdited("2026-10-03T11:59:30Z", "en", now)).toBe("Now");
    expect(formatEdited("2026-10-03T11:59:30Z", "cs", now)).toBe("Nyní");
  });
  it("uses relative minutes, hours and days", () => {
    expect(formatEdited("2026-10-03T11:55:00Z", "en", now)).toBe("5 minutes ago");
    expect(formatEdited("2026-10-03T09:00:00Z", "en", now)).toBe("3 hours ago");
    expect(formatEdited("2026-10-02T09:00:00Z", "en", now)).toBe("Yesterday");
    expect(formatEdited("2026-10-02T09:00:00Z", "cs", now)).toBe("Včera");
  });
  it("falls back to a date after a week", () => {
    expect(formatEdited("2026-09-01T09:00:00Z", "en", now)).toBe("Sep 1, 2026");
  });
});

describe("helpers", () => {
  it("formats bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(25 * 1024 * 1024)).toBe("25 MB");
  });
  it("formats money per locale", () => {
    expect(formatMoney(12000, "CZK", "cs").replace(/\s/g, " ")).toBe("12 000 Kč");
    expect(formatMoney(1500, "EUR", "en")).toBe("€1,500");
  });
  it("builds initials", () => {
    expect(initials("Mark Danisik")).toBe("MD");
    expect(initials("studio")).toBe("S");
    expect(initials("  ")).toBe("?");
  });
});
