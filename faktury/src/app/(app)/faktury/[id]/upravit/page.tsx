import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBusiness } from "@/features/business/queries";
import { listContacts } from "@/features/contacts/queries";
import { InvoiceForm } from "@/features/invoices/InvoiceForm";
import { getInvoice } from "@/features/invoices/queries";
import { isUuid } from "@/lib/ids";

export const metadata: Metadata = { title: "Upravit fakturu" };

export default async function EditInvoicePage({ params }: PageProps<"/faktury/[id]/upravit">) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [invoice, business, contacts] = await Promise.all([
    getInvoice(id),
    getBusiness(),
    listContacts(),
  ]);
  if (!invoice) notFound();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-headline font-medium">Upravit fakturu {invoice.number}</h1>
      <InvoiceForm
        id={invoice.id}
        initial={invoice}
        contacts={contacts}
        vatPayer={business.vat_payer || invoice.vat !== 0}
        dueDays={business.due_days}
        initialContactId={invoice.contact_id}
      />
    </div>
  );
}
