"use client";

import { useState, type FormEvent } from "react";
import { useEditor } from "tldraw";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Input";
import { addLink } from "./actions";

export function LinkDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const editor = useEditor();
  const [error, setError] = useState<string>();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("url") ?? "");
    if (addLink(editor, value)) {
      setError(undefined);
      onClose();
    } else {
      setError("That doesn't look like a web address.");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a link"
      description="Tip: you can also paste a link anywhere on the board."
    >
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <TextField
          label="Link"
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
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Add
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
