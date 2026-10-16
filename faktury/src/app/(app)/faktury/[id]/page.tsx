import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceActions } from "@/features/invoices/InvoiceActions";
import { InvoicePaper } from "@/features/invoices/InvoicePaper";
import { getInvoice } from "@/features/invoices/queries";
import { StatusBadge } from "@/features/invoices/StatusBadge";
import { formatDate } from "@/lib/format";
import { isUuid } from "@/lib/ids";
import { invoiceStatus, todayIso } from "@/lib/invoice/types";

export async function generateMetadata({ params }: PageProps<"/faktury/[id]">): Promise<Metadata> {
  const { id } = await params;
  const invoice = isUuid(id) ? await getInvoice(id) : null;
  return { title: invoice ? `Faktura ${invoice.number}` : "Faktura" };
}

export default async function InvoicePage({ params }: PageProps<"/faktury/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const invoice = await getInvoice(id);
  if (!invoice) notFound();
  const today = todayIso();
  const status = invoiceStatus(invoice, today);
  const sourceLabel = { app: null, isdoc: "Importováno z ISDOC", csv: "Importováno z CSV" }[
    invoice.source
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 print:hidden">
        <Link
          href="/faktury"
          className="inline-flex w-fit items-center gap-1 text-body text-text-secondary hover:text-text"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Faktury
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-headline font-medium tabular">{invoice.number}</h1>
          <StatusBadge status={status} />
          <span className="text-body text-text-secondary">
            {invoice.paid_on
              ? `zaplaceno ${formatDate(invoice.paid_on)}`
              : `splatnost ${formatDate(invoice.due_on)}`}
            {sourceLabel ? ` · ${sourceLabel}` : ""}
          </span>
        </div>
        <InvoiceActions
          id={invoice.id}
          number={invoice.number}
          paidOn={invoice.paid_on}
          today={today}
        />
      </div>
      <InvoicePaper invoice={invoice} />
    </div>
  );
}
