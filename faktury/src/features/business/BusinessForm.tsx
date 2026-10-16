"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/Toast";
import { useAres } from "@/features/contacts/useAres";
import { SecretField } from "@/features/security/SecretField";
import { saveBusiness } from "./actions";
import type { Business } from "./queries";

/** Your details, printed on every invoice. */
export function BusinessForm({ business }: { business: Business }) {
  const router = useRouter();
  const toast = useToast();
  const ares = useAres();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState(business);
  const set = (field: keyof Business, value: string | boolean) =>
    setValues((current) => ({ ...current, [field]: value }));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveBusiness({
        ...values,
        bank_account: String(form.get("bank_account") ?? ""),
        iban: String(form.get("iban") ?? ""),
      });
      if (!result.ok) return toast.show({ title: result.error, tone: "error" });
      toast.show({ title: "Uloženo" });
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <TextField
          label="IČO"
          value={values.ico ?? ""}
          onChange={(event) => set("ico", event.target.value)}
          inputMode="numeric"
          maxLength={20}
        />
        <Button
          className="h-11"
          loading={ares.pending}
          disabled={!/^\d{6,8}$/.test((values.ico ?? "").replace(/\s/g, ""))}
          onClick={async () => {
            const found = await ares.lookup(values.ico ?? "");
            if (found)
              setValues((current) => ({ ...current, ...found, name: found.name || current.name }));
          }}
        >
          <Search size={15} aria-hidden="true" />
          Načíst z ARES
        </Button>
      </div>
      <TextField
        label="Jméno / název firmy"
        value={values.name}
        onChange={(event) => set("name", event.target.value)}
        required
        maxLength={200}
      />
      <TextField
        label="Ulice a číslo"
        value={values.street ?? ""}
        onChange={(event) => set("street", event.target.value)}
        maxLength={200}
      />
      <div className="grid grid-cols-[2fr_1fr] gap-3">
        <TextField
          label="Město"
          value={values.city ?? ""}
          onChange={(event) => set("city", event.target.value)}
          maxLength={100}
        />
        <TextField
          label="PSČ"
          value={values.zip ?? ""}
          onChange={(event) => set("zip", event.target.value)}
          maxLength={20}
        />
      </div>
      <TextField
        label="DIČ (nepovinné)"
        value={values.dic ?? ""}
        onChange={(event) => set("dic", event.target.value)}
        maxLength={20}
      />
      <TextField
        label="Zápis v rejstříku"
        value={values.registry ?? ""}
        onChange={(event) => set("registry", event.target.value)}
        placeholder="Fyzická osoba zapsaná v živnostenském rejstříku"
        maxLength={300}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <SecretField
          label="Číslo účtu"
          name="bank_account"
          defaultValue={business.bank_account ?? ""}
          maxLength={40}
        />
        <SecretField
          label="IBAN (nepovinné)"
          name="iban"
          defaultValue={business.iban ?? ""}
          maxLength={40}
        />
      </div>
      <p className="-mt-2 text-caption text-text-tertiary">
        Ve tvaru 123456789/0100. Z čísla účtu se sám spočítá IBAN pro QR platbu.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField
          label="E-mail"
          type="email"
          value={values.email ?? ""}
          onChange={(event) => set("email", event.target.value)}
          maxLength={200}
        />
        <TextField
          label="Telefon"
          value={values.phone ?? ""}
          onChange={(event) => set("phone", event.target.value)}
          maxLength={50}
        />
        <TextField
          label="Web"
          value={values.web ?? ""}
          onChange={(event) => set("web", event.target.value)}
          maxLength={200}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Splatnost (dní)"
          value={String(values.due_days)}
          onChange={(event) => set("due_days", event.target.value)}
          inputMode="numeric"
        />
      </div>
      <label className="flex items-center gap-2.5 text-body">
        <input
          type="checkbox"
          checked={values.vat_payer}
          onChange={(event) => set("vat_payer", event.target.checked)}
          className="size-4 accent-[var(--ink)]"
        />
        Jsem plátce DPH
      </label>
      <TextArea
        label="Text na každou fakturu (nepovinné)"
        value={values.invoice_note ?? ""}
        onChange={(event) => set("invoice_note", event.target.value)}
        rows={2}
        maxLength={1000}
      />
      <div>
        <Button type="submit" variant="primary" loading={pending}>
          Uložit
        </Button>
      </div>
    </form>
  );
}
