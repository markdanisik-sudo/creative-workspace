"use client";

import { Check, FileText, Plus, QrCode } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Input";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { formatDate, formatMoney } from "@/lib/format";
import {
  approveBudget,
  deleteBudgetLine,
  issueInvoice,
  saveBudgetLine,
  saveClientBilling,
  setInvoicePaid,
} from "./actions";
import type { BudgetTotals } from "./totals";
import type { Budget, BudgetLine } from "./types";

export interface QrPayment {
  svg: string;
  iban: string;
  amount: number;
  variableSymbol: string | null;
}

function LineDialog({
  projectId,
  line,
  onClose,
}: {
  projectId: string;
  line: BudgetLine | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (name: string) => String(form.get(name) ?? "");
    setPending(true);
    const result = await saveBudgetLine(projectId, line?.id ?? null, {
      title: get("title"),
      quantity: get("quantity"),
      unit: get("unit"),
      unitPrice: get("unitPrice"),
    });
    setPending(false);
    if (!result.ok) return toast.show({ title: result.error, tone: "error" });
    router.refresh();
    onClose();
  };

  const remove = async () => {
    if (!line) return;
    setPending(true);
    const result = await deleteBudgetLine(projectId, line.id);
    setPending(false);
    if (!result.ok) return toast.show({ title: result.error, tone: "error" });
    router.refresh();
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title={line ? t("budget.editLine") : t("budget.addLine")}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <TextField
          label={t("budget.item")}
          name="title"
          defaultValue={line?.title}
          required
          maxLength={200}
          autoFocus
        />
        <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-3">
          <TextField
            label={t("budget.quantity")}
            name="quantity"
            inputMode="decimal"
            defaultValue={line ? String(line.quantity) : "1"}
            required
          />
          <TextField
            label={t("budget.unit")}
            name="unit"
            placeholder={t("budget.unitPlaceholder")}
            defaultValue={line?.unit ?? ""}
            maxLength={20}
          />
          <TextField
            label={t("budget.unitPrice")}
            name="unitPrice"
            inputMode="decimal"
            defaultValue={line ? String(line.unitPrice) : ""}
            required
          />
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          {line ? (
            <Button variant="danger" size="sm" onClick={remove} disabled={pending}>
              {t("budget.deleteLine")}
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

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: ReactNode;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={cn("flex items-baseline justify-between gap-4", muted && "text-text-secondary")}
    >
      <span className={strong ? "text-callout font-semibold" : "text-body"}>{label}</span>
      <span className={cn("tabular-nums", strong ? "text-headline font-semibold" : "text-body")}>
        {value}
      </span>
    </div>
  );
}

/**
 * The budget: the studio's quote, add-ons (with their approval), the total,
 * and payment — a QR code or a full invoice the client can generate.
 */
export function BudgetView({
  projectId,
  projectName,
  budget,
  totals,
  qr,
  addons,
  isStudio,
}: {
  projectId: string;
  projectName: string;
  budget: Budget;
  totals: BudgetTotals;
  qr: QrPayment | null;
  /** The add-on catalog and history (RequestsView), rendered by the page. */
  addons: ReactNode;
  isStudio: boolean;
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [editing, setEditing] = useState<BudgetLine | "new" | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [savingBilling, setSavingBilling] = useState(false);
  const [pending, startTransition] = useTransition();
  const money = (amount: number) => formatMoney(amount, budget.currency, locale);

  const act = (work: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      if (!result.ok) toast.show({ title: result.error ?? t("errors.generic"), tone: "error" });
      router.refresh();
    });

  const invoice = () =>
    startTransition(async () => {
      const result = await issueInvoice(projectId);
      if (!result.ok) return toast.show({ title: result.error, tone: "error" });
      router.push(`/projects/${projectId}/invoices/${result.data.id}`);
    });

  const submitBilling = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (name: string) => String(form.get(name) ?? "");
    setSavingBilling(true);
    const result = await saveClientBilling(projectId, {
      name: get("name"),
      address: get("address"),
      ico: get("ico"),
      dic: get("dic"),
      email: get("email"),
    });
    setSavingBilling(false);
    if (!result.ok) return toast.show({ title: result.error, tone: "error" });
    toast.show({ title: t("common.saved") });
    router.refresh();
  };

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
      <div className="flex min-w-0 flex-col gap-16">
        {/* Quote */}
        <section className="flex flex-col gap-6">
          <SectionLabel label={t("budget.linesTitle")} index={1} />
          {budget.lines.length === 0 ? (
            <p className="text-callout text-text-secondary">
              {isStudio ? t("budget.linesEmptyStudio") : t("budget.linesEmpty")}
            </p>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border-strong text-caption text-text-secondary">
                  <th className="py-2 font-medium">{t("budget.item")}</th>
                  <th className="hidden py-2 text-right font-medium sm:table-cell">
                    {t("budget.quantity")}
                  </th>
                  <th className="hidden py-2 text-right font-medium sm:table-cell">
                    {t("budget.unitPrice")}
                  </th>
                  <th className="py-2 text-right font-medium">{t("budget.lineTotal")}</th>
                </tr>
              </thead>
              <tbody>
                {budget.lines.map((line) => (
                  <tr
                    key={line.id}
                    onClick={isStudio ? () => setEditing(line) : undefined}
                    className={cn(
                      "border-b border-border",
                      isStudio && "cursor-pointer hover:bg-surface-hover",
                    )}
                  >
                    <td className="py-3.5 pr-4 text-callout">
                      {line.title}
                      <span className="block text-caption text-text-secondary sm:hidden">
                        {line.quantity} {line.unit ?? ""} × {money(line.unitPrice)}
                      </span>
                    </td>
                    <td className="hidden py-3.5 text-right text-body tabular-nums sm:table-cell">
                      {line.quantity} {line.unit ?? ""}
                    </td>
                    <td className="hidden py-3.5 text-right text-body tabular-nums sm:table-cell">
                      {money(line.unitPrice)}
                    </td>
                    <td className="py-3.5 text-right text-callout font-medium tabular-nums">
                      {money(line.quantity * line.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {isStudio ? (
            <div>
              <Button variant="secondary" onClick={() => setEditing("new")}>
                <Plus size={16} aria-hidden="true" />
                {t("budget.addLine")}
              </Button>
            </div>
          ) : null}
        </section>

        {/* Add-ons: catalog, requests and their approval */}
        {addons}

        {/* The client's billing details */}
        <section className="flex flex-col gap-6">
          <SectionLabel label={t("budget.clientBillingTitle")} index={4} />
          <p className="-mt-2 text-callout text-text-secondary">{t("budget.clientBillingBody")}</p>
          <form onSubmit={submitBilling} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <TextField
                label={t("budget.billingName")}
                name="name"
                defaultValue={budget.clientBilling.name ?? ""}
                maxLength={200}
              />
            </div>
            <div className="sm:col-span-2">
              <TextArea
                label={t("budget.billingAddress")}
                name="address"
                defaultValue={budget.clientBilling.address ?? ""}
                rows={2}
                maxLength={500}
              />
            </div>
            <TextField
              label={t("budget.billingIco")}
              name="ico"
              defaultValue={budget.clientBilling.ico ?? ""}
              maxLength={20}
            />
            <TextField
              label={t("budget.billingDic")}
              name="dic"
              defaultValue={budget.clientBilling.dic ?? ""}
              maxLength={20}
            />
            <div className="sm:col-span-2">
              <TextField
                label={t("budget.billingEmail")}
                name="email"
                type="email"
                defaultValue={budget.clientBilling.email ?? ""}
                maxLength={200}
              />
            </div>
            <div>
              <Button type="submit" variant="primary" loading={savingBilling}>
                {t("common.save")}
              </Button>
            </div>
          </form>
        </section>
      </div>

      {/* Total and payment */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="surface-invert flex flex-col gap-5 rounded-[26px] bg-surface p-6 shadow-md">
          <div className="flex items-baseline justify-between text-caption">
            <span className="font-medium">
              <span aria-hidden="true">/</span>
              {t("budget.summaryTitle")}
            </span>
            <span className="text-text-tertiary tabular-nums">(03)</span>
          </div>
          <div className="flex flex-col gap-2.5">
            <Row label={t("budget.base")} value={money(totals.base)} />
            <Row label={t("budget.addons")} value={money(totals.addons)} />
            {totals.unpriced > 0 ? (
              <p className="text-caption text-text-secondary">
                {t("budget.unpriced", { count: totals.unpriced })}
              </p>
            ) : null}
            <div className="my-1 border-t border-border-strong" />
            {totals.vatRate > 0 ? (
              <>
                <Row label={t("budget.subtotal")} value={money(totals.subtotal)} muted />
                <Row
                  label={t("budget.vat", { rate: totals.vatRate })}
                  value={money(totals.vat)}
                  muted
                />
              </>
            ) : null}
            <Row label={t("budget.total")} value={money(totals.total)} strong />
            {totals.vatRate === 0 ? (
              <p className="text-caption text-text-tertiary">{t("budget.noVat")}</p>
            ) : null}
            {totals.pending > 0 ? (
              <div className="mt-1 rounded-[14px] bg-surface-muted p-3">
                <Row label={t("budget.pending")} value={`+ ${money(totals.pending)}`} muted />
                <p className="mt-1 text-caption text-text-tertiary">{t("budget.pendingNote")}</p>
              </div>
            ) : null}
          </div>

          {budget.approvedAt ? (
            <div className="flex items-center justify-between gap-3 rounded-full bg-[#30a46c]/15 py-2 pr-2 pl-4 text-caption font-semibold text-[#30a46c]">
              <span className="flex items-center gap-1.5">
                <Check size={14} aria-hidden="true" />
                {t("budget.approved", { date: formatDate(budget.approvedAt, locale) })}
              </span>
              <button
                type="button"
                onClick={() => act(() => approveBudget(projectId, false))}
                className="rounded-full px-2.5 py-1 text-text-secondary hover:text-text"
              >
                {t("budget.unapprove")}
              </button>
            </div>
          ) : (
            <Button
              variant="primary"
              size="lg"
              disabled={pending || totals.total === 0}
              onClick={() => act(() => approveBudget(projectId, true))}
            >
              <Check size={16} aria-hidden="true" />
              {t("budget.approve")}
            </Button>
          )}

          <div className="flex flex-col gap-2 border-t border-border-strong pt-5">
            <span className="text-caption font-medium text-text-secondary">
              {t("budget.paymentTitle")}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowQr(true)}
                disabled={totals.total === 0}
              >
                <QrCode size={16} aria-hidden="true" />
                {t("budget.qr")}
              </Button>
              <Button
                variant="secondary"
                onClick={invoice}
                loading={pending}
                disabled={totals.total === 0}
              >
                <FileText size={16} aria-hidden="true" />
                {t("budget.issueInvoice")}
              </Button>
            </div>
          </div>

          {budget.invoices.length > 0 ? (
            <div className="flex flex-col gap-2 border-t border-border-strong pt-5">
              <span className="text-caption font-medium text-text-secondary">
                {t("budget.invoicesTitle")}
              </span>
              <ul className="flex flex-col gap-1.5">
                {budget.invoices.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-[14px] bg-surface-muted px-3 py-2.5"
                  >
                    <Link
                      href={`/projects/${projectId}/invoices/${item.id}`}
                      className="flex min-w-0 flex-1 flex-col hover:underline"
                    >
                      <span className="text-body font-semibold">
                        {t("budget.invoiceNumber", { number: item.number })}
                      </span>
                      <span className="text-caption text-text-secondary">
                        {money(item.total)} ·{" "}
                        {t("budget.due", { date: formatDate(item.dueOn, locale) })}
                      </span>
                    </Link>
                    {isStudio ? (
                      <button
                        type="button"
                        onClick={() => act(() => setInvoicePaid(projectId, item.id, !item.paidAt))}
                        title={item.paidAt ? t("budget.markUnpaid") : t("budget.markPaid")}
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          item.paidAt
                            ? "bg-[#30a46c]/20 text-[#30a46c]"
                            : "bg-surface text-text-secondary",
                        )}
                      >
                        {item.paidAt ? t("budget.paid") : t("budget.unpaid")}
                      </button>
                    ) : (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          item.paidAt
                            ? "bg-[#30a46c]/20 text-[#30a46c]"
                            : "bg-surface text-text-secondary",
                        )}
                      >
                        {item.paidAt ? t("budget.paid") : t("budget.unpaid")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </aside>

      {editing ? (
        <LineDialog
          key={editing === "new" ? "new" : editing.id}
          projectId={projectId}
          line={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      ) : null}

      <Dialog
        open={showQr}
        onClose={() => setShowQr(false)}
        title={t("budget.qrTitle")}
        description={qr ? t("budget.qrBody") : undefined}
      >
        {qr ? (
          <div className="flex flex-col items-center gap-5">
            <div
              className="w-60 rounded-[18px] bg-white p-3 [&>svg]:h-auto [&>svg]:w-full"
              // Generated on the server from our own payment data.
              dangerouslySetInnerHTML={{ __html: qr.svg }}
            />
            <dl className="grid w-full grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-body">
              <dt className="text-text-secondary">{t("budget.amount")}</dt>
              <dd className="text-right font-semibold tabular-nums">{money(qr.amount)}</dd>
              <dt className="text-text-secondary">{t("budget.account")}</dt>
              <dd className="text-right font-mono text-caption">{qr.iban}</dd>
              {qr.variableSymbol ? (
                <>
                  <dt className="text-text-secondary">{t("budget.variableSymbol")}</dt>
                  <dd className="text-right tabular-nums">{qr.variableSymbol}</dd>
                </>
              ) : null}
            </dl>
            <p className="text-caption text-text-tertiary">{projectName}</p>
          </div>
        ) : (
          <p className="text-callout text-text-secondary">{t("budget.qrMissing")}</p>
        )}
      </Dialog>
    </div>
  );
}
