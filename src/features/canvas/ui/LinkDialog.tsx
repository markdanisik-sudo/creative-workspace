"use client";

import { useState, type FormEvent } from "react";
import { useEditor } from "tldraw";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Input";
import { useI18n } from "@/lib/i18n/client";
import { addLink } from "./actions";

export function LinkDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const editor = useEditor();
  const { t } = useI18n();
  const [error, setError] = useState<string>();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("url") ?? "");
    if (addLink(editor, value)) {
      setError(undefined);
      onClose();
    } else {
      setError(t("canvas.linkInvalid"));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("canvas.linkTitle")}
      description={t("canvas.linkTip")}
    >
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <TextField
          label={t("canvas.link")}
          name="url"
          type="url"
          inputMode="url"
          placeholder="https://"
          autoComplete="off"
          autoFocus
          hideLabel
          error={error}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" variant="primary">
            {t("common.add")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
