import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requireViewer } from "@/features/auth/session";
import { formatIban, payableIban, spaydString } from "@/features/budget/payment";
import { PrintButton } from "@/features/budget/PrintButton";
import type { InvoiceLine } from "@/features/budget/types";
import { getI18n } from "@/lib/i18n/server";
import { formatDate, formatMoney } from "@/lib/format";
import { isUuid } from "@/lib/ids";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Party = Partial<
  Record<
    "name" | "address" | "ico" | "dic" | "email" | "phone" | "iban" | "bank_account" | "note",
    string
  >
> & {
  vat_payer?: boolean;
};

export async function generateMetadata({
  params,
}: PageProps<"/projects/[projectId]/invoices/[invoiceId]">): Promise<Metadata> {
  const { invoiceId } = await params;
  const { t } = await getI18n();
  if (!isUuid(invoiceId)) return { title: t("invoice.title") };
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("invoices")
    .select("number")
    .eq("id", invoiceId)
    .maybeSingle();
  return { title: data ? `${t("invoice.title")} ${data.number}` : t("invoice.title") };
}

function PartyBlock({
  title,
  party,
  t,
}: {
  title: string;
  party: Party;
  t: (key: "budget.billingIco" | "budget.billingDic") => string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold tracking-wide text-[#77766f] uppercase">
        {title}
      </span>
      <span className="text-[15px] font-semibold">{party.name}</span>
      {party.address ? <span className="whitespace-pre-line">{party.address}</span> : null}
      {party.ico ? (
        <span>
          {t("budget.billingIco")}: {party.ico}
        </span>
      ) : null}
      {party.dic ? (
        <span>
          {t("budget.billingDic")}: {party.dic}
        </span>
      ) : null}
      {party.email ? <span>{party.email}</span> : null}
      {party.phone ? <span>{party.phone}</span> : null}
    </div>
  );
}

/** A printable invoice (A4). "Download PDF" uses the browser's print to PDF. */
export default async function InvoicePage({
  params,
}: PageProps<"/projects/[projectId]/invoices/[invoiceId]">) {
  const { projectId, invoiceId } = await params;
  if (!isUuid(invoiceId)) notFound();
  await requireViewer();
  const { t, locale } = await getI18n();
  const supabase = await createSupabaseServerClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (!invoice) notFound();

  const supplier = invoice.supplier as Party;
  const customer = invoice.customer as Party;
  const items = invoice.items as unknown as InvoiceLine[];
  const money = (amount: number) => formatMoney(Number(amount), invoice.currency, locale);
  const vatRate = Number(invoice.vat_rate);
  const iban = payableIban(supplier.iban ?? null, supplier.bank_account ?? null);
  const qr = iban
    ? await QRCode.toString(
        spaydString({
          iban,
          amount: Number(invoice.total),
          currency: invoice.currency,
          variableSymbol: invoice.variable_symbol,
          message: `${t("invoice.title")} ${invoice.number}`,
          recipient: supplier.name ?? null,
        }),
        { type: "svg", margin: 0, errorCorrectionLevel: "M" },
      )
    : null;
  const unitLabel = (unit: string | null) => {
    if (!unit) return "";
    return ["day", "hour", "cut", "item"].includes(unit)
      ? t(`requests.units.${unit as "day"}`)
      : unit;
  };

  return (
    <div className="min-h-dvh bg-[#ecebe8] px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-6 flex max-w-[794px] items-center justify-between gap-3 print:hidden">
        <Link
          href={`/projects/${projectId}/budget`}
          className="inline-flex items-center gap-1 text-body text-[#77766f] hover:text-[#0b0b0b]"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          {t("invoice.back")}
        </Link>
        <PrintButton label={t("invoice.print")} />
      </div>

      {/* Always light: an invoice is a paper document. */}
      <article className="mx-auto flex max-w-[794px] flex-col gap-10 bg-white p-10 text-[13px] leading-relaxed text-[#0b0b0b] shadow-md sm:p-14 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight">
              {supplier.vat_payer ? t("invoice.taxDocument") : t("invoice.title")}
            </h1>
            <p className="text-[15px] text-[#77766f] tabular-nums">{invoice.number}</p>
          </div>
          <dl className="grid grid-cols-[auto_auto] gap-x-6 gap-y-1 text-right">
            <dt className="text-[#77766f]">{t("invoice.issued")}</dt>
            <dd className="tabular-nums">
              {formatDate(invoice.issued_on, locale, { withYear: true })}
            </dd>
            <dt className="text-[#77766f]">{t("invoice.due")}</dt>
            <dd className="font-semibold tabular-nums">
              {formatDate(invoice.due_on, locale, { withYear: true })}
            </dd>
            <dt className="text-[#77766f]">{t("budget.variableSymbol")}</dt>
            <dd className="tabular-nums">{invoice.variable_symbol}</dd>
          </dl>
        </header>

        <section className="grid gap-8 sm:grid-cols-2">
          <PartyBlock title={t("invoice.supplier")} party={supplier} t={t} />
          <PartyBlock title={t("invoice.customer")} party={customer} t={t} />
        </section>

        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-[#0b0b0b] text-[11px] tracking-wide text-[#77766f] uppercase">
              <th className="py-2 font-semibold">{t("invoice.item")}</th>
              <th className="py-2 text-right font-semibold">{t("invoice.quantity")}</th>
              <th className="py-2 text-right font-semibold">{t("invoice.unitPrice")}</th>
              <th className="py-2 text-right font-semibold">{t("invoice.total")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-b border-[#e3e2de]">
                <td className="py-2.5 pr-4">{item.title}</td>
                <td className="py-2.5 text-right tabular-nums">
                  {Number(item.quantity)} {unitLabel(item.unit)}
                </td>
                <td className="py-2.5 text-right tabular-nums">{money(item.unit_price)}</td>
                <td className="py-2.5 text-right tabular-nums">
                  {money(Number(item.quantity) * Number(item.unit_price))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="flex flex-col-reverse gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-5">
            {qr ? (
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className="w-32 [&>svg]:h-auto [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: qr }}
                />
                <span className="text-[10px] text-[#77766f]">{t("invoice.scanToPay")}</span>
              </div>
            ) : null}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              <dt className="text-[#77766f]">{t("invoice.payment")}</dt>
              <dd>{t("invoice.bankTransfer")}</dd>
              {supplier.bank_account ? (
                <>
                  <dt className="text-[#77766f]">{t("billing.bankAccount")}</dt>
                  <dd className="whitespace-nowrap tabular-nums">{supplier.bank_account}</dd>
                </>
              ) : null}
              {iban ? (
                <>
                  <dt className="text-[#77766f]">IBAN</dt>
                  <dd className="whitespace-nowrap tabular-nums">{formatIban(iban)}</dd>
                </>
              ) : null}
              <dt className="text-[#77766f]">{t("budget.variableSymbol")}</dt>
              <dd className="tabular-nums">{invoice.variable_symbol}</dd>
            </dl>
          </div>
          <dl className="grid min-w-[260px] grid-cols-[1fr_auto] gap-x-6 gap-y-1.5">
            {vatRate > 0 ? (
              <>
                <dt className="text-[#77766f]">{t("invoice.subtotal")}</dt>
                <dd className="text-right tabular-nums">{money(invoice.subtotal)}</dd>
                <dt className="text-[#77766f]">{t("invoice.vat", { rate: vatRate })}</dt>
                <dd className="text-right tabular-nums">{money(invoice.vat)}</dd>
              </>
            ) : null}
            <div className="col-span-2 mt-1 flex items-baseline justify-between gap-6 border-t-2 border-[#0b0b0b] pt-2">
              <dt className="text-[15px] font-semibold">{t("invoice.toPay")}</dt>
              <dd className="text-[20px] font-semibold tabular-nums">{money(invoice.total)}</dd>
            </div>
          </dl>
        </section>

        <footer className="flex flex-col gap-1 border-t border-[#e3e2de] pt-4 text-[11px] text-[#77766f]">
          {!supplier.vat_payer ? <span>{t("invoice.notVatPayer")}</span> : null}
          {supplier.note ? <span className="whitespace-pre-line">{supplier.note}</span> : null}
        </footer>
      </article>
    </div>
  );
}
