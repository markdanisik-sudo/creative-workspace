import type { Metadata } from "next";
import { getBusiness } from "@/features/business/queries";
import { listContacts } from "@/features/contacts/queries";
import { InvoiceForm } from "@/features/invoices/InvoiceForm";
import { getInvoice, listInvoiceNumbers } from "@/features/invoices/queries";
import { isUuid } from "@/lib/ids";
import { nextInvoiceNumber } from "@/lib/invoice/numbering";
import { addDays, todayIso, type InvoiceData } from "@/lib/invoice/types";

export const metadata: Metadata = { title: "Nová faktura" };

export default async function NewInvoicePage({ searchParams }: PageProps<"/faktury/nova">) {
  const { z: copyFrom, kontakt } = await searchParams;
  const [business, contacts, numbers] = await Promise.all([
    getBusiness(),
    listContacts(),
    listInvoiceNumbers(),
  ]);
  const today = todayIso();
  const number = nextInvoiceNumber(numbers, Number(today.slice(0, 4)));
  const source =
    typeof copyFrom === "string" && isUuid(copyFrom) ? await getInvoice(copyFrom) : null;
  const contact =
    typeof kontakt === "string" ? contacts.find((item) => item.id === kontakt) : undefined;

  const initial: InvoiceData = {
    kind: "invoice",
    number,
    variable_symbol: number.replace(/\D/g, "").slice(0, 10),
    issued_on: today,
    taxable_on: today,
    due_on: addDays(today, business.due_days),
    paid_on: null,
    currency: source?.currency ?? "CZK",
    exchange_rate: source?.exchange_rate ?? 1,
    supplier: { name: business.name },
    customer: source?.customer ?? (contact ? { ...contact } : { name: "", country: "CZ" }),
    items: source?.items.map((item) => ({ ...item, unit_price: Math.abs(item.unit_price) })) ?? [],
    subtotal: 0,
    vat: 0,
    total: 0,
    note: source?.note ?? business.invoice_note,
    source: "app",
    external_id: null,
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-headline font-medium">
        {source ? `Nová faktura podle ${source.number}` : "Nová faktura"}
      </h1>
      {!business.complete ? (
        <p className="rounded-xl bg-surface p-4 text-body text-text-secondary shadow-sm">
          Než fakturu pošleš, doplň v Nastavení své údaje a číslo účtu — jinak na faktuře chybí.
        </p>
      ) : null}
      <InvoiceForm
        id={null}
        initial={initial}
        contacts={contacts}
        vatPayer={business.vat_payer}
        dueDays={business.due_days}
        initialContactId={contact?.id ?? source?.contact_id ?? null}
      />
    </div>
  );
}
