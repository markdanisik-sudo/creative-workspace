"use client";

import { Plus, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/Toast";
import type { Contact } from "@/features/contacts/queries";
import { useAres } from "@/features/contacts/useAres";
import { formatMoney } from "@/lib/format";
import {
  addDays,
  invoiceTotals,
  lineTotals,
  type InvoiceData,
  type Party,
} from "@/lib/invoice/types";
import { saveInvoice, suggestNumber } from "./actions";

interface Line {
  key: number;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  vat_rate: string;
}

const toNumber = (value: string) => {
  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

const CURRENCIES = ["CZK", "EUR", "USD", "GBP"];

const selectClass =
  "h-11 w-full rounded-lg bg-surface-muted px-3 text-callout text-text outline-none focus-visible:shadow-[0_0_0_2px_var(--text)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-caption font-medium text-text-secondary">{label}</span>
      {children}
    </label>
  );
}

export function InvoiceForm({
  id,
  initial,
  contacts,
  vatPayer,
  dueDays,
  initialContactId,
}: {
  id: string | null;
  initial: InvoiceData;
  contacts: Contact[];
  vatPayer: boolean;
  dueDays: number;
  initialContactId: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const ares = useAres();
  const [pending, startTransition] = useTransition();

  const [contactId, setContactId] = useState(initialContactId ?? "");
  const [customer, setCustomer] = useState<Party>(initial.customer);
  const [saveContact, setSaveContact] = useState(!id);
  const [number, setNumber] = useState(initial.number);
  const [numberTouched, setNumberTouched] = useState(Boolean(id));
  const [variableSymbol, setVariableSymbol] = useState(initial.variable_symbol ?? "");
  const [vsTouched, setVsTouched] = useState(Boolean(id));
  const [issuedOn, setIssuedOn] = useState(initial.issued_on);
  const [taxableOn, setTaxableOn] = useState(initial.taxable_on ?? initial.issued_on);
  const [dueOn, setDueOn] = useState(initial.due_on);
  const [currency, setCurrency] = useState(initial.currency);
  const [rate, setRate] = useState(String(initial.exchange_rate));
  const [note, setNote] = useState(initial.note ?? "");
  const [lines, setLines] = useState<Line[]>(() =>
    (initial.items.length > 0
      ? initial.items
      : [{ description: "", quantity: 1, unit: null, unit_price: 0, vat_rate: vatPayer ? 21 : 0 }]
    ).map((item, index) => ({
      key: index,
      description: item.description,
      quantity: String(item.quantity),
      unit: item.unit ?? "",
      unit_price: item.unit_price ? String(item.unit_price) : "",
      vat_rate: String(item.vat_rate),
    })),
  );

  const items = useMemo(
    () =>
      lines.map((line) => ({
        description: line.description,
        quantity: toNumber(line.quantity),
        unit: line.unit || null,
        unit_price: toNumber(line.unit_price),
        vat_rate: vatPayer ? toNumber(line.vat_rate) : 0,
      })),
    [lines, vatPayer],
  );
  const totals = invoiceTotals(items);

  const pickContact = (value: string) => {
    setContactId(value);
    const contact = contacts.find((item) => item.id === value);
    if (contact) {
      setCustomer({ ...contact });
      setSaveContact(false);
    } else {
      setCustomer({ name: "", country: "CZ" });
      setSaveContact(true);
    }
  };

  const setParty = (field: keyof Party, value: string) =>
    setCustomer((current) => ({ ...current, [field]: value }));

  const changeNumber = (value: string) => {
    setNumber(value);
    setNumberTouched(true);
    if (!vsTouched) setVariableSymbol(value.replace(/\D/g, "").slice(0, 10));
  };

  const changeIssued = (value: string) => {
    const yearChanged = value.slice(0, 4) !== issuedOn.slice(0, 4);
    setIssuedOn(value);
    if (!id) {
      setTaxableOn(value);
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) setDueOn(addDays(value, dueDays));
    }
    if (yearChanged && !numberTouched && /^\d{4}/.test(value)) {
      startTransition(async () => {
        const next = await suggestNumber(Number(value.slice(0, 4)));
        setNumber(next);
        if (!vsTouched) setVariableSymbol(next.replace(/\D/g, "").slice(0, 10));
      });
    }
  };

  const fillFromAres = async () => {
    const found = await ares.lookup(customer.ico ?? "");
    if (found) setCustomer((current) => ({ ...current, ...found }));
  };

  const updateLine = (key: number, field: keyof Line, value: string) =>
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, [field]: value } : line)),
    );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveInvoice(
        {
          kind: initial.kind,
          number,
          variable_symbol: variableSymbol,
          issued_on: issuedOn,
          taxable_on: vatPayer ? taxableOn : null,
          due_on: dueOn,
          paid_on: initial.paid_on,
          currency,
          exchange_rate: currency === "CZK" ? 1 : toNumber(rate),
          customer,
          items: items.filter((item) => item.description.trim() !== ""),
          note,
        },
        id,
        saveContact,
      );
      if (!result.ok) {
        toast.show({ title: result.error, tone: "error" });
        return;
      }
      toast.show({ title: id ? "Uloženo" : "Faktura je vystavená" });
      router.push(`/faktury/${result.data.id}`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-sm sm:p-6">
          <h2 className="text-callout font-semibold">Odběratel</h2>
          {contacts.length > 0 ? (
            <Field label="Z kontaktů">
              <select
                value={contactId}
                onChange={(event) => pickContact(event.target.value)}
                className={selectClass}
              >
                <option value="">Nový odběratel…</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                    {contact.ico ? ` (${contact.ico})` : ""}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <TextField
              label="IČO"
              value={customer.ico ?? ""}
              onChange={(event) => setParty("ico", event.target.value)}
              inputMode="numeric"
              maxLength={20}
            />
            <Button
              onClick={fillFromAres}
              loading={ares.pending}
              disabled={!/^\d{6,8}$/.test((customer.ico ?? "").replace(/\s/g, ""))}
              className="h-11"
            >
              <Search size={15} aria-hidden="true" />
              Načíst z ARES
            </Button>
          </div>
          <TextField
            label="Název / jméno"
            value={customer.name}
            onChange={(event) => setParty("name", event.target.value)}
            required
            maxLength={200}
          />
          <TextField
            label="Ulice a číslo"
            value={customer.street ?? ""}
            onChange={(event) => setParty("street", event.target.value)}
            maxLength={200}
          />
          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <TextField
              label="Město"
              value={customer.city ?? ""}
              onChange={(event) => setParty("city", event.target.value)}
              maxLength={100}
            />
            <TextField
              label="PSČ"
              value={customer.zip ?? ""}
              onChange={(event) => setParty("zip", event.target.value)}
              maxLength={20}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="DIČ"
              value={customer.dic ?? ""}
              onChange={(event) => setParty("dic", event.target.value)}
              maxLength={20}
            />
            <TextField
              label="E-mail"
              type="email"
              value={customer.email ?? ""}
              onChange={(event) => setParty("email", event.target.value)}
              maxLength={200}
            />
          </div>
          {!contactId ? (
            <label className="flex items-center gap-2.5 text-body">
              <input
                type="checkbox"
                checked={saveContact}
                onChange={(event) => setSaveContact(event.target.checked)}
                className="size-4 accent-[var(--ink)]"
              />
              Uložit do kontaktů
            </label>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-sm sm:p-6">
          <h2 className="text-callout font-semibold">Faktura</h2>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Číslo faktury"
              value={number}
              onChange={(event) => changeNumber(event.target.value)}
              required
              maxLength={50}
              className="tabular"
            />
            <TextField
              label="Variabilní symbol"
              value={variableSymbol}
              onChange={(event) => {
                setVariableSymbol(event.target.value.replace(/\D/g, "").slice(0, 10));
                setVsTouched(true);
              }}
              inputMode="numeric"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Datum vystavení"
              type="date"
              value={issuedOn}
              onChange={(event) => changeIssued(event.target.value)}
              required
            />
            <TextField
              label="Splatnost"
              type="date"
              value={dueOn}
              onChange={(event) => setDueOn(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setDueOn(addDays(issuedOn, days))}
                aria-pressed={dueOn === addDays(issuedOn, days)}
                className="rounded-full bg-surface-muted px-3 py-1 text-caption font-medium text-text-secondary aria-pressed:bg-ink aria-pressed:text-text-inverse"
              >
                {days} dní
              </button>
            ))}
          </div>
          {vatPayer ? (
            <TextField
              label="Datum zdanitelného plnění"
              type="date"
              value={taxableOn}
              onChange={(event) => setTaxableOn(event.target.value)}
            />
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Měna">
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
                className={selectClass}
              >
                {[...new Set([...CURRENCIES, currency])].map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </Field>
            {currency !== "CZK" ? (
              <TextField
                label={`Kurz (Kč za 1 ${currency})`}
                value={rate}
                onChange={(event) => setRate(event.target.value)}
                inputMode="decimal"
              />
            ) : null}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl bg-surface p-5 shadow-sm sm:p-6">
        <h2 className="text-callout font-semibold">Položky</h2>
        <div className="flex flex-col gap-3">
          {lines.map((line, index) => {
            const lineTotal = lineTotals(items[index]).total;
            return (
              <div
                key={line.key}
                className="grid grid-cols-[1fr_auto] gap-2 border-b border-border pb-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_80px_80px_120px_auto_120px_auto] sm:items-end sm:border-b-0 sm:pb-0"
              >
                <TextField
                  label="Popis"
                  hideLabel={index > 0}
                  className="col-span-2 sm:col-span-1"
                  value={line.description}
                  onChange={(event) => updateLine(line.key, "description", event.target.value)}
                  placeholder="Natáčení, střih, color grading…"
                  maxLength={500}
                />
                <div className="col-span-2 grid grid-cols-3 gap-2 sm:contents">
                  <TextField
                    label="Počet"
                    hideLabel={index > 0}
                    value={line.quantity}
                    onChange={(event) => updateLine(line.key, "quantity", event.target.value)}
                    inputMode="decimal"
                  />
                  <TextField
                    label="Jednotka"
                    hideLabel={index > 0}
                    value={line.unit}
                    onChange={(event) => updateLine(line.key, "unit", event.target.value)}
                    placeholder="ks"
                    maxLength={20}
                  />
                  <TextField
                    label="Cena za jednotku"
                    hideLabel={index > 0}
                    value={line.unit_price}
                    onChange={(event) => updateLine(line.key, "unit_price", event.target.value)}
                    inputMode="decimal"
                    placeholder="0"
                  />
                </div>
                {vatPayer ? (
                  <Field label={index > 0 ? "" : "DPH %"}>
                    <select
                      value={line.vat_rate}
                      onChange={(event) => updateLine(line.key, "vat_rate", event.target.value)}
                      className={selectClass}
                      aria-label="DPH %"
                    >
                      {["21", "12", "0"].map((value) => (
                        <option key={value} value={value}>
                          {value} %
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <span className="hidden sm:block" />
                )}
                <span className="flex h-11 items-center justify-start font-medium tabular sm:justify-end">
                  {formatMoney(lineTotal, currency)}
                </span>
                <IconButton
                  label="Odebrat položku"
                  onClick={() =>
                    setLines((current) =>
                      current.length > 1
                        ? current.filter((item) => item.key !== line.key)
                        : current,
                    )
                  }
                  disabled={lines.length === 1}
                  className="self-center"
                >
                  <Trash2 size={16} />
                </IconButton>
              </div>
            );
          })}
        </div>
        <div>
          <Button
            variant="ghost"
            onClick={() =>
              setLines((current) => [
                ...current,
                {
                  key: Math.max(...current.map((line) => line.key)) + 1,
                  description: "",
                  quantity: "1",
                  unit: "",
                  unit_price: "",
                  vat_rate: vatPayer ? "21" : "0",
                },
              ])
            }
          >
            <Plus size={16} aria-hidden="true" />
            Přidat položku
          </Button>
        </div>
        <dl className="ml-auto grid min-w-64 grid-cols-[1fr_auto] gap-x-6 gap-y-1 border-t border-border pt-3 text-body">
          {vatPayer ? (
            <>
              <dt className="text-text-secondary">Základ</dt>
              <dd className="text-right tabular">{formatMoney(totals.subtotal, currency)}</dd>
              <dt className="text-text-secondary">DPH</dt>
              <dd className="text-right tabular">{formatMoney(totals.vat, currency)}</dd>
            </>
          ) : null}
          <dt className="text-callout font-semibold">Celkem</dt>
          <dd className="text-right text-title font-semibold tabular">
            {formatMoney(totals.total, currency)}
          </dd>
        </dl>
      </section>

      <section className="rounded-xl bg-surface p-5 shadow-sm sm:p-6">
        <TextArea
          label="Poznámka na faktuře"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          maxLength={2000}
        />
      </section>

      <div className="sticky bottom-20 z-20 flex justify-end gap-2 md:bottom-4">
        <Button variant="secondary" size="lg" onClick={() => router.back()} className="shadow-md">
          Zrušit
        </Button>
        <Button type="submit" variant="primary" size="lg" loading={pending} className="shadow-md">
          {id ? "Uložit změny" : "Vystavit fakturu"}
        </Button>
      </div>
    </form>
  );
}
