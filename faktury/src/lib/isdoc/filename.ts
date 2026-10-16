/** A file name safe on every system: "faktura-2026-0012.isdoc". */
export function isdocFileName(number: string, kind: "invoice" | "credit_note") {
  const safe = number.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "") || "faktura";
  return `${kind === "credit_note" ? "dobropis" : "faktura"}-${safe}.isdoc`;
}
