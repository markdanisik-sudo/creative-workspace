/** IBAN helpers and the Czech "QR Platba" (SPAYD) payment string. */

function mod97(digits: string): number {
  let remainder = 0;
  for (const char of digits) remainder = (remainder * 10 + Number(char)) % 97;
  return remainder;
}

/** Letters to numbers as the IBAN checksum wants them (A=10 … Z=35). */
function numeric(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => String(letter.charCodeAt(0) - 55));
}

export function normalizeIban(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function isValidIban(value: string): boolean {
  const iban = normalizeIban(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  return mod97(numeric(iban.slice(4) + iban.slice(0, 4))) === 1;
}

/** "19-2000145399/0800" → "CZ6508000000192000145399"; null if it isn't a Czech account. */
export function czechAccountToIban(account: string): string | null {
  const match = account.replace(/\s+/g, "").match(/^(?:(\d{1,6})-)?(\d{2,10})\/(\d{4})$/);
  if (!match) return null;
  const [, prefix = "", number, bank] = match;
  const bban = bank + prefix.padStart(6, "0") + number.padStart(10, "0");
  const check = 98 - mod97(numeric(bban + "CZ00"));
  return `CZ${String(check).padStart(2, "0")}${bban}`;
}

/** The IBAN to pay to: an IBAN as given, or one derived from a Czech account number. */
export function payableIban(iban: string | null, bankAccount: string | null): string | null {
  if (iban && isValidIban(iban)) return normalizeIban(iban);
  if (bankAccount) return czechAccountToIban(bankAccount);
  return null;
}

export function formatIban(iban: string): string {
  return normalizeIban(iban)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

/** SPAYD values may not contain "*"; keep them short and plain. */
function clean(value: string, max: number): string {
  return value.replace(/\*/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * The payload of a Czech QR payment ("QR Platba"), readable by Czech and
 * Slovak banking apps: SPD*1.0*ACC:…*AM:…*CC:…*X-VS:…*MSG:…
 */
export function spaydString({
  iban,
  amount,
  currency,
  variableSymbol,
  message,
  recipient,
}: {
  iban: string;
  amount: number;
  currency: string;
  variableSymbol?: string | null;
  message?: string | null;
  recipient?: string | null;
}): string {
  const parts = [
    "SPD",
    "1.0",
    `ACC:${normalizeIban(iban)}`,
    `AM:${amount.toFixed(2)}`,
    `CC:${currency.toUpperCase()}`,
  ];
  const vs = variableSymbol?.replace(/\D/g, "").slice(0, 10);
  if (vs) parts.push(`X-VS:${vs}`);
  if (recipient) parts.push(`RN:${clean(recipient, 35)}`);
  if (message) parts.push(`MSG:${clean(message, 60)}`);
  return parts.join("*");
}
