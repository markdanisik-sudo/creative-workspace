import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/cn";

/** Calendar-tile style date: small month over a large day number. */
export function EventDate({
  iso,
  locale,
  className,
}: {
  iso: string;
  locale: Locale;
  className?: string;
}) {
  const date = new Date(iso);
  const month = new Intl.DateTimeFormat(locale, { month: "short" }).format(date).replace(".", "");
  const day = new Intl.DateTimeFormat(locale, { day: "numeric" }).format(date).replace(".", "");
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 flex-col items-center justify-center rounded-[10px] bg-surface-muted leading-none",
        className,
      )}
      aria-hidden="true"
    >
      <span className="text-[10px] font-semibold tracking-wide text-text-secondary uppercase">
        {month}
      </span>
      <span className="pt-0.5 text-[17px] font-semibold tabular-nums">{day}</span>
    </span>
  );
}
