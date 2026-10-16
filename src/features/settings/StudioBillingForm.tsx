"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/Toast";
import { saveStudioBilling } from "@/features/budget/actions";
import type { StudioBilling } from "@/features/budget/types";
import { useI18n } from "@/lib/i18n/client";

/** The studio's details printed on every invoice and used for QR payments. */
export function StudioBillingForm({ billing }: { billing: StudioBilling }) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [vatPayer, setVatPayer] = useState(billing.vatPayer);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (name: string) => String(form.get(name) ?? "");
    setPending(true);
    const result = await saveStudioBilling({
      name: get("name"),
      address: get("address"),
      ico: get("ico"),
      dic: get("dic"),
      iban: get("iban"),
      bankAccount: get("bankAccount"),
      email: get("email"),
      phone: get("phone"),
      vatPayer,
      vatRate: get("vatRate"),
      dueDays: get("dueDays"),
      invoiceNote: get("invoiceNote"),
    });
    setPending(false);
    if (!result.ok) return toast.show({ title: result.error, tone: "error" });
    toast.show({ title: t("common.saved") });
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-body text-text-secondary">{t("billing.body")}</p>
      <TextField
        label={t("billing.name")}
        name="name"
        defaultValue={billing.name}
        maxLength={200}
      />
      <TextArea
        label={t("billing.address")}
        name="address"
        defaultValue={billing.address ?? ""}
        rows={2}
        maxLength={500}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label={t("billing.ico")}
          name="ico"
          defaultValue={billing.ico ?? ""}
          maxLength={20}
        />
        <TextField
          label={t("billing.dic")}
          name="dic"
          defaultValue={billing.dic ?? ""}
          maxLength={20}
        />
      </div>
      <TextField
        label={t("billing.iban")}
        name="iban"
        defaultValue={billing.iban ?? ""}
        maxLength={40}
        autoComplete="off"
      />
      <div className="flex flex-col gap-1">
        <TextField
          label={t("billing.bankAccount")}
          name="bankAccount"
          defaultValue={billing.bankAccount ?? ""}
          maxLength={40}
          autoComplete="off"
        />
        <span className="text-caption text-text-tertiary">{t("billing.bankAccountHint")}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label={t("billing.email")}
          name="email"
          type="email"
          defaultValue={billing.email ?? ""}
          maxLength={200}
        />
        <TextField
          label={t("billing.phone")}
          name="phone"
          defaultValue={billing.phone ?? ""}
          maxLength={50}
        />
      </div>
      <label className="flex items-center gap-2.5 text-body">
        <input
          type="checkbox"
          checked={vatPayer}
          onChange={(event) => setVatPayer(event.target.checked)}
          className="size-4 accent-[var(--ink)]"
        />
        {t("billing.vatPayer")}
      </label>
      <div className="grid grid-cols-2 gap-3">
        {vatPayer ? (
          <TextField
            label={t("billing.vatRate")}
            name="vatRate"
            inputMode="decimal"
            defaultValue={String(billing.vatRate)}
          />
        ) : (
          <input type="hidden" name="vatRate" value={String(billing.vatRate)} />
        )}
        <TextField
          label={t("billing.dueDays")}
          name="dueDays"
          inputMode="numeric"
          defaultValue={String(billing.dueDays)}
        />
      </div>
      <TextArea
        label={t("billing.invoiceNote")}
        name="invoiceNote"
        defaultValue={billing.invoiceNote ?? ""}
        rows={2}
        maxLength={1000}
      />
      <div>
        <Button type="submit" variant="primary" loading={pending}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
