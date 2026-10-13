import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { translator } from ".";
import { isLocale, LOCALE_COOKIE, localeFromAcceptLanguage, type Locale } from "./config";

/** The visitor's language: their saved choice, else their browser's preference. */
export const getLocale = cache(async (): Promise<Locale> => {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  return localeFromAcceptLanguage((await headers()).get("accept-language"));
});

/** Translation helpers for Server Components and Server Actions. */
export async function getI18n() {
  return translator(await getLocale());
}
