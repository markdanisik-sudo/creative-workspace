"use client";

import { useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n/client";
import { setThemePreference } from "@/lib/preferences/client";
import { THEMES, type ThemePreference } from "@/lib/preferences/theme";
import { cn } from "@/lib/cn";

const LABEL = { system: "settings.themeSystem", light: "settings.themeLight", dark: "settings.themeDark" } as const;

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme-preference"] });
  return () => observer.disconnect();
}

function currentPreference(): ThemePreference {
  const value = document.documentElement.dataset.themePreference;
  return (THEMES as readonly string[]).includes(value ?? "") ? (value as ThemePreference) : "system";
}

/** System / Light / Dark segmented control. */
export function AppearancePicker({ initial }: { initial: ThemePreference }) {
  const { t } = useI18n();
  const preference = useSyncExternalStore(subscribe, currentPreference, () => initial);

  return (
    <div role="radiogroup" aria-label={t("settings.appearance")} className="inline-flex rounded-full bg-surface-muted p-0.5">
      {THEMES.map((theme) => (
        <button
          key={theme}
          type="button"
          role="radio"
          aria-checked={preference === theme}
          onClick={() => setThemePreference(theme)}
          className={cn(
            "h-8 rounded-full px-4 text-caption font-semibold transition-colors",
            preference === theme ? "bg-surface text-text shadow-sm" : "text-text-secondary hover:text-text",
          )}
        >
          {t(LABEL[theme])}
        </button>
      ))}
    </div>
  );
}
