"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { useI18n } from "@/lib/i18n/client";
import { updateProjectDetails } from "./actions";
import type { ProjectDetails } from "./types";

export function ProjectDetailsButton({ project }: { project: ProjectDetails }) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    const result = await updateProjectDetails(project.id, {
      name: String(form.get("name") ?? ""),
      clientName: String(form.get("client") ?? ""),
      description: String(form.get("description") ?? ""),
    });
    setPending(false);
    if (!result.ok) return setError(result.error);
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        {t("hub.editDetails")}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t("hub.detailsTitle")}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <TextField
            label={t("project.projectName")}
            name="name"
            defaultValue={project.name}
            maxLength={120}
            required
          />
          <TextField
            label={t("hub.client")}
            name="client"
            defaultValue={project.clientName ?? ""}
            maxLength={120}
          />
          <TextArea
            label={t("hub.description")}
            name="description"
            defaultValue={project.description ?? ""}
            maxLength={2000}
            rows={4}
          />
          {error ? <p className="text-body text-danger">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={pending}>
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
