"use client";

import { Check, Minus, Plus, Search, Store, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useOptimistic, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Input";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import {
  addRentals,
  clearRentalSupplier,
  deleteProductionItem,
  deleteRentalOffer,
  importRentalCatalog,
  saveProductionItem,
  setProductionItemDone,
} from "./actions";
import { itemTotal, type ProductionItem, type ProductionKind, type RentalOffer } from "./types";

const CURRENCY = "CZK";

function ItemDialog({
  projectId,
  item,
  kind,
  onClose,
}: {
  projectId: string;
  item: ProductionItem | null;
  kind: ProductionKind;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const rental = kind === "rental";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (name: string) => String(form.get(name) ?? "");
    setPending(true);
    const result = await saveProductionItem(projectId, item?.id ?? null, {
      kind,
      name: get("name"),
      supplier: get("supplier"),
      quantity: get("quantity"),
      days: get("days"),
      unitPrice: get("unitPrice"),
    });
    setPending(false);
    if (!result.ok) return toast.show({ title: result.error, tone: "error" });
    router.refresh();
    onClose();
  };

  const remove = async () => {
    if (!item) return;
    setPending(true);
    const result = await deleteProductionItem(projectId, item.id);
    setPending(false);
    if (!result.ok) return toast.show({ title: result.error, tone: "error" });
    router.refresh();
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={
        item
          ? t("production.editItem")
          : rental
            ? t("production.addRental")
            : t("production.addCost")
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <TextField
          label={t("production.name")}
          name="name"
          defaultValue={item?.name}
          placeholder={rental ? t("production.rentalPlaceholder") : t("production.costPlaceholder")}
          required
          maxLength={200}
          autoFocus
        />
        {rental ? (
          <TextField
            label={t("production.supplier")}
            name="supplier"
            defaultValue={item?.supplier ?? "Biofilms"}
            maxLength={100}
          />
        ) : null}
        <div className={cn("grid gap-3", rental ? "grid-cols-3" : "grid-cols-2")}>
          <TextField
            label={t("production.quantity")}
            name="quantity"
            inputMode="decimal"
            defaultValue={item ? String(item.quantity) : "1"}
            required
          />
          {rental ? (
            <TextField
              label={t("production.days")}
              name="days"
              inputMode="decimal"
              defaultValue={item ? String(item.days) : "1"}
              required
            />
          ) : null}
          <TextField
            label={rental ? t("production.pricePerDay") : t("production.price")}
            name="unitPrice"
            inputMode="decimal"
            defaultValue={item ? String(item.unitPrice) : ""}
            required
          />
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          {item ? (
            <Button variant="danger" size="sm" onClick={remove} disabled={pending}>
              {t("production.delete")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={pending}>
              {t("common.save")}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

/** Paste a rental house's price list to add it to your catalog. */
function ImportForm({ onDone, suppliers }: { onDone: () => void; suppliers: string[] }) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [supplier, setSupplier] = useState("Biofilms");
  const [text, setText] = useState("");
  const [replace, setReplace] = useState(false);
  const [pending, startTransition] = useTransition();
  const known = suppliers.includes(supplier.trim());

  const submit = () =>
    startTransition(async () => {
      if (replace && known) {
        const cleared = await clearRentalSupplier(supplier.trim());
        if (!cleared.ok) return toast.show({ title: cleared.error, tone: "error" });
      }
      const result = await importRentalCatalog(supplier, text);
      if (!result.ok) return toast.show({ title: result.error, tone: "error" });
      toast.show({
        title: t("production.imported", { count: result.data.added }),
        description: result.data.skipped
          ? t("production.importSkipped", { count: result.data.skipped })
          : undefined,
      });
      setText("");
      router.refresh();
      onDone();
    });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-callout text-text-secondary">{t("production.importBody")}</p>
      <TextField
        label={t("production.supplier")}
        value={supplier}
        onChange={(event) => setSupplier(event.target.value)}
        maxLength={100}
      />
      <TextArea
        label={t("production.priceList")}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={t("production.priceListPlaceholder")}
        rows={8}
        className="font-mono text-caption"
      />
      {known ? (
        <label className="flex items-center gap-2 text-body text-text-secondary">
          <input
            type="checkbox"
            checked={replace}
            onChange={(event) => setReplace(event.target.checked)}
            className="size-4 accent-[var(--text)]"
          />
          {t("production.replaceSupplier", { supplier: supplier.trim() })}
        </label>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          {t("common.cancel")}
        </Button>
        <Button variant="primary" onClick={submit} loading={pending} disabled={!text.trim()}>
          <Upload size={16} aria-hidden="true" />
          {t("production.import")}
        </Button>
      </div>
    </div>
  );
}

/** Browse your rental price lists, pick gear and see what it comes to. */
function RentalPicker({
  projectId,
  catalog,
  onClose,
}: {
  projectId: string;
  catalog: RentalOffer[];
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const suppliers = useMemo(() => [...new Set(catalog.map((offer) => offer.supplier))], [catalog]);
  const [importing, setImporting] = useState(catalog.length === 0);
  const [supplier, setSupplier] = useState(suppliers[0] ?? "");
  const [query, setQuery] = useState("");
  const [days, setDays] = useState("1");
  const [picked, setPicked] = useState<Map<string, number>>(new Map());
  const [pending, startTransition] = useTransition();
  const money = (amount: number) => formatMoney(amount, CURRENCY, locale);

  const needle = query.trim().toLowerCase();
  const shown = catalog.filter((offer) =>
    needle
      ? `${offer.name} ${offer.category ?? ""}`.toLowerCase().includes(needle)
      : offer.supplier === supplier,
  );
  const groups = new Map<string, RentalOffer[]>();
  for (const offer of shown) {
    const key = needle ? offer.supplier : (offer.category ?? t("production.uncategorized"));
    groups.set(key, [...(groups.get(key) ?? []), offer]);
  }

  const dayCount = Math.max(Number(days.replace(",", ".")) || 1, 0.5);
  const perDay = catalog.reduce(
    (sum, offer) => sum + (picked.get(offer.id) ?? 0) * offer.pricePerDay,
    0,
  );
  const count = [...picked.values()].reduce((sum, value) => sum + value, 0);

  const step = (id: string, delta: number) =>
    setPicked((current) => {
      const next = new Map(current);
      const value = Math.max(0, (next.get(id) ?? 0) + delta);
      if (value === 0) next.delete(id);
      else next.set(id, value);
      return next;
    });

  const add = () =>
    startTransition(async () => {
      const result = await addRentals(
        projectId,
        [...picked.entries()].map(([offerId, quantity]) => ({ offerId, quantity })),
        dayCount,
      );
      if (!result.ok) return toast.show({ title: result.error, tone: "error" });
      toast.show({ title: t("production.added", { count: result.data.added }) });
      router.refresh();
      onClose();
    });

  const removeOffer = (id: string) =>
    startTransition(async () => {
      const result = await deleteRentalOffer(id);
      if (!result.ok) return toast.show({ title: result.error, tone: "error" });
      router.refresh();
    });

  return (
    <Dialog
      open
      onClose={onClose}
      title={importing ? t("production.importTitle") : t("production.pickerTitle")}
      className="max-w-[680px]"
    >
      {importing ? (
        <ImportForm
          suppliers={suppliers}
          onDone={() => (catalog.length === 0 ? onClose() : setImporting(false))}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-tertiary"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("production.search")}
                aria-label={t("production.search")}
                className="h-10 w-full rounded-full bg-surface-muted pr-4 pl-10 text-body outline-none focus-visible:shadow-[0_0_0_2px_var(--text)]"
              />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setImporting(true)}>
              <Upload size={14} aria-hidden="true" />
              {t("production.importShort")}
            </Button>
          </div>
          {!needle && suppliers.length > 1 ? (
            <div className="flex flex-wrap gap-1.5" role="tablist">
              {suppliers.map((name) => (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  aria-selected={name === supplier}
                  onClick={() => setSupplier(name)}
                  className={cn(
                    "h-8 rounded-full px-3.5 text-body font-semibold transition-colors",
                    name === supplier
                      ? "bg-ink text-text-inverse"
                      : "bg-surface-muted text-text-secondary hover:text-text",
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex max-h-[46vh] flex-col gap-4 overflow-y-auto pr-1">
            {shown.length === 0 ? (
              <p className="py-8 text-center text-body text-text-secondary">
                {t("production.nothingFound")}
              </p>
            ) : (
              [...groups.entries()].map(([group, offers]) => (
                <section key={group} className="flex flex-col gap-1.5">
                  <h4 className="text-caption font-semibold tracking-wide text-text-secondary uppercase">
                    {group}
                  </h4>
                  <ul className="flex flex-col gap-1">
                    {offers.map((offer) => {
                      const quantity = picked.get(offer.id) ?? 0;
                      return (
                        <li
                          key={offer.id}
                          className={cn(
                            "group flex items-center gap-3 rounded-[12px] px-3 py-2 transition-colors",
                            quantity ? "bg-surface-pressed" : "bg-surface-muted",
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => step(offer.id, quantity ? -quantity : 1)}
                            className="flex min-w-0 flex-1 flex-col text-left"
                          >
                            <span className="truncate text-body font-medium">{offer.name}</span>
                            <span className="text-caption text-text-secondary tabular-nums">
                              {t("production.perDay", { price: money(offer.pricePerDay) })}
                            </span>
                          </button>
                          {quantity ? (
                            <span className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                aria-label={t("production.less")}
                                onClick={() => step(offer.id, -1)}
                                className="flex size-7 items-center justify-center rounded-full bg-surface"
                              >
                                <Minus size={14} aria-hidden="true" />
                              </button>
                              <span className="w-6 text-center text-body font-semibold tabular-nums">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                aria-label={t("production.more")}
                                onClick={() => step(offer.id, 1)}
                                className="flex size-7 items-center justify-center rounded-full bg-surface"
                              >
                                <Plus size={14} aria-hidden="true" />
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              aria-label={t("production.removeOffer")}
                              onClick={() => removeOffer(offer.id)}
                              className="shrink-0 rounded-full p-1.5 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
                            >
                              <Trash2 size={14} aria-hidden="true" />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            )}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border-strong pt-4">
            <div className="flex items-end gap-3">
              <div className="w-24">
                <TextField
                  label={t("production.days")}
                  value={days}
                  onChange={(event) => setDays(event.target.value)}
                  inputMode="decimal"
                />
              </div>
              <div className="flex flex-col pb-1">
                <span className="text-caption text-text-secondary">
                  {t("production.pickedCount", { count })}
                </span>
                <span className="text-callout font-semibold tabular-nums">
                  {money(Math.round(perDay * dayCount * 100) / 100)}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>
                {t("common.cancel")}
              </Button>
              <Button variant="primary" onClick={add} loading={pending} disabled={count === 0}>
                {t("production.addPicked")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={strong ? "text-callout font-semibold" : "text-body text-text-secondary"}>
        {label}
      </span>
      <span className={cn("tabular-nums", strong ? "text-headline font-semibold" : "text-body")}>
        {value}
      </span>
    </div>
  );
}

/**
 * A personal project's budget: everything the shoot needs (gear to rent and
 * other costs), what each comes to, and what's already sorted out.
 */
export function ProductionBudget({
  projectId,
  items,
  catalog,
  canPrice,
}: {
  projectId: string;
  items: ProductionItem[];
  catalog: RentalOffer[];
  /** The owner: has a rental catalog to pick from. */
  canPrice: boolean;
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState<{
    item: ProductionItem | null;
    kind: ProductionKind;
  } | null>(null);
  const [picking, setPicking] = useState(false);
  const [, startTransition] = useTransition();
  const [shown, toggleDone] = useOptimistic(items, (current, id: string) =>
    current.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
  );
  const money = (amount: number) => formatMoney(amount, CURRENCY, locale);

  const rentals = shown.filter((item) => item.kind === "rental");
  const costs = shown.filter((item) => item.kind === "cost");
  const sum = (list: ProductionItem[]) =>
    Math.round(list.reduce((total, item) => total + itemTotal(item), 0) * 100) / 100;
  const done = shown.filter((item) => item.done).length;

  const flip = (item: ProductionItem) =>
    startTransition(async () => {
      toggleDone(item.id);
      const result = await setProductionItemDone(projectId, item.id, !item.done);
      if (!result.ok) toast.show({ title: result.error, tone: "error" });
      router.refresh();
    });

  const list = (kind: ProductionKind, rows: ProductionItem[], index: number) => (
    <section className="flex flex-col gap-5">
      <SectionLabel
        label={kind === "rental" ? t("production.rentalsTitle") : t("production.costsTitle")}
        index={index}
      />
      {rows.length === 0 ? (
        <p className="text-callout text-text-secondary">
          {kind === "rental" ? t("production.rentalsEmpty") : t("production.costsEmpty")}
        </p>
      ) : (
        <ul className="flex flex-col border-t border-border-strong">
          {rows.map((item) => (
            <li key={item.id} className="flex items-center gap-3 border-b border-border py-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={item.done}
                aria-label={t("production.markDone", { name: item.name })}
                onClick={() => flip(item)}
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors",
                  item.done
                    ? "border-success bg-success text-white"
                    : "border-border-strong hover:border-text-secondary",
                )}
              >
                {item.done ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : null}
              </button>
              <button
                type="button"
                onClick={() => setEditing({ item, kind })}
                className="flex min-w-0 flex-1 items-baseline justify-between gap-4 text-left"
              >
                <span className="flex min-w-0 flex-col">
                  <span
                    className={cn(
                      "truncate text-callout",
                      item.done && "text-text-secondary line-through decoration-1",
                    )}
                  >
                    {item.name}
                  </span>
                  <span className="truncate text-caption text-text-secondary tabular-nums">
                    {kind === "rental"
                      ? t("production.rentalMeta", {
                          supplier: item.supplier ?? "—",
                          quantity: item.quantity,
                          days: item.days,
                          price: money(item.unitPrice),
                        })
                      : t("production.costMeta", {
                          quantity: item.quantity,
                          price: money(item.unitPrice),
                        })}
                  </span>
                </span>
                <span className="shrink-0 text-callout font-medium tabular-nums">
                  {money(itemTotal(item))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        {kind === "rental" && canPrice ? (
          <Button variant="primary" onClick={() => setPicking(true)}>
            <Store size={16} aria-hidden="true" />
            {t("production.fromRental")}
          </Button>
        ) : null}
        <Button variant="secondary" onClick={() => setEditing({ item: null, kind })}>
          <Plus size={16} aria-hidden="true" />
          {kind === "rental" ? t("production.addRental") : t("production.addCost")}
        </Button>
      </div>
    </section>
  );

  const rentalTotal = sum(rentals);
  const costTotal = sum(costs);

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
      <div className="flex min-w-0 flex-col gap-16">
        {list("rental", rentals, 1)}
        {list("cost", costs, 2)}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="surface-invert flex flex-col gap-5 rounded-[26px] bg-surface p-6 shadow-md">
          <div className="flex items-baseline justify-between text-caption">
            <span className="font-medium">
              <span aria-hidden="true">/</span>
              {t("production.summaryTitle")}
            </span>
            <span className="text-text-tertiary tabular-nums">(03)</span>
          </div>
          <div className="flex flex-col gap-2.5">
            <Row label={t("production.rentalsTitle")} value={money(rentalTotal)} />
            <Row label={t("production.costsTitle")} value={money(costTotal)} />
            <div className="my-1 border-t border-border-strong" />
            <Row
              label={t("production.total")}
              value={money(Math.round((rentalTotal + costTotal) * 100) / 100)}
              strong
            />
          </div>
          {shown.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="h-1 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-500",
                    done === shown.length ? "bg-success" : "bg-ink",
                  )}
                  style={{ width: `${(done / shown.length) * 100}%` }}
                />
              </div>
              <span className="text-caption text-text-secondary tabular-nums">
                {t("production.sorted", { done, total: shown.length })}
              </span>
            </div>
          ) : null}
        </div>
      </aside>

      {editing ? (
        <ItemDialog
          key={editing.item?.id ?? `new-${editing.kind}`}
          projectId={projectId}
          item={editing.item}
          kind={editing.kind}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {picking ? (
        <RentalPicker projectId={projectId} catalog={catalog} onClose={() => setPicking(false)} />
      ) : null}
    </div>
  );
}
