"use client";

import { Check } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import type { PlanModuleId } from "./plan";

/** Tick the boxes a Plan should have. */
export function ModulePicker({
  choices,
  value,
  onChange,
  name,
}: {
  choices: PlanModuleId[];
  value: PlanModuleId[];
  onChange: (next: PlanModuleId[]) => void;
  /** Also submit the choice with a form under this field name. */
  name?: string;
}) {
  const { t } = useI18n();
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {choices.map((id) => {
        const checked = value.includes(id);
        return (
          <li key={id}>
            <button
              type="button"
              role="checkbox"
              aria-checked={checked}
              onClick={() =>
                onChange(checked ? value.filter((item) => item !== id) : [...value, id])
              }
              className={cn(
                "flex w-full items-start gap-3 rounded-[16px] p-3 text-left transition-colors",
                checked ? "bg-surface-pressed" : "bg-surface-muted hover:bg-surface-hover",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2",
                  checked ? "border-text bg-text text-text-inverse" : "border-border-strong",
                )}
              >
                {checked ? <Check size={12} strokeWidth={3} aria-hidden="true" /> : null}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-body font-semibold">{t(`workspace.modules.${id}`)}</span>
                <span className="text-caption text-text-secondary">
                  {t(`workspace.blurbs.${id}`)}
                </span>
              </span>
            </button>
            {name && checked ? <input type="hidden" name={name} value={id} /> : null}
          </li>
        );
      })}
    </ul>
  );
}
