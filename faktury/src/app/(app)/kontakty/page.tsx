import type { Metadata } from "next";
import { ContactsView } from "@/features/contacts/ContactsView";
import { listContacts } from "@/features/contacts/queries";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Kontakty" };

export default async function ContactsPage() {
  const supabase = await createSupabaseServerClient();
  const [contacts, sums] = await Promise.all([
    listContacts(),
    fetchAll((from, to) =>
      supabase
        .from("invoices")
        .select("contact_id, total_czk")
        .not("contact_id", "is", null)
        .range(from, to),
    ),
  ]);
  const totals: Record<string, number> = {};
  for (const row of sums) {
    if (row.contact_id)
      totals[row.contact_id] = (totals[row.contact_id] ?? 0) + Number(row.total_czk);
  }
  return <ContactsView contacts={contacts} totals={totals} />;
}
