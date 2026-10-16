import type { Metadata } from "next";
import { ContactsView } from "@/features/contacts/ContactsView";
import { listContacts } from "@/features/contacts/queries";
import { listInvoiceRows } from "@/features/invoices/queries";

export const metadata: Metadata = { title: "Kontakty" };

export default async function ContactsPage() {
  const [contacts, rows] = await Promise.all([listContacts(), listInvoiceRows()]);
  const totals: Record<string, number> = {};
  for (const row of rows) {
    if (row.contact_id) totals[row.contact_id] = (totals[row.contact_id] ?? 0) + row.total_czk;
  }
  return <ContactsView contacts={contacts} totals={totals} />;
}
