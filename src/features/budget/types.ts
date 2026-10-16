export interface BudgetLine {
  id: string;
  title: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
}

export interface ClientBilling {
  name?: string;
  address?: string;
  ico?: string;
  dic?: string;
  email?: string;
}

export const CLIENT_BILLING_FIELDS = ["name", "address", "ico", "dic", "email"] as const;

export interface StudioBilling {
  name: string;
  address: string | null;
  ico: string | null;
  dic: string | null;
  iban: string | null;
  bankAccount: string | null;
  email: string | null;
  phone: string | null;
  vatPayer: boolean;
  vatRate: number;
  dueDays: number;
  invoiceNote: string | null;
}

export interface InvoiceSummary {
  id: string;
  number: string;
  issuedOn: string;
  dueOn: string;
  total: number;
  currency: string;
  paidAt: string | null;
}

export interface Budget {
  currency: string;
  lines: BudgetLine[];
  clientBilling: ClientBilling;
  approvedAt: string | null;
  invoices: InvoiceSummary[];
}

export interface DeliveryLink {
  id: string;
  label: string | null;
  url: string;
}

export interface InvoiceLine {
  title: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
}
