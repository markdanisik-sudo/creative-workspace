"use client";

import { Minus, Plus, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Input";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { formatEdited, formatMoney } from "@/lib/format";
import { createRequest, setRequestStatus, withdrawRequest } from "./actions";
import type { AddOnRequest, RequestStatus, Service } from "./types";

const STATUS_STYLE: Record<RequestStatus, string> = {
  requested: "bg-[#f5a524]/15 text-[#a35c00] dark:text-[#f5c26b]",
  approved: "bg-[#30a46c]/15 text-[#1d7a4c] dark:text-[#5bd49a]",
  declined: "bg-text/10 text-text-secondary",
  done: "bg-ink text-text-inverse",
};

function usePrice() {
  const { t, locale } = useI18n();
  return (service: Pick<Service, "unitPrice" | "currency" | "unit">) =>
    service.unitPrice === null
      ? t("requests.priceOnRequest")
      : t("requests.perUnit", {
          price: formatMoney(service.unitPrice, service.currency, locale),
          unit: t(`requests.units.${service.unit}`),
        });
}

function RequestDialog({
  projectId,
  service,
  onClose,
  onSent,
}: {
  projectId: string;
  /** null = a custom request. */
  service: Service | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const price = usePrice();
  const [quantity, setQuantity] = useState(1);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    const result = await createRequest(projectId, {
      serviceId: service?.id ?? null,
      title: String(form.get("title") ?? ""),
      quantity,
      details: String(form.get("details") ?? ""),
    });
    setPending(false);
    if (!result.ok) return toast.show({ title: result.error, tone: "error" });
    toast.show({ title: t("requests.sent") });
    onSent();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={service ? t("requests.requestTitle", { name: service.name }) : t("requests.custom")}
      description={service?.description ?? t("requests.customDescription")}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        {service ? null : (
          <TextField label={t("requests.customTitle")} name="title" required maxLength={200} autoFocus />
        )}
        <div className="flex items-center justify-between gap-4">
          <span className="text-caption font-medium text-text-secondary">{t("requests.quantity")}</span>
          <div className="flex items-center gap-1 rounded-full bg-surface-muted p-1">
            <button
              type="button"
              aria-label="−"
              onClick={() => setQuantity((n) => Math.max(1, n - 1))}
              className="flex size-8 items-center justify-center rounded-full hover:bg-surface"
            >
              <Minus size={14} />
            </button>
            <span className="w-8 text-center text-callout font-semibold tabular-nums" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              aria-label="+"
              onClick={() => setQuantity((n) => Math.min(100, n + 1))}
              className="flex size-8 items-center justify-center rounded-full hover:bg-surface"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
        <TextArea label={t("requests.details")} name="details" placeholder={t("requests.detailsPlaceholder")} rows={4} />
        {service ? (
          <p className="text-body text-text-secondary">
            {service.unitPrice === null
              ? price(service)
              : t("requests.total", { price: formatMoney(service.unitPrice * quantity, service.currency, locale) })}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" variant="primary" loading={pending}>
            {t("requests.send")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function RequestsView({
  projectId,
  services,
  requests,
  viewerId,
  isStudio,
}: {
  projectId: string;
  services: Service[];
  requests: AddOnRequest[];
  viewerId: string;
  isStudio: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const price = usePrice();
  const [dialog, setDialog] = useState<Service | "custom" | null>(null);
  const [, startTransition] = useTransition();

  const act = (work: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      if (!result.ok) toast.show({ title: result.error ?? t("errors.generic"), tone: "error" });
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-16">
      <section className="flex flex-col gap-6">
        <SectionLabel label={t("requests.catalogTitle")} index={1} />
        <p className="-mt-2 max-w-xl text-callout text-text-secondary">{t("requests.catalogBody")}</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => setDialog(service)}
              className="group flex min-h-40 flex-col justify-between gap-6 rounded-xl bg-surface p-5 text-left shadow-sm transition-shadow duration-300 hover:shadow-md"
            >
              <span className="flex flex-col gap-1.5">
                <span className="text-title font-medium">{service.name}</span>
                {service.description ? (
                  <span className="text-body text-text-secondary">{service.description}</span>
                ) : null}
              </span>
              <span className="flex items-center justify-between gap-3">
                <span className="text-caption text-text-secondary">{price(service)}</span>
                <span className="inline-flex h-8 items-center rounded-full bg-ink px-3.5 text-caption font-semibold text-text-inverse transition-transform group-active:scale-95">
                  {t("requests.request")}
                </span>
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDialog("custom")}
            className="flex min-h-40 flex-col justify-between gap-6 rounded-xl border border-dashed border-border-strong p-5 text-left text-text-secondary transition-colors hover:border-text hover:text-text"
          >
            <Sparkles size={20} aria-hidden="true" />
            <span className="flex flex-col gap-1.5">
              <span className="text-title font-medium">{t("requests.custom")}</span>
              <span className="text-body">{t("requests.customDescription")}</span>
            </span>
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <SectionLabel label={t("requests.history")} index={2} />
        {requests.length === 0 ? (
          <p className="text-callout text-text-secondary">{t("requests.empty")}</p>
        ) : (
          <ul className="flex flex-col border-t border-border-strong">
            {requests.map((request) => (
              <li key={request.id} className="flex flex-col gap-3 border-b border-border-strong py-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="text-title font-medium">
                      {request.quantity > 1 ? `${request.quantity}× ` : ""}
                      {request.title}
                    </span>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", STATUS_STYLE[request.status])}>
                      {t(`requests.status.${request.status}`)}
                    </span>
                  </div>
                  <span className="text-caption text-text-secondary">
                    {t("requests.requestedBy", {
                      name: request.requestedById === viewerId ? t("discussion.you") : request.requester.name,
                      when: formatEdited(request.createdAt, locale),
                    })}
                    {request.unitPrice !== null
                      ? ` · ${formatMoney(request.unitPrice * request.quantity, request.currency, locale)}`
                      : ""}
                  </span>
                  {request.details ? (
                    <p className="max-w-2xl pt-1 text-body whitespace-pre-line text-text-secondary">{request.details}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {isStudio && request.status === "requested" ? (
                    <>
                      <Button size="sm" variant="primary" onClick={() => act(() => setRequestStatus(projectId, request.id, "approved"))}>
                        {t("requests.approve")}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => act(() => setRequestStatus(projectId, request.id, "declined"))}>
                        {t("requests.decline")}
                      </Button>
                    </>
                  ) : null}
                  {isStudio && request.status === "approved" ? (
                    <Button size="sm" variant="secondary" onClick={() => act(() => setRequestStatus(projectId, request.id, "done"))}>
                      {t("requests.markDone")}
                    </Button>
                  ) : null}
                  {!isStudio && request.status === "requested" && request.requestedById === viewerId ? (
                    <Button size="sm" variant="ghost" onClick={() => act(() => withdrawRequest(projectId, request.id))}>
                      {t("requests.withdraw")}
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {dialog ? (
        <RequestDialog
          projectId={projectId}
          service={dialog === "custom" ? null : dialog}
          onClose={() => setDialog(null)}
          onSent={() => {
            setDialog(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
