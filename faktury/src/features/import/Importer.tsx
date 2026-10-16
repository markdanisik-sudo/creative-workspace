"use client";

import { CheckCircle2, FileUp, Info } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { importInvoices, type ImportSummary } from "@/features/invoices/actions";
import { cn } from "@/lib/cn";
import { formatMoney, plural } from "@/lib/format";
import { readInvoiceFiles } from "@/lib/import/files";
import type { InvoiceData } from "@/lib/invoice/types";

const BATCH = 200;

interface Preview {
  invoices: InvoiceData[];
  received: InvoiceData[];
  skipped: string[];
  files: number;
}

/** Drop or pick the iDoklad export; check the summary; import. */
export function Importer({ ownIco }: { ownIco: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [markPaid, setMarkPaid] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const read = async (list: FileList | File[]) => {
    const files = [...list];
    if (files.length === 0) return;
    setReading(true);
    setSummary(null);
    setError(null);
    const result = await readInvoiceFiles(files);
    // Invoices someone else issued to this business are costs, not income.
    const own = (ownIco ?? "").replace(/\s/g, "");
    const isReceived = (invoice: InvoiceData) =>
      Boolean(
        own && invoice.supplier.ico && invoice.supplier.ico !== own && invoice.customer.ico === own,
      );
    setPreview({
      invoices: result.invoices.filter((invoice) => !isReceived(invoice)),
      received: result.invoices.filter(isReceived),
      skipped: result.skipped,
      files: files.length,
    });
    setReading(false);
  };

  const run = async () => {
    if (!preview) return;
    const total: ImportSummary = { added: 0, duplicates: 0, errors: [] };
    setProgress(0);
    for (let start = 0; start < preview.invoices.length; start += BATCH) {
      const result = await importInvoices(preview.invoices.slice(start, start + BATCH), {
        markPastDuePaid: markPaid,
      });
      if (!result.ok) {
        setError(result.error);
        break;
      }
      total.added += result.data.added;
      total.duplicates += result.data.duplicates;
      total.errors.push(...result.data.errors);
      setProgress(Math.min(start + BATCH, preview.invoices.length));
    }
    setProgress(null);
    setSummary(total);
    setPreview(null);
  };

  const years = preview
    ? Object.entries(
        preview.invoices.reduce<Record<string, { count: number; total: number }>>(
          (acc, invoice) => {
            const year = invoice.issued_on.slice(0, 4);
            acc[year] ??= { count: 0, total: 0 };
            acc[year].count++;
            acc[year].total += invoice.total * invoice.exchange_rate;
            return acc;
          },
          {},
        ),
      ).sort((a, b) => b[0].localeCompare(a[0]))
    : [];

  return (
    <div className="flex flex-col gap-6">
      {summary ? (
        <section className="flex flex-col gap-3 rounded-xl bg-surface p-6 shadow-sm">
          <p className="flex items-center gap-2 text-callout font-semibold">
            <CheckCircle2 size={20} className="text-[var(--success)]" aria-hidden="true" />
            Hotovo — {summary.added}{" "}
            {plural(summary.added, "faktura přidána", "faktury přidány", "faktur přidáno")}
          </p>
          {summary.duplicates > 0 ? (
            <p className="text-body text-text-secondary">
              {summary.duplicates}{" "}
              {plural(
                summary.duplicates,
                "faktura už tu byla",
                "faktury už tu byly",
                "faktur už tu bylo",
              )}{" "}
              — přeskočeno.
            </p>
          ) : null}
          {summary.errors.length > 0 ? (
            <details className="text-body text-text-secondary">
              <summary>Nepodařilo se: {summary.errors.length}</summary>
              <ul className="mt-2 list-disc pl-5">
                {summary.errors.slice(0, 50).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </details>
          ) : null}
          <div className="flex gap-2 pt-1">
            <Link
              href="/"
              className="inline-flex h-9 items-center rounded-full bg-ink px-4 text-body font-medium text-text-inverse"
            >
              Zobrazit přehled
            </Link>
            <Button onClick={() => setSummary(null)}>Nahrát další</Button>
          </div>
        </section>
      ) : null}

      {!preview && !summary ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void read(event.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border-strong bg-surface px-6 py-14 text-center transition-colors",
            dragging && "border-text bg-surface-muted",
          )}
        >
          <FileUp size={32} className="text-text-secondary" aria-hidden="true" />
          <span className="text-callout font-semibold">
            {reading ? "Čtu soubory…" : "Přetáhni sem export z iDokladu"}
          </span>
          <span className="max-w-md text-body text-text-secondary">
            Soubory .isdoc, .isdocx, ZIP s nimi, nebo seznam faktur v CSV. Nebo klikni a vyber je.
          </span>
        </button>
      ) : null}
      <input
        ref={input}
        type="file"
        multiple
        accept=".isdoc,.isdocx,.xml,.zip,.csv,.txt"
        className="hidden"
        onChange={(event) => {
          if (event.target.files) void read(event.target.files);
          event.target.value = "";
        }}
      />

      {preview ? (
        <section className="flex flex-col gap-5 rounded-xl bg-surface p-6 shadow-sm">
          <div className="flex flex-col gap-1">
            <h2 className="text-title font-semibold">
              Nalezeno {preview.invoices.length}{" "}
              {plural(preview.invoices.length, "faktura", "faktury", "faktur")}
            </h2>
            <p className="text-body text-text-secondary">
              Z {preview.files} {plural(preview.files, "souboru", "souborů", "souborů")}. Faktury,
              které už tu jsou (stejné číslo), se přeskočí.
            </p>
          </div>
          {years.length > 0 ? (
            <table className="w-full max-w-md text-body">
              <tbody>
                {years.map(([year, sums]) => (
                  <tr key={year} className="border-t border-border first:border-t-0">
                    <td className="py-1.5 font-medium">{year}</td>
                    <td className="py-1.5 text-text-secondary">
                      {sums.count} {plural(sums.count, "faktura", "faktury", "faktur")}
                    </td>
                    <td className="py-1.5 text-right tabular">
                      {formatMoney(Math.round(sums.total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
          {preview.received.length > 0 ? (
            <p className="flex gap-2 rounded-lg bg-surface-muted p-3 text-body text-text-secondary">
              <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              {preview.received.length}{" "}
              {plural(
                preview.received.length,
                "faktura je přijatá",
                "faktury jsou přijaté",
                "faktur je přijatých",
              )}{" "}
              (vystavil je někdo tobě) — do příjmů je nepočítám.
            </p>
          ) : null}
          {preview.skipped.length > 0 ? (
            <details className="text-body text-text-secondary">
              <summary>Přeskočeno: {preview.skipped.length}</summary>
              <ul className="mt-2 list-disc pl-5">
                {preview.skipped.slice(0, 100).map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </details>
          ) : null}
          <label className="flex items-start gap-2.5 text-body">
            <input
              type="checkbox"
              checked={markPaid}
              onChange={(event) => setMarkPaid(event.target.checked)}
              className="mt-0.5 size-4 accent-[var(--ink)]"
            />
            <span>
              Faktury po splatnosti bez údaje o úhradě označit jako zaplacené
              <span className="block text-caption text-text-secondary">
                ISDOC neříká, jestli byla faktura zaplacená. U starých faktur to obvykle platí;
                nezaplacené pak stačí přepnout ručně.
              </span>
            </span>
          </label>
          {error ? (
            <p role="alert" className="text-body text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="lg"
              onClick={run}
              loading={progress !== null}
              disabled={preview.invoices.length === 0}
            >
              {progress !== null
                ? `Ukládám ${progress} / ${preview.invoices.length}`
                : `Importovat ${preview.invoices.length}`}
            </Button>
            <Button size="lg" onClick={() => setPreview(null)} disabled={progress !== null}>
              Zrušit
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
