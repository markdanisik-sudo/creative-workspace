import { describe, expect, it } from "vitest";
import { cleanPalette, dominantColors, inkOn, normalizeHex, PALETTE_PRESETS } from "./palettes";

describe("palettes", () => {
  it("presets are valid, unique, shadows to highlights", () => {
    const ids = new Set(PALETTE_PRESETS.map((preset) => preset.id));
    expect(ids.size).toBe(PALETTE_PRESETS.length);
    for (const preset of PALETTE_PRESETS) {
      expect(preset.colors.length).toBeGreaterThanOrEqual(5);
      const brightness = preset.colors.map((hex) => {
        expect(normalizeHex(hex), `${preset.id} ${hex}`).toBe(hex);
        return [1, 3, 5].reduce((sum, index) => sum + parseInt(hex.slice(index, index + 2), 16), 0);
      });
      expect(brightness[0]).toBeLessThan(brightness[brightness.length - 1]);
    }
  });

  it("reads colours people type", () => {
    expect(normalizeHex("#ABC")).toBe("#aabbcc");
    expect(normalizeHex("1f3a40")).toBe("#1f3a40");
    expect(normalizeHex("red")).toBeNull();
  });

  it("keeps palettes in shape", () => {
    expect(
      cleanPalette({
        colors: [{ hex: "#FFF", name: " Sky " }, { hex: "nope" }, { hex: "#000000" }],
        preset: "kodak-2383",
        notes: "  warm  ",
        extra: 1,
      }),
    ).toEqual({
      colors: [{ hex: "#ffffff", name: "Sky" }, { hex: "#000000" }],
      preset: "kodak-2383",
      notes: "warm",
    });
    expect(cleanPalette({ preset: "made-up", colors: "x" })).toEqual({ colors: [] });
    expect(cleanPalette(null)).toEqual({ colors: [] });
  });

  it("picks readable text and dominant colours", () => {
    expect(inkOn("#ffffff")).toBe("#000000");
    expect(inkOn("#0b1214")).toBe("#ffffff");
    const pixels: [number, number, number][] = [
      ...Array.from({ length: 50 }, () => [10, 10, 10] as [number, number, number]),
      ...Array.from({ length: 50 }, () => [240, 200, 160] as [number, number, number]),
    ];
    expect(dominantColors(pixels, 2)).toEqual(["#0a0a0a", "#f0c8a0"]);
  });
});
