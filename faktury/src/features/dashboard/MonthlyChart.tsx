"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { formatCompact, formatMoney, MONTHS, MONTHS_SHORT, plural } from "@/lib/format";

interface Month {
  invoiced: number;
  paid: number;
  count: number;
}

/** Clean round steps for the value axis: 0 / 50 tis. / 100 tis. … */
function niceTicks(max: number): number[] {
  if (max <= 0) return [0];
  const rough = max / 3;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10]
    .map((factor) => factor * magnitude)
    .find((value) => value >= rough)!;
  const ticks: number[] = [];
  for (let value = 0; value <= max + step * 0.001; value += step) ticks.push(value);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

/**
 * Invoiced per month, one series in ink. Hover (or tap) a month for the
 * detail; "Tabulka" shows the same numbers as a table.
 */
export function MonthlyChart({
  months,
  currentMonth,
  basisLabel,
}: {
  months: Month[];
  /** Index of the running month in the current year (later months are future). */
  currentMonth: number | null;
  basisLabel: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [view, setView] = useState<"chart" | "table">("chart");
  const max = Math.max(0, ...months.map((month) => month.invoiced));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const best = max > 0 ? months.findIndex((month) => month.invoiced === max) : -1;

  return (
    <section className="flex flex-col gap-5 rounded-xl bg-surface p-5 shadow-sm sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-callout font-semibold">Po měsících</h2>
          <p className="text-caption text-text-secondary">{basisLabel}</p>
        </div>
        <div
          className="flex rounded-full bg-surface-muted p-0.5 text-caption font-medium"
          role="group"
          aria-label="Zobrazení"
        >
          {(["chart", "table"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              onClick={() => setView(option)}
              className="rounded-full px-3 py-1 text-text-secondary aria-pressed:bg-surface aria-pressed:text-text aria-pressed:shadow-sm"
            >
              {option === "chart" ? "Graf" : "Tabulka"}
            </button>
          ))}
        </div>
      </header>

      {view === "table" ? (
        <table className="w-full text-body">
          <thead>
            <tr className="text-left text-caption text-text-secondary">
              <th className="py-1.5 font-medium">Měsíc</th>
              <th className="py-1.5 text-right font-medium">Faktur</th>
              <th className="py-1.5 text-right font-medium">Částka</th>
              <th className="py-1.5 text-right font-medium">Z toho zaplaceno</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month, index) => (
              <tr key={index} className="border-t border-border">
                <td className="py-1.5 capitalize">{MONTHS[index]}</td>
                <td className="py-1.5 text-right tabular">{month.count}</td>
                <td className="py-1.5 text-right tabular">{formatMoney(month.invoiced)}</td>
                <td className="py-1.5 text-right tabular text-text-secondary">
                  {formatMoney(month.paid)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative flex gap-2 sm:gap-3">
          {/* Value axis */}
          <div
            className="relative h-56 w-12 shrink-0 text-right text-[11px] text-text-tertiary tabular"
            aria-hidden="true"
          >
            {ticks.map((tick) => (
              <span
                key={tick}
                className="absolute right-0 translate-y-1/2"
                style={{ bottom: `${(tick / top) * 100}%` }}
              >
                {tick === 0 ? "0" : formatCompact(tick)}
              </span>
            ))}
          </div>
          <div className="relative flex-1">
            {/* Gridlines */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-56" aria-hidden="true">
              {ticks.map((tick) => (
                <div
                  key={tick}
                  className="absolute inset-x-0 h-px bg-border"
                  style={{ bottom: `${(tick / top) * 100}%` }}
                />
              ))}
            </div>
            <ol className="relative grid h-56 grid-cols-12" onMouseLeave={() => setActive(null)}>
              {months.map((month, index) => {
                const height = (month.invoiced / top) * 100;
                const future = currentMonth !== null && index > currentMonth;
                return (
                  <li key={index} className="relative flex h-full items-end justify-center">
                    <button
                      type="button"
                      className="absolute inset-0 z-10 cursor-default"
                      onMouseEnter={() => setActive(index)}
                      onFocus={() => setActive(index)}
                      onBlur={() => setActive(null)}
                      onClick={() => setActive(active === index ? null : index)}
                      aria-label={`${MONTHS[index]}: ${formatMoney(month.invoiced)}, ${month.count} ${plural(month.count, "faktura", "faktury", "faktur")}`}
                    />
                    <div
                      className={cn(
                        "w-[min(60%,24px)] rounded-t-[4px] transition-[height,opacity] duration-300 ease-out",
                        future ? "bg-transparent" : "bg-ink",
                        active !== null && active !== index && "opacity-35",
                      )}
                      style={{ height: `${Math.max(height, month.invoiced > 0 ? 1.5 : 0)}%` }}
                    />
                    {index === best && active === null ? (
                      <span
                        className="pointer-events-none absolute -translate-y-1.5 text-[11px] font-medium whitespace-nowrap text-text-secondary tabular"
                        style={{ bottom: `${height}%` }}
                      >
                        {formatCompact(month.invoiced)}
                      </span>
                    ) : null}
                    {active === index ? (
                      <div
                        role="status"
                        className={cn(
                          "pointer-events-none absolute z-20 mb-2 flex min-w-36 flex-col gap-0.5 rounded-lg bg-surface px-3 py-2 text-caption shadow-lg",
                          index < 2
                            ? "left-0"
                            : index > 9
                              ? "right-0"
                              : "left-1/2 -translate-x-1/2",
                        )}
                        style={{ bottom: `${Math.min(height, 70)}%` }}
                      >
                        <span className="font-semibold capitalize">{MONTHS[index]}</span>
                        <span className="text-body font-semibold tabular">
                          {formatMoney(month.invoiced)}
                        </span>
                        <span className="text-text-secondary">
                          {month.count} {plural(month.count, "faktura", "faktury", "faktur")} ·
                          zaplaceno {formatMoney(month.paid)}
                        </span>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
            <ol
              className="mt-2 grid grid-cols-12 text-center text-[11px] text-text-tertiary"
              aria-hidden="true"
            >
              {MONTHS_SHORT.map((label, index) => (
                <li key={label} className={cn(index === currentMonth && "font-semibold text-text")}>
                  {label}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </section>
  );
}
