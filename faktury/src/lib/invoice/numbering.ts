/**
 * The next invoice number for a year, continuing whatever numbering is
 * already there (including imported invoices): "20260007" → "20260008".
 * Falls back to YYYY + 4-digit sequence ("20260001").
 */
export function nextInvoiceNumber(existing: string[], year: number): string {
  const prefix = String(year);
  let best: { value: bigint; width: number } | null = null;
  for (const number of existing) {
    if (!/^\d+$/.test(number) || !number.startsWith(prefix) || number.length <= prefix.length) {
      continue;
    }
    const value = BigInt(number);
    if (!best || value > best.value) best = { value, width: number.length };
  }
  if (!best) return `${prefix}0001`;
  return String(best.value + BigInt(1)).padStart(best.width, "0");
}
