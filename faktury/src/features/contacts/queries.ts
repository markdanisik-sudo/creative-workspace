import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface Contact {
  id: string;
  name: string;
  street: string | null;
  city: string | null;
  zip: string | null;
  country: string;
  ico: string | null;
  dic: string | null;
  email: string | null;
  phone: string | null;
}

export const listContacts = cache(async (): Promise<Contact[]> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, name, street, city, zip, country, ico, dic, email, phone")
    .order("name");
  return data ?? [];
});
