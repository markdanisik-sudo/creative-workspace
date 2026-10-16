"use client";

import { Check, Copy, Download, Pencil, Printer, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { deleteInvoice, setInvoicePaid } from "./actions";

const linkClass =
  "inline-flex h-9 items-center gap-1.5 rounded-full bg-surface px-4 text-body font-medium shadow-sm transition-colors hover:bg-surface-muted";

export function InvoiceActions({
  id,
  number,
  paidOn,
  today,
}: {
  id: string;
  number: string;
  paidOn: string | null;
  today: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [paying, setPaying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [date, setDate] = useState(today);

  const run = (
    action: () => Promise<{ ok: boolean; error?: string }>,
    message: string,
    after?: () => void,
  ) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.show({ title: result.error ?? "Něco se nepovedlo.", tone: "error" });
        return;
      }
      toast.show({ title: message });
      after?.();
      router.refresh();
    });

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      {paidOn ? (
        <Button
          variant="secondary"
          className="bg-surface shadow-sm"
          loading={pending}
          onClick={() => run(() => setInvoicePaid(id, null), "Úhrada zrušena")}
        >
          <Undo2 size={16} aria-hidden="true" />
          Zrušit úhradu
        </Button>
      ) : (
        <Button variant="primary" onClick={() => setPaying(true)}>
          <Check size={16} aria-hidden="true" />
          Zaplaceno
        </Button>
      )}
      <Button variant="secondary" className="bg-surface shadow-sm" onClick={() => window.print()}>
        <Printer size={16} aria-hidden="true" />
        PDF / tisk
      </Button>
      <a href={`/faktury/${id}/isdoc`} className={linkClass}>
        <Download size={16} aria-hidden="true" />
        ISDOC
      </a>
      <Link href={`/faktury/${id}/upravit`} className={linkClass}>
        <Pencil size={16} aria-hidden="true" />
        Upravit
      </Link>
      <Link href={`/faktury/nova?z=${id}`} className={linkClass}>
        <Copy size={16} aria-hidden="true" />
        Duplikovat
      </Link>
      <Button variant="danger" onClick={() => setDeleting(true)}>
        <Trash2 size={16} aria-hidden="true" />
        Smazat
      </Button>

      <Dialog
        open={paying}
        onClose={() => setPaying(false)}
        title="Označit jako zaplacenou"
        description={`Faktura ${number}`}
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => setInvoicePaid(id, date),
              "Označeno jako zaplacené",
              () => setPaying(false),
            );
          }}
        >
          <TextField
            label="Datum úhrady"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPaying(false)}>
              Zrušit
            </Button>
            <Button type="submit" variant="primary" loading={pending}>
              Potvrdit
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Smazat fakturu?"
        description={`Faktura ${number} zmizí natrvalo. Vystavené faktury se obvykle nemažou — zvaž raději dobropis.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleting(false)}>
            Zrušit
          </Button>
          <Button
            variant="primary"
            className="bg-danger hover:bg-danger"
            loading={pending}
            onClick={() =>
              run(
                () => deleteInvoice(id),
                "Faktura smazána",
                () => {
                  setDeleting(false);
                  router.push("/faktury");
                },
              )
            }
          >
            Smazat
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
