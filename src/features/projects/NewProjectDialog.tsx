"use client";

import { Plus } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Input";
import { createProject, type CreateProjectState } from "./actions";

function NewProjectForm({ onCancel }: { onCancel: () => void }) {
  const [state, action, pending] = useActionState<CreateProjectState, FormData>(createProject, {});
  return (
    <form action={action} className="flex flex-col gap-5">
      <TextField
        label="Project name"
        name="name"
        placeholder="Untitled Project"
        autoFocus
        autoComplete="off"
        maxLength={120}
        error={state.error}
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={pending}>
          Create
        </Button>
      </div>
    </form>
  );
}

export function NewProjectButton({
  variant = "primary",
  label = "New Project",
  compact = false,
}: {
  variant?: "primary" | "secondary";
  label?: string;
  /** Icon-only on small screens. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant={variant}
        onClick={() => setOpen(true)}
        aria-label={label}
        className={compact ? "max-sm:w-9 max-sm:px-0" : undefined}
      >
        <Plus size={16} strokeWidth={2.25} aria-hidden="true" />
        <span className={compact ? "max-sm:sr-only" : undefined}>{label}</span>
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="New project">
        <NewProjectForm onCancel={() => setOpen(false)} />
      </Dialog>
    </>
  );
}
