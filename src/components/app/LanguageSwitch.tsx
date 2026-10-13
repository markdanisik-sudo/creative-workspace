"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_NAMES, LOCALES } from "@/lib/i18n/config";
import { setLocalePreference } from "@/lib/preferences/client";
import { cn } from "@/lib/cn";

/** EN | CS segmented switch. */
export function LanguageSwitch({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="radiogroup"
      aria-label={t("nav.language")}
      className={cn("inline-flex rounded-full bg-surface-muted p-0.5", pending && "opacity-60", className)}
    >
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={locale === option}
          aria-label={LOCALE_NAMES[option]}
          onClick={() => {
            if (option === locale) return;
            setLocalePreference(option);
            startTransition(() => router.refresh());
          }}
          className={cn(
            "h-7 rounded-full px-3 text-caption font-semibold uppercase transition-colors",
            locale === option ? "bg-surface text-text shadow-sm" : "text-text-secondary hover:text-text",
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
