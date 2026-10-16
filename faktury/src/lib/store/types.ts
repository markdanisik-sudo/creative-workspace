import type { Invoice, InvoiceData } from "@/lib/invoice/types";

export interface BusinessRecord {
  name: string;
  street: string | null;
  city: string | null;
  zip: string | null;
  country: string;
  ico: string | null;
  dic: string | null;
  registry: string | null;
  bank_account: string | null;
  iban: string | null;
  bic: string | null;
  email: string | null;
  phone: string | null;
  web: string | null;
  vat_payer: boolean;
  due_days: number;
  invoice_note: string | null;
}

export interface ContactInput {
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

export interface Contact extends ContactInput {
  id: string;
}

export interface InvoiceRow {
  id: string;
  kind: "invoice" | "credit_note";
  number: string;
  issued_on: string;
  due_on: string;
  paid_on: string | null;
  currency: string;
  total: number;
  total_czk: number;
  customer_name: string;
  customer_ico: string | null;
  contact_id: string | null;
}

export type InvoiceWrite = InvoiceData & { contact_id: string | null };

/** Where the data lives: Supabase (web) or a file on this computer (desktop). */
export interface Store {
  getBusiness(): Promise<BusinessRecord | null>;
  saveBusiness(business: BusinessRecord): Promise<void>;

  listContacts(): Promise<Contact[]>;
  /** A contact with this IČO, or (without IČO) this name. */
  findContact(ico: string | null, name: string): Promise<string | null>;
  insertContact(contact: ContactInput): Promise<string>;
  updateContact(id: string, contact: ContactInput): Promise<boolean>;
  deleteContact(id: string): Promise<boolean>;

  /** Every invoice, newest first, with what lists and charts need. */
  listInvoiceRows(): Promise<InvoiceRow[]>;
  getInvoice(id: string): Promise<Invoice | null>;
  /** Full invoices of one year (by issue date) or all, oldest first. */
  listInvoices(year: number | null): Promise<Invoice[]>;
  /** Which of these invoices (kind|number, external id) already exist. */
  existingInvoices(
    numbers: string[],
    externalIds: string[],
  ): Promise<{ keys: Set<string>; external: Set<string> }>;
  insertInvoices(invoices: InvoiceWrite[]): Promise<string[]>;
  updateInvoice(id: string, invoice: Partial<InvoiceWrite>): Promise<boolean>;
  deleteInvoice(id: string): Promise<boolean>;
}

/** A failed write, with a Postgres-style code ("23505" duplicate, "42501" denied). */
export class StoreError extends Error {
  constructor(
    readonly code: string,
    message = code,
  ) {
    super(message);
  }
}
