import type { Locale } from "./i18n/config";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

function capitalize(text: string) {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

/** "Now", "5 minutes ago", "Yesterday", or a date for older times. */
export function formatEdited(iso: string, locale: Locale, now: Date = new Date()): string {
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const seconds = Math.round((now.getTime() - new Date(iso).getTime()) / 1000);
  if (seconds < MINUTE) return capitalize(relative.format(0, "second"));
  if (seconds < HOUR) return capitalize(relative.format(-Math.floor(seconds / MINUTE), "minute"));
  if (seconds < DAY) return capitalize(relative.format(-Math.floor(seconds / HOUR), "hour"));
  if (seconds < WEEK) return capitalize(relative.format(-Math.floor(seconds / DAY), "day"));
  return formatDate(iso, locale, { withYear: true });
}

/** "12 Oct" / "12. 10." style day, with the year when asked. */
export function formatDate(
  iso: string,
  locale: Locale,
  { withYear = false, withWeekday = false } = {},
): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: withYear ? "numeric" : undefined,
    weekday: withWeekday ? "short" : undefined,
  }).format(new Date(iso));
}

export function formatTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(
    new Date(iso),
  );
}

export function formatMoney(amount: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
