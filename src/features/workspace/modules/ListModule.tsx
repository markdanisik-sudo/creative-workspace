"use client";

import { Check, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import {
  LIST_MODULES,
  OPTION_SETS,
  RAW_OPTIONS,
  type FieldDef,
  type ListModuleId,
  type PlanItem,
} from "../plan";
import { deletePlanItem, savePlanItem, setPlanItemDone } from "../plan-actions";
import { displayValue, fieldLabel, groupItems, itemTitle, optionLabel } from "../plan-format";

const selectClass =
  "h-11 w-full rounded-lg bg-surface-muted px-3 text-callout text-text outline-none focus-visible:shadow-[0_0_0_2px_var(--text)]";

function FieldInput({
  module,
  field,
  value,
  autoFocus,
}: {
  module: ListModuleId;
  field: FieldDef;
  value: string | number | undefined;
  autoFocus?: boolean;
}) {
  const { t } = useI18n();
  const label = fieldLabel(t, module, field.key);
  const current = value === undefined ? "" : String(value);
  switch (field.kind) {
    case "longtext":
      return (
        <TextArea
          label={label}
          name={field.key}
          defaultValue={current}
          rows={3}
          maxLength={2000}
          autoFocus={autoFocus}
        />
      );
    case "number":
      return (
        <TextField
          label={label}
          name={field.key}
          defaultValue={current}
          inputMode="numeric"
          autoFocus={autoFocus}
        />
      );
    case "date":
      return <TextField label={label} name={field.key} type="date" defaultValue={current} />;
    case "select":
    case "raw": {
      const options: readonly string[] =
        field.kind === "select" ? OPTION_SETS[field.options] : RAW_OPTIONS[field.options];
      return (
        <label className="flex flex-col gap-1.5">
          <span className="text-caption font-medium text-text-secondary">{label}</span>
          <select name={field.key} defaultValue={current} className={selectClass}>
            <option value="">—</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {optionLabel(t, field, option)}
              </option>
            ))}
          </select>
        </label>
      );
    }
    default:
      return (
        <TextField
          label={label}
          name={field.key}
          defaultValue={current}
          maxLength={2000}
          autoFocus={autoFocus}
        />
      );
  }
}

