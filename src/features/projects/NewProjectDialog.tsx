"use client";

import { Plus } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Input";
import { useI18n } from "@/lib/i18n/client";
import { createProject, type CreateProjectState } from "./actions";

function NewProjectForm({ onCancel, askClient }: { onCancel: () => void; askClient: boolean }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<CreateProjectState, FormData>(createProject, {});
  return (
    <form action={action} className="flex flex-col gap-5">
      <TextField
        label={t("project.projectName")}
        name="name"
        placeholder={t("project.untitled")}
        autoFocus
        autoComplete="off"
        maxLength={120}
        error={state.error}
      />
      {askClient ? (
        <TextField
          label={t("project.clientName")}
          name="client"
          placeholder={t("auth.optional")}
          autoComplete="organization"
          maxLength={120}
        />
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" variant="primary" loading={pending}>
          {t("common.create")}
        </Button>
      </div>
    </form>
  );
}

export function NewProjectButton({
  variant = "primary",
  label,
  compact = false,
  askClient = true,
}: {
  variant?: "primary" | "secondary";
  label?: string;
  /** Icon-only on small screens. */
  compact?: boolean;
  /** The studio names the client; a client starting a project doesn't. */
  askClient?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const text = label ?? t("nav.newProject");
  return (
    <>
      <Button
        variant={variant}
        onClick={() => setOpen(true)}
        aria-label={text}
        className={compact ? "max-sm:w-9 max-sm:px-0" : undefined}
      >
        <Plus size={16} strokeWidth={2.25} aria-hidden="true" />
        <span className={compact ? "max-sm:sr-only" : undefined}>{text}</span>
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t("project.newProjectTitle")}>
        <NewProjectForm onCancel={() => setOpen(false)} askClient={askClient} />
      </Dialog>
    </>
  );
}

/** The new-project dialog on its own, for triggers other than the button. */
export function NewProjectDialog({
  open,
  onClose,
  askClient = true,
}: {
  open: boolean;
  onClose: () => void;
  askClient?: boolean;
}) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onClose={onClose} title={t("project.newProjectTitle")}>
      <NewProjectForm onCancel={onClose} askClient={askClient} />
    </Dialog>
  );
}
