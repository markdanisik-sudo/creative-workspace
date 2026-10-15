"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import type { SpecGroup } from "./shot-options";
import type { ShotSpecs } from "./types";

/**
 * Rows like a product configurator: each shows its current choice; tapping a
 * row opens its options as chips, and choosing one moves on to the next row.
 */
export function Configurator({
  groups,
  values,
  defaults,
  onChange,
}: {
  groups: SpecGroup[];
  values: ShotSpecs;
  /** Project defaults a shot inherits; omit when editing the defaults themselves. */
  defaults?: ShotSpecs;
  onChange: (key: string, value: string | undefined) => void;
}) {
  const { t } = useI18n();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [customFor, setCustomFor] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");

  const labelOf = (group: SpecGroup, value: string) => {
    const option = group.options.find((item) => item.value === value);
    return option?.labelKey ? t(option.labelKey) : value;
  };

  const choose = (group: SpecGroup, value: string | undefined) => {
    onChange(group.key, value);
    setCustomFor(null);
    // Move on to the next row that still needs a choice.
    const next = groups
      .slice(groups.indexOf(group) + 1)
      .find((item) => !values[item.key] && !defaults?.[item.key]);
    setOpenKey(next ? next.key : null);
  };

  const submitCustom = (event: FormEvent, group: SpecGroup) => {
    event.preventDefault();
    const text = customText.trim();
    if (text) choose(group, text);
  };

  return (
    <ul className="flex flex-col overflow-hidden rounded-[18px] bg-surface-muted">
      {groups.map((group) => {
        const own = values[group.key];
        const inherited = !own && defaults ? defaults[group.key] : undefined;
        const isOpen = openKey === group.key;
        const isCustom = own !== undefined && !group.options.some((option) => option.value === own);
        return (
          <li key={group.key} className="border-b border-border last:border-b-0">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenKey(isOpen ? null : group.key)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
            >
              <span className="text-body text-text-secondary">{t(group.labelKey)}</span>
              <span className="flex min-w-0 items-center gap-2">
                {own ? (
                  <span className="truncate text-body font-semibold">{labelOf(group, own)}</span>
                ) : inherited ? (
                  <span className="truncate text-body text-text-secondary">
                    {labelOf(group, inherited)}
                    <span className="ml-1.5 rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-text-tertiary uppercase">
                      {t("shots.fromDefault")}
                    </span>
                  </span>
                ) : (
                  <span className="text-body text-text-tertiary">{t("shots.notSet")}</span>
                )}
                <ChevronDown
                  size={15}
                  aria-hidden="true"
                  className={cn(
                    "shrink-0 text-text-tertiary transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                />
              </span>
            </button>
            {isOpen ? (
              <div className="flex animate-fade-in flex-col gap-3 px-4 pb-4">
                <div className="flex flex-wrap gap-1.5">
                  {group.options.map((option) => {
                    const selected = own === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => choose(group, selected ? undefined : option.value)}
                        className={cn(
                          "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-body font-medium transition-colors",
                          selected
                            ? "bg-ink text-text-inverse"
                            : "bg-surface text-text shadow-sm hover:bg-surface-pressed",
                        )}
                      >
                        {selected ? <Check size={13} aria-hidden="true" /> : null}
                        {option.labelKey ? t(option.labelKey) : option.value}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setCustomFor(group.key);
                      setCustomText(isCustom ? (own ?? "") : "");
                    }}
                    className={cn(
                      "inline-flex h-9 items-center rounded-full px-3.5 text-body font-medium",
                      isCustom ? "bg-ink text-text-inverse" : "text-text-secondary hover:text-text",
                    )}
                  >
                    {isCustom ? own : t("shots.custom")}
                  </button>
                </div>
                {customFor === group.key ? (
                  <form onSubmit={(event) => submitCustom(event, group)} className="flex gap-2">
                    <input
                      autoFocus
                      value={customText}
                      onChange={(event) => setCustomText(event.target.value)}
                      placeholder={t("shots.customPlaceholder")}
                      maxLength={120}
                      className="h-10 min-w-0 flex-1 rounded-full bg-surface px-4 text-body outline-none focus-visible:shadow-[0_0_0_2px_var(--text)]"
                    />
                    <button
                      type="submit"
                      className="h-10 rounded-full bg-ink px-4 text-body font-semibold text-text-inverse"
                    >
                      {t("shots.apply")}
                    </button>
                  </form>
                ) : null}
                {own && defaults?.[group.key] ? (
                  <button
                    type="button"
                    onClick={() => choose(group, undefined)}
                    className="self-start text-caption text-text-secondary underline-offset-2 hover:text-text hover:underline"
                  >
                    {t("shots.useDefault")} ({labelOf(group, defaults[group.key]!)})
                  </button>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
