"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { translator } from ".";
import type { Locale } from "./config";
import type { Translator } from "./translate";

const I18nContext = createContext<Translator | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => translator(locale), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Translation helpers for Client Components. */
export function useI18n(): Translator {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside <I18nProvider>");
  return context;
}
