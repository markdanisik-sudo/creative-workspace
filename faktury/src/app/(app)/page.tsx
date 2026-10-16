import { AlertCircle, ArrowDownRight, ArrowUpRight, FileUp, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getBusiness } from "@/features/business/queries";
import { MonthlyChart } from "@/features/dashboard/MonthlyChart";
import { listInvoiceRows } from "@/features/invoices/queries";
import { StatusBadge } from "@/features/invoices/StatusBadge";
import { cn } from "@/lib/cn";
import { formatDate, formatMoney, plural } from "@/lib/format";
import { totalsByYear, VAT_THRESHOLD, yearStats, type StatBasis } from "@/lib/invoice/stats";
import { invoiceStatus, todayIso } from "@/lib/invoice/types";

export const metadata: Metadata = { title: "Přehled" };

function Segmented({ items }: { items: { href: string; label: string; active: boolean }[] }) {
  return (
    <div className="flex rounded-full bg-surface p-0.5 shadow-sm">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          scroll={false}
          aria-current={item.active ? "true" : undefined}
          className="rounded-full px-3.5 py-1.5 text-body font-medium text-text-secondary aria-[current=true]:bg-ink aria-[current=true]:text-text-inverse"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

function Tile({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "critical";
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-surface p-5 shadow-sm">
      <span className="flex items-center gap-1.5 text-caption font-medium text-text-secondary">
        {tone === "critical" ? (
          <AlertCircle size={14} className="text-danger" aria-hidden="true" />
        ) : null}
        {label}
      </span>
      <span className="text-title font-semibold">{value}</span>
      {note ? <span className="text-caption text-text-secondary">{note}</span> : null}
    </div>
  );
}

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const [rows, business] = await Promise.all([listInvoiceRows(), getBusiness()]);
  const today = todayIso();
  const thisYear = Number(today.slice(0, 4));
  const basis: StatBasis = params.podle === "uhrady" ? "paid" : "issued";
  const years = totalsByYear(rows, basis);
  const yearList = [...new Set([thisYear, ...years.map((item) => item.year)])].sort(
    (a, b) => b - a,
  );
  const requested = Number(params.rok);
  const year = yearList.includes(requested) ? requested : thisYear;
  const stats = yearStats(rows, year, basis, today);
  const query = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams();
    const merged = { rok: String(year), podle: basis === "paid" ? "uhrady" : null, ...changes };
    for (const [key, value] of Object.entries(merged)) if (value) next.set(key, value);
    const text = next.toString();
    return text ? `/?${text}` : "/";
  };

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="text-headline font-medium">Přehled</h1>
        {!business.complete ? <SetupBanner /> : null}
        <div className="flex flex-col items-start gap-5 rounded-xl bg-surface p-7 shadow-sm sm:p-10">
          <div className="flex flex-col gap-2">
            <h2 className="text-title font-semibold">Zatím tu nejsou žádné faktury</h2>
            <p className="max-w-lg text-callout text-text-secondary">
              Nahraj faktury z iDokladu (export ISDOC nebo CSV) a uvidíš, kolik jsi za každý rok
              vydělal. Nebo rovnou vystav novou.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/import"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-6 text-callout font-medium text-text-inverse hover:bg-ink-hover"
            >
              <FileUp size={18} aria-hidden="true" />
              Nahrát z iDokladu
            </Link>
            <Link
              href="/faktury/nova"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-surface-muted px-6 text-callout font-medium hover:bg-surface-pressed"
            >
              <Plus size={18} aria-hidden="true" />
              Nová faktura
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isThisYear = year === thisYear;
  const delta =
    stats.previousToDate && stats.previousToDate > 0
      ? (stats.invoiced - stats.previousToDate) / stats.previousToDate
      : null;
  const basisLabel = basis === "paid" ? "Podle data úhrady" : "Podle data vystavení";
  const unpaid = rows
    .filter((row) => invoiceStatus(row, today) !== "paid")
    .sort((a, b) => a.due_on.localeCompare(b.due_on))
    .slice(0, 6);
  const maxYear = Math.max(...years.map((item) => item.total), 1);
  const vatShare = Math.min(stats.invoiced / VAT_THRESHOLD, 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-headline font-medium">Přehled</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            items={[
              { href: query({ podle: null }), label: "Vystaveno", active: basis === "issued" },
              { href: query({ podle: "uhrady" }), label: "Zaplaceno", active: basis === "paid" },
            ]}
          />
          <Segmented
            items={yearList.slice(0, 5).map((item) => ({
              href: query({ rok: String(item) }),
              label: String(item),
              active: item === year,
            }))}
          />
        </div>
      </div>

      {!business.complete ? <SetupBanner /> : null}

      <section className="surface-invert flex flex-col gap-2 rounded-xl bg-surface p-6 shadow-md sm:p-8">
        <span className="text-callout text-text-secondary">
          {basis === "paid" ? "Přišlo na účet" : "Vyfakturováno"} v roce {year}
        </span>
        <span className="text-[44px] leading-[1.05] font-semibold tracking-[-0.04em] sm:text-hero">
          {formatMoney(stats.invoiced)}
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body text-text-secondary">
          <span>
            {stats.count} {plural(stats.count, "faktura", "faktury", "faktur")}
          </span>
          {delta !== null ? (
            <span className="inline-flex items-center gap-1">
              {delta >= 0 ? (
                <ArrowUpRight size={15} aria-hidden="true" />
              ) : (
                <ArrowDownRight size={15} aria-hidden="true" />
              )}
              <span className="font-medium text-text">
                {delta >= 0 ? "+" : "−"}
                {Math.abs(Math.round(delta * 100))} %
              </span>
              oproti {isThisYear ? `stejnému období ${year - 1}` : `roku ${year - 1}`}
            </span>
          ) : null}
        </span>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Zaplaceno" value={formatMoney(stats.paid)} />
        <Tile label="Čeká na úhradu" value={formatMoney(stats.unpaid)} />
        <Tile
          label="Po splatnosti"
          value={formatMoney(stats.overdue)}
          note={
            stats.overdueCount > 0
              ? `${stats.overdueCount} ${plural(stats.overdueCount, "faktura", "faktury", "faktur")}`
              : "Nic nehoří"
          }
          tone={stats.overdueCount > 0 ? "critical" : undefined}
        />
        <Tile
          label="Průměr na měsíc"
          value={formatMoney(
            Math.round(stats.invoiced / (isThisYear ? Number(today.slice(5, 7)) : 12)),
          )}
        />
      </div>

      <MonthlyChart
        months={stats.months}
        currentMonth={isThisYear ? Number(today.slice(5, 7)) - 1 : null}
        basisLabel={basisLabel}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-sm sm:p-6">
          <h2 className="text-callout font-semibold">Nejlepší klienti {year}</h2>
          {stats.customers.length === 0 ? (
            <p className="text-body text-text-secondary">V tomto roce žádné faktury.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {stats.customers.slice(0, 6).map((customer) => (
                <li key={customer.name} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-body">
                    <span className="truncate font-medium">{customer.name}</span>
                    <span className="shrink-0 tabular">{formatMoney(customer.total)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-ink"
                      style={{
                        width: `${Math.max((customer.total / (stats.customers[0].total || 1)) * 100, 1)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-sm sm:p-6">
          <h2 className="text-callout font-semibold">Po letech</h2>
          <ol className="flex flex-col gap-3">
            {[...years].reverse().map((item) => (
              <li key={item.year}>
                <Link
                  href={query({ rok: String(item.year) })}
                  scroll={false}
                  className="flex flex-col gap-1.5 rounded-md"
                >
                  <div className="flex items-baseline justify-between gap-3 text-body">
                    <span
                      className={cn(
                        "font-medium",
                        item.year === year ? "text-text" : "text-text-secondary",
                      )}
                    >
                      {item.year}
                    </span>
                    <span className="tabular">{formatMoney(item.total)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        item.year === year ? "bg-ink" : "bg-text-tertiary",
                      )}
                      style={{ width: `${Math.max((item.total / maxYear) * 100, 1)}%` }}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ol>
          {!business.vat_payer ? (
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-4">
              <div className="flex items-baseline justify-between gap-3 text-body">
                <span className="font-medium">Limit pro DPH v roce {year}</span>
                <span className="tabular text-text-secondary">
                  {formatMoney(stats.invoiced)} / {formatMoney(VAT_THRESHOLD)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-muted">
                <div
                  className={cn("h-full rounded-full", vatShare >= 0.9 ? "bg-danger" : "bg-ink")}
                  style={{ width: `${Math.max(vatShare * 100, 1)}%` }}
                />
              </div>
              <p className="text-caption text-text-secondary">
                {vatShare >= 1
                  ? "Obrat přesáhl 2 mil. Kč — je čas řešit registraci k DPH s účetní."
                  : `Do povinné registrace k DPH zbývá ${formatMoney(VAT_THRESHOLD - stats.invoiced)} (orientačně, podle vystavených faktur).`}
              </p>
            </div>
          ) : null}
        </section>
      </div>

      {unpaid.length > 0 ? (
        <section className="flex flex-col gap-3 rounded-xl bg-surface p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-callout font-semibold">Čeká na zaplacení</h2>
            <Link
              href="/faktury?stav=neuhrazene"
              className="text-body text-text-secondary hover:text-text"
            >
              Vše
            </Link>
          </div>
          <ul className="flex flex-col">
            {unpaid.map((row) => (
              <li key={row.id} className="border-t border-border first:border-t-0">
                <Link
                  href={`/faktury/${row.id}`}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{row.customer_name}</span>
                    <span className="text-caption text-text-secondary tabular">
                      {row.number} · splatnost {formatDate(row.due_on)}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-medium tabular">
                      {formatMoney(row.total, row.currency)}
                    </span>
                    <StatusBadge status={invoiceStatus(row, today)} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function SetupBanner() {
  return (
    <Link
      href="/nastaveni"
      className="flex items-center justify-between gap-4 rounded-xl bg-surface p-5 shadow-sm hover:shadow-md"
    >
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold">Doplň své fakturační údaje</span>
        <span className="text-body text-text-secondary">
          Jméno, adresa, IČO a číslo účtu — objeví se na každé faktuře.
        </span>
      </span>
      <span className="shrink-0 text-body font-medium">Nastavit →</span>
    </Link>
  );
}
