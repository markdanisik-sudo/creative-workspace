"use client";

import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { THEME_COOKIE, type ThemePreference } from "./theme";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}

/** Applies immediately (no reload) and remembers the choice. */
export function setThemePreference(theme: ThemePreference) {
  writeCookie(THEME_COOKIE, theme);
  document.documentElement.dataset.themePreference = theme;
  (window as unknown as { __applyTheme?: () => void }).__applyTheme?.();
}

export function resolvedTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** Remembers the language; callers refresh the router to re-render. */
export function setLocalePreference(locale: Locale) {
  writeCookie(LOCALE_COOKIE, locale);
}
