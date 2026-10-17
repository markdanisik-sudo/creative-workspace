"use client";

import { Check, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { GEAR_BRANDS, gearName, type GearCategory } from "../gear-catalog";
import { addPlanItems } from "../plan-actions";

const CATEGORY_ORDER: GearCategory[] = [
  "camera",
  "lens",
  "light",
  "sound",
  "grip",
  "power",
  "data",
  "other",
];

/** Pick cameras, lenses and lights by brand straight into the gear list. */
export function GearCatalog({
  projectId,
  existing,
  onClose,
}: {
  projectId: string;
  /** Names already on the list. */
  existing: string[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [brandId, setBrandId] = useState(GEAR_BRANDS[0].id);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Map<string, GearCategory>>(new Map());
  const [pending, startTransition] = useTransition();
  const have = useMemo(() => new Set(existing.map((name) => name.toLowerCase())), [existing]);

  const needle = query.trim().toLowerCase();
  // Searching looks through every brand; otherwise show the chosen one.
  const brands = needle ? GEAR_BRANDS : GEAR_BRANDS.filter((brand) => brand.id === brandId);
  const results = brands.flatMap((brand) =>
    brand.items
      .map((item) => ({ ...item, name: gearName(brand, item.model) }))
      .filter((item) => !needle || item.name.toLowerCase().includes(needle)),
  );

  const toggle = (name: string, category: GearCategory) =>
    setPicked((current) => {
      const next = new Map(current);
      if (next.has(name)) next.delete(name);
      else next.set(name, category);
      return next;
    });

  const add = () =>
    startTransition(async () => {
      const result = await addPlanItems(
        projectId,
        "gear",
        [...picked.entries()].map(([item, category]) => ({ item, category, quantity: 1 })),
      );
      if (!result.ok) return toast.show({ title: result.error, tone: "error" });
      toast.show({ title: t("gearCatalog.added", { count: result.data.added }) });
      router.refresh();
      onClose();
    });

  return (
    <Dialog
      open
      onClose={onClose}
      title={t("gearCatalog.title")}
      description={t("gearCatalog.body")}
      className="max-w-[640px]"
    >
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-tertiary"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("gearCatalog.search")}
            aria-label={t("gearCatalog.search")}
            className="h-10 w-full rounded-full bg-surface-muted pr-4 pl-10 text-body outline-none focus-visible:shadow-[0_0_0_2px_var(--text)]"
          />
        </div>
        {!needle ? (
          <div className="flex flex-wrap gap-1.5" role="tablist">
            {GEAR_BRANDS.map((brand) => (
              <button
                key={brand.id}
                type="button"
                role="tab"
                aria-selected={brand.id === brandId}
                onClick={() => setBrandId(brand.id)}
                className={cn(
                  "h-8 rounded-full px-3.5 text-body font-semibold transition-colors",
                  brand.id === brandId
                    ? "bg-ink text-text-inverse"
                    : "bg-surface-muted text-text-secondary hover:text-text",
                )}
              >
                {brand.name}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex max-h-[50vh] flex-col gap-4 overflow-y-auto pr-1">
          {results.length === 0 ? (
            <p className="py-8 text-center text-body text-text-secondary">
              {t("gearCatalog.nothing")}
            </p>
          ) : (
            CATEGORY_ORDER.map((category) => {
              const inCategory = results.filter((item) => item.category === category);
              if (inCategory.length === 0) return null;
              return (
                <section key={category} className="flex flex-col gap-2">
                  <h4 className="text-caption font-semibold tracking-wide text-text-secondary uppercase">
                    {t(`boxes.options.gearCategory.${category}`)}
                  </h4>
                  <ul className="grid gap-1.5 sm:grid-cols-2">
                    {inCategory.map((item) => {
                      const selected = picked.has(item.name);
                      const already = have.has(item.name.toLowerCase());
                      return (
                        <li key={item.name}>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={selected}
                            onClick={() => toggle(item.name, item.category)}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2 text-left text-body transition-colors",
                              selected
                                ? "bg-surface-pressed"
                                : "bg-surface-muted hover:bg-surface-hover",
                            )}
                          >
                            <span
                              className={cn(
                                "flex size-5 shrink-0 items-center justify-center rounded-md border-2",
                                selected
                                  ? "border-text bg-text text-text-inverse"
                                  : "border-border-strong",
                              )}
                            >
                              {selected ? (
                                <Check size={12} strokeWidth={3} aria-hidden="true" />
                              ) : null}
                            </span>
                            <span className="min-w-0 flex-1 truncate">{item.name}</span>
                            {already ? (
                              <span className="shrink-0 text-caption text-text-tertiary">
                                {t("gearCatalog.onList")}
                              </span>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-caption text-text-tertiary">{t("gearCatalog.more")}</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button variant="primary" onClick={add} loading={pending} disabled={picked.size === 0}>
              {t("gearCatalog.add", { count: picked.size })}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
