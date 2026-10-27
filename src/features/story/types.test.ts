import { describe, expect, it } from "vitest";
import { toStorySummary } from "./types";

describe("toStorySummary", () => {
  it("keeps a well-formed summary", () => {
    const summary = toStorySummary({
      title: "Noční jízda",
      logline: "Kurýrka projíždí Prahou jednu noc.",
      synopsis: "…",
      tone: "Neon, 16 mm",
      scenes: [{ title: "Start", description: "Výjezd z garáže" }],
      needs: { locations: ["Garáž"], cast: ["Kurýrka"], gear: ["FX6"], props: ["Kolo"] },
      questions: ["Kdy svítá?"],
    });
    expect(summary?.scenes).toEqual([{ title: "Start", description: "Výjezd z garáže" }]);
    expect(summary?.needs.gear).toEqual(["FX6"]);
  });

  it("drops junk and empty answers", () => {
    expect(toStorySummary(null)).toBeNull();
    expect(toStorySummary({ title: "Bez obsahu" })).toBeNull();
    const summary = toStorySummary({
      logline: "Nápad",
      scenes: [null, { title: "" }, "x", { title: "Scéna" }],
      needs: { gear: ["", 3, "Kamera"] },
      questions: "not a list",
    });
    expect(summary?.scenes).toEqual([{ title: "Scéna", description: "" }]);
    expect(summary?.needs).toEqual({ locations: [], cast: [], gear: ["Kamera"], props: [] });
    expect(summary?.questions).toEqual([]);
  });
});
