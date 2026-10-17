import type { MessageKey, Translator } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import { LIST_MODULES, type FieldDef, type ListModuleId, type PlanItem } from "./plan";

type T = Translator["t"];

export function fieldLabel(t: T, module: ListModuleId, key: string): string {
  return t(`boxes.fields.${module}.${key}` as MessageKey);
}

export function optionLabel(t: T, field: FieldDef, value: string): string {
  if (field.kind === "select") return t(`boxes.options.${field.options}.${value}` as MessageKey);
  return value;
}

/** A stored value as people read it ("Instagram", "9:16", "3×", "12 Oct"). */
export function displayValue(
  t: T,
  locale: Locale,
  module: ListModuleId,
  key: string,
  value: string | number | undefined,
): string | null {
  if (value === undefined || value === "") return null;
  const field = LIST_MODULES[module].fields.find((item) => item.key === key);
  if (!field) return null;
  switch (field.kind) {
    case "select":
    case "raw":
      return optionLabel(t, field, String(value));
    case "number":
      return `${value}×`;
    case "date":
      return formatDate(String(value), locale);
    default:
      return String(value);
  }
}

export function itemTitle(item: PlanItem): string {
  return String(item.data[LIST_MODULES[item.module].title] ?? "");
}

/** Rows grouped by the box's group field (in first-seen order); one group otherwise. */
export function groupItems(
  t: T,
  locale: Locale,
  module: ListModuleId,
  items: PlanItem[],
): { label: string | null; items: PlanItem[] }[] {
  const groupBy = LIST_MODULES[module].groupBy;
  if (!groupBy) return [{ label: null, items }];
  const groups = new Map<string, PlanItem[]>();
  for (const item of items) {
    const label =
      displayValue(t, locale, module, groupBy, item.data[groupBy]) ?? t("boxes.noGroup");
    groups.set(label, [...(groups.get(label) ?? []), item]);
  }
  const other = t("boxes.noGroup");
  return [...groups.entries()]
    .sort((a, b) => Number(a[0] === other) - Number(b[0] === other))
    .map(([label, list]) => ({ label, items: list }));
}
