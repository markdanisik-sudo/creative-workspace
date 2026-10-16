export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const fail = (error: string): Result<never> => ({ ok: false, error });

/** Postgres/RLS errors as a sentence for the user. */
export function describeError(value: unknown): string {
  const error = value as { code?: string; message?: string } | null;
  if (!error || typeof error !== "object") return "Něco se nepovedlo. Zkus to znovu.";
  if (error.code === "23505") return "Faktura s tímto číslem už existuje.";
  if (error.code === "42501") {
    return "Nemáš oprávnění — přihlas se znovu (s kódem dvoufázového ověření).";
  }
  return "Něco se nepovedlo. Zkus to znovu.";
}
