"use client";

import { useSyncExternalStore } from "react";
import { resolvedTheme } from "@/lib/preferences/client";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** The app's resolved light/dark theme, updated live when it changes. */
export function useAppTheme(): "light" | "dark" {
  return useSyncExternalStore(subscribe, resolvedTheme, () => "light" as const);
}
