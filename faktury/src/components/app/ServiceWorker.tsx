"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js (offline screen only). Skipped in development, where
 * it would get in the way of hot reload.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not essential; the app works without it.
    });
  }, []);
  return null;
}
