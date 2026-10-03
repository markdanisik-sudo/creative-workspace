/** User-facing copy. Raw technical errors are never shown to people. */
export const friendlyErrors = {
  generic: "Something went wrong. Please try again.",
  network: "You appear to be offline. Changes will be saved when you reconnect.",
  upload: "Your file couldn't be uploaded. Please try again.",
  save: "Your latest changes couldn't be saved. Retrying…",
  notFound: "We couldn't find that.",
} as const;

/** Logs full technical detail for developers while the UI shows friendly copy. */
export function logError(context: string, error: unknown, extra?: Record<string, unknown>) {
  console.error(`[${context}]`, error, extra ?? "");
}

export type ActionResult<T = null> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };
