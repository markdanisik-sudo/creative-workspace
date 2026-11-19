"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import type { EventKind, ProjectEvent } from "./types";

export const KIND_DOT: Record<EventKind, string> = {
  shoot: "bg-[#e5484d]",
  deadline: "bg-text",
  meeting: "bg-[#0a84ff]",
  delivery: "bg-[#30a46c]",
  other: "bg-text-tertiary",
};

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-11-19" in the viewer's time zone. */
export function dayKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Every local day an event touches, so a three-day shoot fills three cells. */
function eventDays(event: ProjectEvent) {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : start;
  const days: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  for (let i = 0; cursor <= end && i < 62; i += 1) {
    days.push(dayKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days.length ? days : [dayKey(start)];
}

export function eventsByDay(events: ProjectEvent[]) {
  const map = new Map<string, ProjectEvent[]>();
  for (const event of events) {
    for (const key of eventDays(event)) map.set(key, [...(map.get(key) ?? []), event]);
  }
  return map;
}

/** Month grid, weeks start on Monday. Picking a day hands it back; the list below shows it. */
export function ScheduleCalendar({
  byDay,
  selected,
  onSelect,
}: {
  byDay: Map<string, ProjectEvent[]>;
  selected: string;
  onSelect: (key: string) => void;
}) {
  const { t, locale } = useI18n();
  const [month, setMonth] = useState(() => {
    const [year, monthIndex] = selected.split("-").map(Number);
    return new Date(year, monthIndex - 1, 1);
  });
  const today = dayKey(new Date());

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const weeks = Math.ceil((offset + daysInMonth) / 7);
    return Array.from({ length: weeks * 7 }, (_, i) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      return { date, key: dayKey(date), inMonth: date.getMonth() === month.getMonth() };
    });
  }, [month]);

  const weekdays = useMemo(() => {
    const monday = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, i) =>
      new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
        new Date(monday.getFullYear(), 0, 1 + i),
      ),
    );
  }, [locale]);

  const shift = (by: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + by, 1);
    setMonth(next);
    const now = new Date();
    onSelect(
      next.getFullYear() === now.getFullYear() && next.getMonth() === now.getMonth()
        ? today
        : dayKey(next),
    );
  };

  const goToday = () => {
    const now = new Date();
    setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    onSelect(today);
  };

  const monthName = new Intl.DateTimeFormat(locale, { month: "long" }).format(month);

  return (
    <div className="rounded-[24px] bg-surface p-3 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3 px-1 pb-4 sm:pb-6">
        <h2 className="text-[26px] leading-none font-semibold tracking-[-0.04em] first-letter:uppercase sm:text-[34px]">
          {monthName} <span className="text-text-tertiary">{month.getFullYear()}</span>
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="sm" onClick={goToday}>
            {t("schedule.today")}
          </Button>
          <IconButton label={t("schedule.prevMonth")} onClick={() => shift(-1)}>
            <ChevronLeft size={18} aria-hidden="true" />
          </IconButton>
          <IconButton label={t("schedule.nextMonth")} onClick={() => shift(1)}>
            <ChevronRight size={18} aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 pb-1.5" aria-hidden="true">
        {weekdays.map((day) => (
          <span
            key={day}
            className="px-1 text-center text-caption text-text-secondary first-letter:uppercase sm:px-2 sm:text-left"
          >
            {day.replace(".", "")}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map(({ date, key, inMonth }) => {
          const dayEvents = byDay.get(key) ?? [];
          const isToday = key === today;
          const isSelected = key === selected;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-pressed={isSelected}
              aria-label={`${new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(date)}${dayEvents.length ? ` · ${dayEvents.map((event) => event.title).join(", ")}` : ""}`}
              className={cn(
                "flex min-h-[52px] flex-col items-center gap-1 rounded-[12px] p-1 text-left transition-[background-color,box-shadow] duration-200 sm:min-h-[108px] sm:items-stretch sm:p-2",
                inMonth ? "bg-surface-muted/60 hover:bg-surface-muted" : "text-text-tertiary",
                isSelected && "shadow-[inset_0_0_0_1.5px_var(--text)]",
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full text-body font-semibold tabular-nums",
                  isToday && "bg-ink text-text-inverse",
                )}
              >
                {date.getDate()}
              </span>
              {dayEvents.length ? (
                <>
                  <span className="flex flex-wrap justify-center gap-1 sm:hidden">
                    {dayEvents.slice(0, 3).map((event) => (
                      <span
                        key={event.id}
                        className={cn("size-1.5 rounded-full", KIND_DOT[event.kind])}
                      />
                    ))}
                  </span>
                  <span className="hidden flex-col gap-1 sm:flex">
                    {dayEvents.slice(0, 3).map((event) => (
                      <span
                        key={event.id}
                        className={cn(
                          "flex items-center gap-1.5 rounded-[6px] bg-surface px-1.5 py-1 text-[11px] leading-none font-medium shadow-xs",
                          !inMonth && "opacity-60",
                        )}
                      >
                        <span
                          className={cn("size-1.5 shrink-0 rounded-full", KIND_DOT[event.kind])}
                        />
                        <span className="truncate">{event.title}</span>
                      </span>
                    ))}
                    {dayEvents.length > 3 ? (
                      <span className="px-1.5 text-[11px] text-text-secondary">
                        {t("schedule.more", { count: dayEvents.length - 3 })}
                      </span>
                    ) : null}
                  </span>
                </>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
