"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useI18n } from "@/lib/i18n/client";
import { resolvedTheme, setThemePreference } from "@/lib/preferences/client";
import { cn } from "@/lib/cn";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** Round moon / sun button that flips between light and dark. */
export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useI18n();
  const theme = useSyncExternalStore(subscribe, resolvedTheme, () => "light" as const);
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setThemePreference(isDark ? "light" : "dark")}
      aria-label={isDark ? t("nav.switchToLight") : t("nav.switchToDark")}
      title={isDark ? t("nav.switchToLight") : t("nav.switchToDark")}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text",
        "transition-[background-color,transform] duration-150 hover:bg-surface-pressed active:scale-95",
        className,
      )}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
