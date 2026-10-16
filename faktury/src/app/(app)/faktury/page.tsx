import { FileUp, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { listInvoiceRows } from "@/features/invoices/queries";
import { StatusBadge } from "@/features/invoices/StatusBadge";
import { formatDate, formatMoney, plural } from "@/lib/format";
import { invoiceStatus, round2, todayIso, type InvoiceStatus } from "@/lib/invoice/types";

export const metadata: Metadata = { title: "Faktury" };

const STATUSES = [
  { key: "", label: "Vše" },
  { key: "neuhrazene", label: "Neuhrazené" },
  { key: "po-splatnosti", label: "Po splatnosti" },
  { key: "zaplacene", label: "Zaplacené" },
] as const;

const MATCHES: Record<string, (status: InvoiceStatus) => boolean> = {
  neuhrazene: (status) => status !== "paid",
  "po-splatnosti": (status) => status === "overdue",
  zaplacene: (status) => status === "paid",
};

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export default async function InvoicesPage({ searchParams }: PageProps<"/faktury">) {
  const params = await searchParams;
  const rows = await listInvoiceRows();
  const today = todayIso();
  const years = [...new Set(rows.map((row) => row.issued_on.slice(0, 4)))].sort().reverse();
  const year = typeof params.rok === "string" && years.includes(params.rok) ? params.rok : "";
  const status = typeof params.stav === "string" && params.stav in MATCHES ? params.stav : "";
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const needle = normalize(q);

  const filtered = rows.filter((row) => {
    if (year && !row.issued_on.startsWith(year)) return false;
    if (status && !MATCHES[status](invoiceStatus(row, today))) return false;
    if (
      needle &&
      !normalize(`${row.number} ${row.customer_name} ${row.customer_ico ?? ""}`).includes(needle)
    ) {
      return false;
    }
    return true;
  });
  const sum = round2(filtered.reduce((total, row) => total + row.total_czk, 0));

  const href = (changes: Record<string, string>) => {
    const next = new URLSearchParams();
    const merged = { rok: year, stav: status, q, ...changes };
    for (const [key, value] of Object.entries(merged)) if (value) next.set(key, value);
    const text = next.toString();
    return text ? `/faktury?${text}` : "/faktury";
  };
  const isdocHref = `/faktury/export${year ? `?rok=${year}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-headline font-medium">Faktury</h1>
          <p className="text-body text-text-secondary">
            {filtered.length} {plural(filtered.length, "faktura", "faktury", "faktur")} ·{" "}
            {formatMoney(sum)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/import"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface px-4 text-body font-medium shadow-sm hover:bg-surface-muted"
          >
            <FileUp size={16} aria-hidden="true" />
            Import z iDokladu
          </Link>
          {rows.length > 0 ? (
            <a
              href={isdocHref}
              className="inline-flex h-9 items-center rounded-full bg-surface px-4 text-body font-medium shadow-sm hover:bg-surface-muted"
            >
              Stáhnout ISDOC {year || "vše"} (ZIP)
            </a>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((item) => (
            <Link
              key={item.key}
              href={href({ stav: item.key })}
              aria-current={status === item.key ? "true" : undefined}
              className="rounded-full bg-surface px-3.5 py-1.5 text-body font-medium text-text-secondary shadow-sm aria-[current=true]:bg-ink aria-[current=true]:text-text-inverse"
            >
              {item.label}
            </Link>
          ))}
          <span className="mx-1 hidden w-px bg-border sm:block" />
          {["", ...years.slice(0, 6)].map((item) => (
            <Link
              key={item || "all"}
              href={href({ rok: item })}
              aria-current={year === item ? "true" : undefined}
              className="rounded-full px-3 py-1.5 text-body font-medium text-text-secondary aria-[current=true]:bg-surface aria-[current=true]:text-text aria-[current=true]:shadow-sm"
            >
              {item || "Všechny roky"}
            </Link>
          ))}
        </div>
        <form action="/faktury" className="relative">
          {year ? <input type="hidden" name="rok" value={year} /> : null}
          {status ? <input type="hidden" name="stav" value={status} /> : null}
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-tertiary"
            aria-hidden="true"
          />
          <input
            name="q"
            defaultValue={q}
            placeholder="Hledat číslo, klienta, IČO"
            aria-label="Hledat"
            className="h-10 w-full rounded-full bg-surface pr-4 pl-10 text-body shadow-sm outline-none focus-visible:shadow-[0_0_0_2px_var(--text)] lg:w-72"
          />
        </form>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-surface p-10 text-center text-body text-text-secondary shadow-sm">
          {rows.length === 0 ? (
            <>
              Zatím žádné faktury.{" "}
              <Link
                href="/import"
                className="font-medium text-text underline-offset-4 hover:underline"
              >
                Nahraj je z iDokladu
              </Link>{" "}
              nebo{" "}
              <Link
                href="/faktury/nova"
                className="font-medium text-text underline-offset-4 hover:underline"
              >
                vystav novou
              </Link>
              .
            </>
          ) : (
            "Nic tomu neodpovídá."
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-surface shadow-sm">
          <table className="w-full text-body">
            <thead className="hidden sm:table-header-group">
              <tr className="text-left text-caption text-text-secondary">
                <th className="px-5 py-3 font-medium">Číslo</th>
                <th className="px-3 py-3 font-medium">Odběratel</th>
                <th className="px-3 py-3 font-medium">Vystaveno</th>
                <th className="px-3 py-3 font-medium">Splatnost</th>
                <th className="px-3 py-3 font-medium">Stav</th>
                <th className="px-5 py-3 text-right font-medium">Částka</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const rowStatus = invoiceStatus(row, today);
                return (
                  <tr
                    key={row.id}
                    className="relative border-t border-border first:border-t-0 hover:bg-surface-hover sm:first:border-t"
                  >
                    <td className="hidden px-5 py-3 font-medium tabular sm:table-cell">
                      <Link href={`/faktury/${row.id}`} className="after:absolute after:inset-0">
                        {row.number}
                      </Link>
                      {row.kind === "credit_note" ? (
                        <span className="ml-1.5 text-caption text-text-secondary">dobropis</span>
                      ) : null}
                    </td>
                    <td className="max-w-0 px-4 py-3 sm:w-[34%] sm:px-3">
                      <span className="block truncate font-medium sm:font-normal">
                        {row.customer_name}
                      </span>
                      <span className="block text-caption text-text-secondary tabular sm:hidden">
                        <Link href={`/faktury/${row.id}`} className="after:absolute after:inset-0">
                          {row.number}
                        </Link>{" "}
                        · {formatDate(row.issued_on)}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 text-text-secondary tabular sm:table-cell">
                      {formatDate(row.issued_on)}
                    </td>
                    <td className="hidden px-3 py-3 text-text-secondary tabular sm:table-cell">
                      {formatDate(row.due_on)}
                    </td>
                    <td className="hidden px-3 py-3 sm:table-cell">
                      <StatusBadge status={rowStatus} />
                    </td>
                    <td className="px-4 py-3 text-right sm:px-5">
                      <span className="block font-medium whitespace-nowrap tabular">
                        {formatMoney(row.total, row.currency)}
                      </span>
                      <span className="sm:hidden">
                        <StatusBadge status={rowStatus} />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
