/** Logs full technical detail for developers while the UI shows friendly copy. */
export function logError(context: string, error: unknown, extra?: Record<string, unknown>) {
  console.error(`[${context}]`, error, extra ?? "");
}

export type ActionResult<T = null> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };
