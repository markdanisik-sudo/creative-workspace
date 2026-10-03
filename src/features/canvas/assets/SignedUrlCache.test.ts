import { describe, expect, it, vi } from "vitest";
import { SignedUrlCache } from "./SignedUrlCache";

describe("SignedUrlCache", () => {
  it("batches lookups made in the same tick", async () => {
    const sign = vi.fn(
      async (paths: string[]) => new Map(paths.map((p) => [p, `https://cdn/${p}`])),
    );
    const cache = new SignedUrlCache(sign, 60_000, 0);
    const [a, b, a2] = await Promise.all([cache.get("a"), cache.get("b"), cache.get("a")]);
    expect(sign).toHaveBeenCalledTimes(1);
    expect(sign).toHaveBeenCalledWith(["a", "b"]);
    expect([a, b, a2]).toEqual(["https://cdn/a", "https://cdn/b", "https://cdn/a"]);
    expect(cache.peek("a")).toBe("https://cdn/a");
  });

  it("refreshes URLs close to expiry", async () => {
    let now = 0;
    const sign = vi.fn(async (paths: string[]) => new Map(paths.map((p) => [p, `${p}@${now}`])));
    const cache = new SignedUrlCache(sign, 1000, 100, () => now);
    expect(await cache.get("x")).toBe("x@0");
    now = 950;
    expect(cache.peek("x")).toBeNull();
    expect(await cache.get("x")).toBe("x@950");
  });

  it("resolves null when signing fails", async () => {
    const cache = new SignedUrlCache(async () => {
      throw new Error("offline");
    }, 1000);
    expect(await cache.get("x")).toBeNull();
  });
});
