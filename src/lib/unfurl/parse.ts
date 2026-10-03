export interface LinkMetadata {
  url: string;
  title: string;
  description: string;
  image: string;
  favicon: string;
  siteName: string;
}

const MAX_TEXT_LENGTH = 300;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1].toLowerCase() === "x"
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000
        ? String.fromCodePoint(code)
        : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function clean(text: string | undefined): string {
  return decodeEntities(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

function parseAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attributes[match[1].toLowerCase()] = match[3] ?? match[4] ?? match[5] ?? "";
  }
  return attributes;
}

/** Resolves a possibly relative URL; only http(s) results are kept. */
function absolute(value: string | undefined, base: string): string {
  if (!value) return "";
  try {
    const url = new URL(decodeEntities(value.trim()), base);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

/** Extracts Open Graph / Twitter / HTML metadata from a page's <head>. */
export function parseLinkMetadata(html: string, pageUrl: string): LinkMetadata {
  const headEnd = html.search(/<\/head>/i);
  const head = headEnd === -1 ? html : html.slice(0, headEnd);
  const meta: Record<string, string> = {};
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const attributes = parseAttributes(tag);
    const key = (attributes.property ?? attributes.name ?? "").toLowerCase();
    if (key && attributes.content !== undefined && !(key in meta)) meta[key] = attributes.content;
  }

  let favicon = "";
  for (const tag of head.match(/<link\b[^>]*>/gi) ?? []) {
    const attributes = parseAttributes(tag);
    const rel = (attributes.rel ?? "").toLowerCase();
    if (rel.includes("apple-touch-icon") || (!favicon && rel.split(/\s+/).includes("icon"))) {
      favicon = attributes.href ?? favicon;
    }
  }

  const titleTag = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const url = absolute(meta["og:url"], pageUrl) || pageUrl;

  return {
    url,
    title: clean(meta["og:title"] ?? meta["twitter:title"] ?? titleTag),
    description: clean(
      meta["og:description"] ?? meta["twitter:description"] ?? meta["description"],
    ),
    image: absolute(meta["og:image"] ?? meta["og:image:url"] ?? meta["twitter:image"], pageUrl),
    favicon: absolute(favicon || "/favicon.ico", pageUrl),
    siteName: clean(meta["og:site_name"]) || new URL(pageUrl).hostname.replace(/^www\./, ""),
  };
}
