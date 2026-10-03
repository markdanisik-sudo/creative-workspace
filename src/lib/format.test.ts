import { describe, expect, it } from "vitest";
import { formatBytes, formatEdited, initials, pluralize } from "./format";

describe("formatEdited", () => {
  const now = new Date("2026-10-03T12:00:00Z");
  it("says just now for recent edits", () => {
    expect(formatEdited("2026-10-03T11:59:30Z", now)).toBe("Just now");
  });
  it("uses relative minutes, hours and days", () => {
    expect(formatEdited("2026-10-03T11:55:00Z", now)).toBe("5 minutes ago");
    expect(formatEdited("2026-10-03T09:00:00Z", now)).toBe("3 hours ago");
    expect(formatEdited("2026-10-02T09:00:00Z", now)).toBe("Yesterday");
  });
  it("falls back to a date after a week", () => {
    expect(formatEdited("2026-09-01T09:00:00Z", now)).toBe("Sep 1, 2026");
  });
});

describe("helpers", () => {
  it("pluralizes", () => {
    expect(pluralize(1, "item")).toBe("1 item");
    expect(pluralize(3, "item")).toBe("3 items");
  });
  it("formats bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(25 * 1024 * 1024)).toBe("25 MB");
  });
  it("builds initials", () => {
    expect(initials("Mark Danisik")).toBe("MD");
    expect(initials("studio")).toBe("S");
    expect(initials("  ")).toBe("?");
  });
});
