import { describe, expect, it } from "vitest";
import { isPublicAddress } from "./address";
import { decodeEntities, parseLinkMetadata } from "./parse";

describe("isPublicAddress", () => {
  it.each(["8.8.8.8", "151.101.1.69", "2606:4700::1111"])("allows %s", (address) => {
    expect(isPublicAddress(address)).toBe(true);
  });
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.20.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "::ffff:127.0.0.1",
    "fd00::1",
    "fe80::1",
    "not-an-ip",
  ])("blocks %s", (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });
});

describe("parseLinkMetadata", () => {
  const html = `<!doctype html><html><head>
    <title>Fallback &amp; title</title>
    <meta property="og:title" content="Porsche 911 &#8212; Summer">
    <meta name="description" content="  A   short
      description ">
    <meta property="og:image" content="/img/hero.jpg">
    <meta property="og:site_name" content="Porsche">
    <link rel="icon" href="/favicon.png">
    <link rel="apple-touch-icon" href="https://cdn.example.com/touch.png">
  </head><body><meta property="og:title" content="ignored"></body></html>`;

  it("prefers Open Graph and resolves relative URLs", () => {
    expect(parseLinkMetadata(html, "https://www.porsche.com/models/911")).toEqual({
      url: "https://www.porsche.com/models/911",
      title: "Porsche 911 — Summer",
      description: "A short description",
      image: "https://www.porsche.com/img/hero.jpg",
      favicon: "https://cdn.example.com/touch.png",
      siteName: "Porsche",
    });
  });

  it("falls back to the title tag and hostname", () => {
    const result = parseLinkMetadata(
      "<head><title>Hello</title></head>",
      "https://www.example.com/a",
    );
    expect(result.title).toBe("Hello");
    expect(result.siteName).toBe("example.com");
    expect(result.image).toBe("");
  });

  it("drops non-http image URLs", () => {
    const result = parseLinkMetadata(
      `<head><meta property="og:image" content="javascript:alert(1)"></head>`,
      "https://example.com",
    );
    expect(result.image).toBe("");
  });

  it("decodes entities", () => {
    expect(decodeEntities("&lt;b&gt; &#x27;q&#39; &unknown;")).toBe("<b> 'q' &unknown;");
  });
});
