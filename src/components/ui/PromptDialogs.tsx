"use client";

import { useState, type FormEvent } from "react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { TextField } from "./Input";

interface RenameDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  label: string;
  initialValue: string;
  onSubmit: (value: string) => Promise<string | null>;
}

/** Single-field rename. `onSubmit` resolves to an error message, or null on success. */
export function RenameDialog({
  open,
  onClose,
  title,
  label,
  initialValue,
  onSubmit,
}: RenameDialogProps) {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("value") ?? "");
    setPending(true);
    const result = await onSubmit(value);
    setPending(false);
    if (result) setError(result);
    else onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <TextField
          label={label}
          name="value"
          defaultValue={initialValue}
          autoFocus
          onFocus={(event) => event.currentTarget.select()}
          maxLength={120}
          autoComplete="off"
          error={error}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={pending}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}

/** Reserved for actions that cannot be undone. */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description}>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} autoFocus>
          Cancel
        </Button>
        <Button
          variant="primary"
          className="bg-danger hover:bg-danger hover:opacity-90"
          loading={pending}
          onClick={async () => {
            setPending(true);
            await onConfirm();
            setPending(false);
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
