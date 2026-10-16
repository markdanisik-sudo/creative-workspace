const LOCALE = "cs-CZ";

export function formatMoney(amount: number, currency = "CZK", { exact = false } = {}): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: exact || amount % 1 !== 0 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** "1,2 mil." / "450 tis." for chart labels. */
export function formatCompact(amount: number): string {
  return new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 }).format(
    amount,
  );
}

export function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  return `${day}. ${month}. ${year}`;
}

export const MONTHS = [
  "leden",
  "únor",
  "březen",
  "duben",
  "květen",
  "červen",
  "červenec",
  "srpen",
  "září",
  "říjen",
  "listopad",
  "prosinec",
] as const;

export const MONTHS_SHORT = [
  "led",
  "úno",
  "bře",
  "dub",
  "kvě",
  "čvn",
  "čvc",
  "srp",
  "zář",
  "říj",
  "lis",
  "pro",
] as const;

export function plural(count: number, one: string, few: string, many: string): string {
  if (count === 1) return one;
  if (count >= 2 && count <= 4) return few;
  return many;
}
