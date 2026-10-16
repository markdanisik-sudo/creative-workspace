"use client";

import { FilePlus, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { formatMoney } from "@/lib/format";
import type { Party } from "@/lib/invoice/types";
import { deleteContact, saveContact } from "./actions";
import type { Contact } from "./queries";
import { useAres } from "./useAres";

type Draft = Party & { id: string | null };

export function ContactsView({
  contacts,
  totals,
}: {
  contacts: Contact[];
  totals: Record<string, number>;
}) {
  const router = useRouter();
  const toast = useToast();
  const ares = useAres();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [query, setQuery] = useState("");

  const set = (field: keyof Party, value: string) =>
    setDraft((current) => (current ? { ...current, [field]: value } : current));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    startTransition(async () => {
      const result = await saveContact(draft, draft.id);
      if (!result.ok) return toast.show({ title: result.error, tone: "error" });
      toast.show({ title: "Uloženo" });
      setDraft(null);
      router.refresh();
    });
  };

  const remove = (contact: Contact) => {
    if (!window.confirm(`Smazat kontakt ${contact.name}? Faktury zůstanou.`)) return;
    startTransition(async () => {
      const result = await deleteContact(contact.id);
      if (!result.ok) return toast.show({ title: result.error, tone: "error" });
      router.refresh();
    });
  };

  const needle = query.trim().toLowerCase();
  const shown = contacts.filter(
    (contact) => !needle || `${contact.name} ${contact.ico ?? ""}`.toLowerCase().includes(needle),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-headline font-medium">Kontakty</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-tertiary"
              aria-hidden="true"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Hledat"
              aria-label="Hledat"
              className="h-9 w-44 rounded-full bg-surface pr-4 pl-10 text-body shadow-sm outline-none focus-visible:shadow-[0_0_0_2px_var(--text)]"
            />
          </div>
          <Button variant="primary" onClick={() => setDraft({ id: null, name: "", country: "CZ" })}>
            <Plus size={16} aria-hidden="true" />
            Přidat
          </Button>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl bg-surface p-10 text-center text-body text-text-secondary shadow-sm">
          {contacts.length === 0
            ? "Zatím žádné kontakty. Přibudou samy s fakturami, nebo je přidej."
            : "Nic tomu neodpovídá."}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((contact) => (
            <li
              key={contact.id}
              className="flex flex-col gap-3 rounded-xl bg-surface p-5 shadow-sm"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">{contact.name}</span>
                <span className="truncate text-caption text-text-secondary">
                  {[contact.ico ? `IČO ${contact.ico}` : null, contact.city]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </span>
              </div>
              <span className="text-body text-text-secondary">
                Celkem vyfakturováno{" "}
                <span className="font-medium text-text tabular">
                  {formatMoney(totals[contact.id] ?? 0)}
                </span>
              </span>
              <div className="-ml-2 flex items-center gap-1">
                <Link
                  href={`/faktury/nova?kontakt=${contact.id}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-body font-medium hover:bg-surface-hover"
                >
                  <FilePlus size={15} aria-hidden="true" />
                  Faktura
                </Link>
                <IconButton label="Upravit" size="sm" onClick={() => setDraft({ ...contact })}>
                  <Pencil size={15} />
                </IconButton>
                <IconButton label="Smazat" size="sm" onClick={() => remove(contact)}>
                  <Trash2 size={15} />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Upravit kontakt" : "Nový kontakt"}
      >
        {draft ? (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="grid grid-cols-[1fr_auto] items-end gap-2">
              <TextField
                label="IČO"
                value={draft.ico ?? ""}
                onChange={(event) => set("ico", event.target.value)}
                inputMode="numeric"
                maxLength={20}
              />
              <Button
                className="h-11"
                loading={ares.pending}
                disabled={!/^\d{6,8}$/.test((draft.ico ?? "").replace(/\s/g, ""))}
                onClick={async () => {
                  const found = await ares.lookup(draft.ico ?? "");
                  if (found) setDraft((current) => (current ? { ...current, ...found } : current));
                }}
              >
                ARES
              </Button>
            </div>
            <TextField
              label="Název / jméno"
              value={draft.name}
              onChange={(event) => set("name", event.target.value)}
              required
              maxLength={200}
            />
            <TextField
              label="Ulice a číslo"
              value={draft.street ?? ""}
              onChange={(event) => set("street", event.target.value)}
              maxLength={200}
            />
            <div className="grid grid-cols-[2fr_1fr] gap-3">
              <TextField
                label="Město"
                value={draft.city ?? ""}
                onChange={(event) => set("city", event.target.value)}
                maxLength={100}
              />
              <TextField
                label="PSČ"
                value={draft.zip ?? ""}
                onChange={(event) => set("zip", event.target.value)}
                maxLength={20}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="DIČ"
                value={draft.dic ?? ""}
                onChange={(event) => set("dic", event.target.value)}
                maxLength={20}
              />
              <TextField
                label="Telefon"
                value={draft.phone ?? ""}
                onChange={(event) => set("phone", event.target.value)}
                maxLength={50}
              />
            </div>
            <TextField
              label="E-mail"
              type="email"
              value={draft.email ?? ""}
              onChange={(event) => set("email", event.target.value)}
              maxLength={200}
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDraft(null)}>
                Zrušit
              </Button>
              <Button type="submit" variant="primary" loading={pending}>
                Uložit
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>
    </div>
  );
}
