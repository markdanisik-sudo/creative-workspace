"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/Toast";
import { deleteService, saveService } from "@/features/hub/actions";
import { UNITS, type Service, type Unit } from "@/features/hub/types";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";

const SELECT_CLASS =
  "h-11 rounded-lg bg-surface-muted px-3 text-callout outline-none focus-visible:shadow-[0_0_0_2px_var(--text)]";

function ServiceDialog({ service, onClose, onSaved }: { service: Service | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [active, setActive] = useState(service?.active ?? true);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (name: string) => String(form.get(name) ?? "");
    setPending(true);
    const result = await saveService(service?.id ?? null, {
      name: get("name"),
      description: get("description"),
      unit: get("unit") as Unit,
      unitPrice: get("price"),
      currency: get("currency"),
      active,
    });
    setPending(false);
    if (!result.ok) return toast.show({ title: result.error, tone: "error" });
    onSaved();
  };

  const remove = async () => {
    if (!service) return;
    setPending(true);
    const result = await deleteService(service.id);
    setPending(false);
    if (!result.ok) return toast.show({ title: result.error, tone: "error" });
    onSaved();
  };

  return (
    <Dialog open onClose={onClose} title={service ? t("services.edit") : t("services.add")}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <TextField label={t("services.name")} name="name" defaultValue={service?.name} required maxLength={120} autoFocus />
        <TextArea label={t("services.description")} name="description" defaultValue={service?.description ?? ""} rows={2} maxLength={1000} />
        <div className="grid grid-cols-[1fr_1fr_88px] gap-3">
          <TextField
            label={t("services.price")}
            name="price"
            inputMode="decimal"
            placeholder={t("services.pricePlaceholder")}
            defaultValue={service?.unitPrice ?? ""}
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-medium text-text-secondary">{t("services.unit")}</span>
            <select name="unit" defaultValue={service?.unit ?? "item"} className={SELECT_CLASS}>
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {t(`requests.units.${unit}`)}
                </option>
              ))}
            </select>
          </label>
          <TextField label={t("services.currency")} name="currency" defaultValue={service?.currency ?? "CZK"} maxLength={3} />
        </div>
        <label className="flex items-center gap-2.5 text-body">
          <input
            type="checkbox"
            checked={active}
            onChange={(change) => setActive(change.target.checked)}
            className="size-4 accent-[var(--ink)]"
          />
          {t("services.active")}
        </label>
        <div className="flex items-center justify-between gap-2 pt-1">
          {service ? (
            <Button variant="danger" size="sm" onClick={remove} disabled={pending}>
              {t("services.delete")}
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

/** Studio-only catalog of add-ons that clients can request. */
export function ServicesManager({ services }: { services: Service[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = useState<Service | "new" | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body text-text-secondary">{t("services.body")}</p>
      {services.length === 0 ? <p className="text-body text-text-secondary">{t("services.empty")}</p> : null}
      <ul className="flex flex-col gap-1.5">
        {services.map((service) => (
          <li key={service.id}>
            <button
              type="button"
              onClick={() => setEditing(service)}
              className={cn(
                "flex w-full items-center justify-between gap-4 rounded-lg bg-surface px-4 py-3 text-left shadow-sm transition-shadow hover:shadow-md",
                !service.active && "opacity-50",
              )}
            >
              <span className="truncate text-body font-medium">{service.name}</span>
              <span className="shrink-0 text-caption text-text-secondary tabular-nums">
                {service.unitPrice === null
                  ? t("requests.priceOnRequest")
                  : t("requests.perUnit", {
                      price: formatMoney(service.unitPrice, service.currency, locale),
                      unit: t(`requests.units.${service.unit}`),
                    })}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div>
        <Button variant="secondary" onClick={() => setEditing("new")}>
          <Plus size={16} aria-hidden="true" />
          {t("services.add")}
        </Button>
      </div>
      {editing ? (
        <ServiceDialog
          key={editing === "new" ? "new" : editing.id}
          service={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
