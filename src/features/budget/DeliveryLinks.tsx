"use client";

import { ArrowUpRight, Download, Link2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/client";
import { addDeliveryLink, deleteDeliveryLink } from "./actions";
import type { DeliveryLink } from "./types";

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** The big "your files are ready" card at the top of the overview. */
export function DeliveryCard({ links }: { links: DeliveryLink[] }) {
  const { t } = useI18n();
  if (links.length === 0) return null;
  return (
    <section className="surface-invert flex flex-col gap-4 rounded-[24px] bg-surface p-5 shadow-md sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-[#30a46c] text-white">
          <Download size={18} aria-hidden="true" />
        </span>
        <div className="flex flex-col">
          <h2 className="text-title font-semibold">{t("delivery.title")}</h2>
          <p className="text-body text-text-secondary">{t("delivery.body")}</p>
        </div>
      </div>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.id}>
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 rounded-[16px] bg-surface-muted px-4 py-3.5 transition-colors hover:bg-surface-pressed"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-callout font-semibold">
                  {link.label || t("delivery.defaultLabel")}
                </span>
                <span className="truncate text-caption text-text-secondary">
                  {hostOf(link.url)}
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink px-3.5 py-1.5 text-caption font-semibold text-text-inverse">
                {t("delivery.open")}
                <ArrowUpRight size={13} aria-hidden="true" />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Studio: add or remove the delivery links (Frame.io or any other place). */
export function DeliveryLinksEditor({
  projectId,
  links,
}: {
  projectId: string;
  links: DeliveryLink[];
}) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [pending, startTransition] = useTransition();

  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!url.trim()) return;
    startTransition(async () => {
      const result = await addDeliveryLink(projectId, url, label);
      if (!result.ok) return toast.show({ title: result.error, tone: "error" });
      setUrl("");
      setLabel("");
      router.refresh();
    });
  };

  const remove = (id: string) =>
    startTransition(async () => {
      const result = await deleteDeliveryLink(projectId, id);
      if (!result.ok) toast.show({ title: result.error, tone: "error" });
      router.refresh();
    });

  const input =
    "h-10 min-w-0 rounded-full bg-surface-muted px-4 text-body outline-none placeholder:text-text-tertiary focus-visible:shadow-[0_0_0_2px_var(--text)]";

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-[18px] bg-surface-muted/60 p-3">
      <span className="flex items-center gap-1.5 px-1 text-caption font-semibold text-text-secondary">
        <Link2 size={13} aria-hidden="true" />
        {t("delivery.title")}
      </span>
      {links.map((link) => (
        <div key={link.id} className="flex items-center gap-2 px-1">
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1 truncate text-body hover:underline"
          >
            {link.label ? `${link.label} · ` : ""}
            <span className="text-text-secondary">{hostOf(link.url)}</span>
          </a>
          <button
            type="button"
            onClick={() => remove(link.id)}
            aria-label={t("delivery.remove")}
            className="flex size-8 items-center justify-center rounded-full text-text-tertiary hover:text-danger"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <form onSubmit={add} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={t("delivery.urlPlaceholder")}
          inputMode="url"
          className={`${input} flex-[2]`}
        />
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder={t("delivery.labelPlaceholder")}
          className={`${input} flex-1`}
        />
        <Button type="submit" variant="primary" loading={pending} disabled={!url.trim()}>
          {t("delivery.add")}
        </Button>
      </form>
    </div>
  );
}
