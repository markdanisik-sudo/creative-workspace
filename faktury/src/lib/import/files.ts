import { unzipSync } from "fflate";
import { parseIsdoc, SkipError } from "@/lib/isdoc/parse";
import type { InvoiceData } from "@/lib/invoice/types";
import { invoicesFromCsv } from "./csv";

export interface ReadResult {
  invoices: InvoiceData[];
  /** Human-readable notes on files or rows that were left out. */
  skipped: string[];
}

/** Text in UTF-8, or Windows-1250 (older Czech exports) when it isn't valid UTF-8. */
export function decodeText(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1250").decode(bytes);
  }
}

const extension = (name: string) => name.toLowerCase().split(".").pop() ?? "";

function readEntry(name: string, bytes: Uint8Array, result: ReadResult, depth = 0) {
  const ext = extension(name);
  const base = name.split("/").pop() ?? name;
  if (base.startsWith(".") || name.startsWith("__MACOSX/")) return;
  try {
    if (ext === "zip" || ext === "isdocx") {
      if (depth > 1) return;
      const entries = unzipSync(bytes);
      const before = result.invoices.length;
      for (const [entryName, entryBytes] of Object.entries(entries)) {
        if (entryName.endsWith("/")) continue;
        const entryExt = extension(entryName);
        // An .isdocx carries attachments (PDF) next to the .isdoc; only read the invoice.
        if (ext === "isdocx" && entryExt !== "isdoc") continue;
        if (!["isdoc", "isdocx", "xml", "csv", "zip"].includes(entryExt)) continue;
        readEntry(entryName, entryBytes, result, depth + 1);
      }
      if (ext === "isdocx" && result.invoices.length === before) {
        result.skipped.push(`${base}: v archivu není soubor .isdoc.`);
      }
      return;
    }
    if (ext === "isdoc" || ext === "xml") {
      result.invoices.push(parseIsdoc(decodeText(bytes)));
      return;
    }
    if (ext === "csv" || ext === "txt") {
      const csv = invoicesFromCsv(decodeText(bytes));
      if (csv.missing.length > 0) {
        result.skipped.push(
          `${base}: nenašel jsem sloupce ${csv.missing.map((column) => COLUMN_NAMES[column]).join(", ")}.`,
        );
      }
      result.invoices.push(...csv.invoices);
      result.skipped.push(...csv.skipped.map((note) => `${base}: ${note}`));
      return;
    }
    if (ext === "xlsx" || ext === "xls") {
      result.skipped.push(`${base}: Excel neumím přečíst — v iDokladu zvol export do CSV.`);
      return;
    }
    if (ext === "pdf") {
      result.skipped.push(`${base}: z PDF se data přečíst nedají — použij export ISDOC nebo CSV.`);
      return;
    }
    result.skipped.push(`${base}: neznámý typ souboru.`);
  } catch (error) {
    const reason = error instanceof SkipError ? error.message : "soubor se nepodařilo přečíst.";
    result.skipped.push(`${base}: ${reason}`);
  }
}

const COLUMN_NAMES: Record<string, string> = {
  number: "Číslo dokladu",
  issued: "Datum vystavení",
  total: "Celkem",
};

/** Reads ISDOC (.isdoc, .isdocx, .xml), CSV and ZIPs of them, in the browser. */
export async function readInvoiceFiles(files: File[]): Promise<ReadResult> {
  const result: ReadResult = { invoices: [], skipped: [] };
  for (const file of files) {
    readEntry(file.name, new Uint8Array(await file.arrayBuffer()), result);
  }
  return result;
}
