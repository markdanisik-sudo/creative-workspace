import { describe, expect, it } from "vitest";
import { DEFAULT_GROUPS, effectiveSpec, SPEC_GROUPS } from "./shot-options";

describe("shot specs", () => {
  it("uses the shot's own value before the project default", () => {
    expect(effectiveSpec("fps", { fps: "50" }, { fps: "25" })).toEqual({
      value: "50",
      inherited: false,
    });
    expect(effectiveSpec("fps", {}, { fps: "25" })).toEqual({ value: "25", inherited: true });
    expect(effectiveSpec("fps", {}, {})).toEqual({ value: undefined, inherited: false });
  });

  it("has unique keys and lets the camera setup be set per project", () => {
    const keys = SPEC_GROUPS.map((group) => group.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(DEFAULT_GROUPS.map((group) => group.key)).toEqual(
      expect.arrayContaining(["camera", "resolution", "codec", "fps"]),
    );
  });
});
