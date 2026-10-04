"use client";

import { useSyncExternalStore } from "react";

const subscribeNever = () => () => {};
const format = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" });

/** Today's date in the viewer's own time zone; empty during server rendering. */
export function TodayLabel({ className }: { className?: string }) {
  const today = useSyncExternalStore(
    subscribeNever,
    () => format.format(new Date()),
    () => "",
  );
  return <span className={className}>{today || " "}</span>;
}
