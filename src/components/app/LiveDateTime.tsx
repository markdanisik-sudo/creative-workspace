"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";

const TICK_MS = 15_000;

/** "13 Oct, 8:47 pm" in the viewer's time zone and language, kept current. */
export function LiveDateTime({ className }: { className?: string }) {
  const { locale } = useI18n();
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const date = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
      day: "numeric",
      month: "short",
    });
    const time = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: locale === "en",
    });
    const update = () => {
      const current = new Date();
      setNow(`${date.format(current)}, ${time.format(current).replace(" ", " ")}`);
    };
    update();
    const timer = window.setInterval(update, TICK_MS);
    return () => window.clearInterval(timer);
  }, [locale]);

  return (
    <time className={className} suppressHydrationWarning>
      {now ?? ""}
    </time>
  );
}
