"use client";

import { useEffect, useState } from "react";

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const TIME = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
const TICK_MS = 15_000;

function format(now: Date) {
  return `${DATE.format(now)}, ${TIME.format(now).replace(" ", " ")}`;
}

/** "4 Oct, 7:51 am" in the viewer's time zone, kept current. Empty until mounted. */
export function LiveDateTime({ className }: { className?: string }) {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setNow(format(new Date()));
    update();
    const timer = window.setInterval(update, TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <time className={className} suppressHydrationWarning>
      {now ?? ""}
    </time>
  );
}