function ItemDialog({
  projectId,
  module,
  item,
  canDelete,
  onClose,
}: {
  projectId: string;
  module: ListModuleId;
  item: PlanItem | null;
  canDelete: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const definition = LIST_MODULES[module];
  // Short fields side by side, long ones full width.
  const short = definition.fields.filter(
    (field) => field.kind !== "longtext" && field.key !== definition.title,
  );
  const long = definition.fields.filter(
    (field) => field.kind === "longtext" && field.key !== definition.title,
  );
  const titleField = definition.fields.find((field) => field.key === definition.title)!;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const data = Object.fromEntries(
      definition.fields.map((field) => [field.key, String(form.get(field.key) ?? "")]),
    );
    startTransition(async () => {
      const result = await savePlanItem(projectId, module, item?.id ?? null, data);
      if (!result.ok) return toast.show({ title: result.error, tone: "error" });
      router.refresh();
      onClose();
    });
  };

  const remove = () =>
    startTransition(async () => {
      if (!item) return;
      const result = await deletePlanItem(projectId, item.id);
      if (!result.ok) return toast.show({ title: result.error, tone: "error" });
      router.refresh();
      onClose();
    });

  return (
    <Dialog
      open
      onClose={onClose}
      title={`${item ? t("boxes.edit") : t("boxes.add")} · ${t(`workspace.modules.${module}`)}`}
      className="max-w-[560px]"
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <FieldInput
          module={module}
          field={titleField}
          value={item?.data[titleField.key]}
          autoFocus
        />
        {short.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {short.map((field) => (
              <FieldInput
                key={field.key}
                module={module}
                field={field}
                value={item?.data[field.key]}
              />
            ))}
          </div>
        ) : null}
        {long.map((field) => (
          <FieldInput key={field.key} module={module} field={field} value={item?.data[field.key]} />
        ))}
        <div className="flex items-center justify-between gap-2 pt-1">
          {item && canDelete ? (
            <Button variant="danger" size="sm" onClick={remove} disabled={pending}>
              {t("boxes.delete")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={pending}>
              {t("boxes.save")}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

/**
 * A box made of rows — interview questions, people, deliverables, content
 * plan, script, gear or the photo list. Tick rows off; click one to edit.
 */
export function ListModule({
  projectId,
  module,
  items,
  viewerId,
  isStudio,
  flagged = [],
}: {
  projectId: string;
  module: ListModuleId;
  items: PlanItem[];
  viewerId: string;
  isStudio: boolean;
  /** Rows with open discussion notes: "item:<id>". */
  flagged?: string[];
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState<PlanItem | "new" | null>(null);
  const [, startTransition] = useTransition();
  const [shown, setDone] = useOptimistic(items, (current, change: { id: string; done: boolean }) =>
    current.map((item) => (item.id === change.id ? { ...item, done: change.done } : item)),
  );
  const definition = LIST_MODULES[module];
  const done = shown.filter((item) => item.done).length;

  const toggle = (item: PlanItem) =>
    startTransition(async () => {
      setDone({ id: item.id, done: !item.done });
      const result = await setPlanItemDone(projectId, item.id, !item.done);
      if (!result.ok) toast.show({ title: result.error, tone: "error" });
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-body text-text-secondary">
          {shown.length > 0
            ? `${t(`boxes.doneLabel.${module}`)} ${t("boxes.doneCount", { done, total: shown.length })}`
            : t(`workspace.blurbs.${module}`)}
        </p>
        <Button variant="primary" onClick={() => setEditing("new")}>
          <Plus size={16} aria-hidden="true" />
          {t("boxes.add")}
        </Button>
      </div>

      {shown.length === 0 ? (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex flex-col items-center gap-3 rounded-[22px] border border-dashed border-border-strong py-20 text-text-tertiary hover:border-text-secondary hover:text-text-secondary"
        >
          <Plus size={28} strokeWidth={1.5} aria-hidden="true" />
          <span className="text-callout">{t(`workspace.empty.${module}`)}</span>
        </button>
      ) : (
        <div className="flex flex-col gap-6">
          {groupItems(t, locale, module, shown).map((group) => (
            <section key={group.label ?? "all"} className="flex flex-col gap-2">
              {group.label ? (
                <h3 className="text-caption font-semibold tracking-wide text-text-secondary uppercase">
                  {group.label}
                </h3>
              ) : null}
              <ul className="flex flex-col gap-1.5">
                {group.items.map((item) => {
                  const meta = definition.meta
                    .filter((key) => key !== definition.groupBy)
                    .map((key) => displayValue(t, locale, module, key, item.data[key]))
                    .filter(Boolean);
                  const secondary = definition.fields.find(
                    (field) => field.kind === "longtext" && field.key !== definition.title,
                  );
                  const detail = secondary ? item.data[secondary.key] : undefined;
                  return (
                    <li
                      key={item.id}
                      className={cn(
                        "flex items-start gap-3 rounded-[16px] bg-surface-muted p-3 sm:p-4",
                        flagged.includes(`item:${item.id}`) && "shadow-[0_0_0_2px_var(--danger)]",
                      )}
                    >
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={item.done}
                        aria-label={`${t(`boxes.doneLabel.${module}`)}: ${itemTitle(item)}`}
                        onClick={() => toggle(item)}
                        className={cn(
                          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          item.done
                            ? "border-text bg-text text-text-inverse"
                            : "border-border-strong hover:border-text-secondary",
                        )}
                      >
                        {item.done ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : null}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(item)}
                        className="flex min-w-0 flex-1 flex-col gap-1 text-left"
                      >
                        <span
                          className={cn(
                            "text-callout font-medium",
                            item.done && "text-text-tertiary line-through",
                          )}
                        >
                          {itemTitle(item)}
                        </span>
                        {detail ? (
                          <span className="line-clamp-2 text-body text-text-secondary">
                            {String(detail)}
                          </span>
                        ) : null}
                        {meta.length > 0 ? (
                          <span className="flex flex-wrap gap-1.5 pt-0.5">
                            {meta.map((value) => (
                              <span
                                key={value}
                                className="rounded-full bg-surface px-2 py-0.5 text-caption font-medium text-text-secondary"
                              >
                                {value}
                              </span>
                            ))}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {editing ? (
        <ItemDialog
          key={editing === "new" ? "new" : editing.id}
          projectId={projectId}
          module={module}
          item={editing === "new" ? null : editing}
          canDelete={editing !== "new" && (isStudio || editing.createdBy === viewerId)}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}
