/**
 * Reads a rental price list pasted from a spreadsheet, a PDF or a rental
 * house's website into catalog rows.
 *
 * Each line is an item: `category; name; price` (also tab- or `|`-separated,
 * as spreadsheets paste), `name; price`, or just `name 1 500 Kč`. A line with
 * no price is a heading: the category for the lines below it.
 */

export interface ParsedRental {
  category: string | null;
  name: string;
  pricePerDay: number;
}

export interface ParsedPriceList {
  items: ParsedRental[];
  /** Lines that looked like items but had no readable price. */
  skipped: number;
}

/** "1 500,50 Kč", "1.500 CZK", "2500,-" → 1500.5, 1500, 2500. */
export function parsePrice(raw: string): number | null {
  let text = raw
    .replace(/(kč|czk|,-|\/\s*den|\/\s*day|za den|per day)/gi, "")
    .replace(/[\s ]/g, "")
    .trim();
  if (!/^\d[\d.,]*$/.test(text)) return null;
  // A dot or comma followed by exactly three digits groups thousands.
  text = text.replace(/[.,](?=\d{3}(?:\D|$))/g, "");
  const value = Number(text.replace(",", "."));
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : null;
}

const PRICE_AT_END = /(\d[\d\s .,]*\d|\d)\s*(?:kč|czk)?\s*(?:,-)?\s*(?:\/\s*den|za den)?\s*$/i;

export function parsePriceList(text: string): ParsedPriceList {
  const items: ParsedRental[] = [];
  let category: string | null = null;
  let skipped = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const fields = line
      .split(/\t|;|\|/)
      .map((field) => field.trim())
      .filter(Boolean);

    if (fields.length >= 2) {
      const price = parsePrice(fields[fields.length - 1]);
      if (price === null) {
        skipped += 1;
        continue;
      }
      const rest = fields.slice(0, -1);
      const name = rest.length >= 2 ? rest.slice(1).join(" ") : rest[0];
      const itemCategory = rest.length >= 2 ? rest[0] : category;
      items.push({ category: itemCategory, name: name.slice(0, 200), pricePerDay: price });
      continue;
    }

    // One field: "Name 1 500 Kč", or a heading.
    const match = line.match(PRICE_AT_END);
    const name = match
      ? line
          .slice(0, match.index)
          .replace(/[\s–—:-]+$/, "")
          .trim()
      : "";
    const price = match ? parsePrice(match[0]) : null;
    if (name && price !== null) {
      items.push({ category, name: name.slice(0, 200), pricePerDay: price });
    } else {
      category = line.replace(/:$/, "").slice(0, 100);
    }
  }

  return { items, skipped };
}
