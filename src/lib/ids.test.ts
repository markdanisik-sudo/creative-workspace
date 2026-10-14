import { afterEach, describe, expect, it, vi } from "vitest";
import { isUuid, randomUuid } from "./ids";

describe("randomUuid", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns a v4 UUID", () => {
    expect(isUuid(randomUuid())).toBe(true);
  });

  it("works without crypto.randomUUID (insecure contexts)", () => {
    vi.stubGlobal("crypto", { getRandomValues: crypto.getRandomValues.bind(crypto) });
    const id = randomUuid();
    expect(isUuid(id)).toBe(true);
    expect(id[14]).toBe("4");
    expect("89ab").toContain(id[19]);
  });
});
