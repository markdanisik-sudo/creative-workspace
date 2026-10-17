"use client";

import { Camera, Clapperboard, Layers, Plus } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Input";
import { ModulePicker } from "@/features/workspace/ModulePicker";
import {
  customDefaults,
  customModuleChoices,
  MEDIA,
  templatesFor,
  type Medium,
  type PlanModuleId,
  type TemplateId,
} from "@/features/workspace/plan";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { createProject, type CreateProjectState } from "./actions";

const MEDIUM_ICON = { video: Clapperboard, photo: Camera, both: Layers } as const;

function NewProjectForm({ onCancel, askClient }: { onCancel: () => void; askClient: boolean }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<CreateProjectState, FormData>(createProject, {});
  const [step, setStep] = useState<1 | 2>(1);
  const [medium, setMedium] = useState<Medium>("video");
  const [template, setTemplate] = useState<TemplateId>("custom");
  const [custom, setCustom] = useState<PlanModuleId[]>(customDefaults("video"));
  const templates = templatesFor(medium);

  const pickMedium = (next: Medium) => {
    setMedium(next);
    setTemplate(templatesFor(next)[0]?.id ?? "custom");
    setCustom(customDefaults(next));
  };

  return (
    <form
      action={action}
      // Enter on the first step moves on to choosing the template.
      onSubmit={(event) => {
        if (step === 1) {
          event.preventDefault();
          setStep(2);
        }
      }}
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="medium" value={medium} />
      <input type="hidden" name="planTemplate" value={template} />

      {/* Step 1 stays mounted so its fields are submitted with step 2. */}
      <div className={cn("flex flex-col gap-5", step !== 1 && "hidden")}>
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
        <div className="flex flex-col gap-2">
          <span className="text-caption font-medium text-text-secondary">
            {t("boxes.mediumLabel")}
          </span>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {MEDIA.map((option) => {
              const Icon = MEDIUM_ICON[option];
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={medium === option}
                  onClick={() => pickMedium(option)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-[16px] px-2 py-4 text-body font-semibold transition-colors",
                    medium === option
                      ? "bg-ink text-text-inverse"
                      : "bg-surface-muted text-text hover:bg-surface-pressed",
                  )}
                >
                  <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                  {t(`boxes.media.${option}`)}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={() => setStep(2)}>
            {t("boxes.next")}
          </Button>
        </div>
      </div>

      {step === 2 ? (
        <div className="flex flex-col gap-5">
          <span className="text-caption font-medium text-text-secondary">
            {t("boxes.templateLabel")}
          </span>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
            {[...templates.map((item) => item.id), "custom" as const].map((id) => {
              const definition = templates.find((item) => item.id === id);
              const selected = template === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTemplate(id)}
                  className={cn(
                    "flex flex-col gap-2 rounded-[18px] p-4 text-left transition-[background-color,box-shadow]",
                    selected
                      ? "bg-surface-muted shadow-[0_0_0_2px_var(--text)]"
                      : "bg-surface-muted hover:bg-surface-pressed",
                  )}
                >
                  <span className="text-callout font-semibold">
                    {t(`boxes.templates.${id}.name`)}
                  </span>
                  <span className="text-caption text-text-secondary">
                    {t(`boxes.templates.${id}.body`)}
                  </span>
                  {definition ? (
                    <span className="flex flex-wrap gap-1 pt-1">
                      {definition.modules.map((module) => (
                        <span
                          key={module}
                          className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-text-secondary"
                        >
                          {t(`workspace.modules.${module}`)}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {template === "custom" ? (
            <div className="flex flex-col gap-2">
              <span className="text-caption font-medium text-text-secondary">
                {t("boxes.customPick")}
              </span>
              <ModulePicker
                choices={customModuleChoices(medium)}
                value={custom}
                onChange={setCustom}
                name="modules"
              />
            </div>
          ) : null}
          {state.error ? (
            <p role="alert" className="text-body text-danger">
              {state.error}
            </p>
          ) : null}
          <div className="flex justify-between gap-2">
            <Button variant="ghost" onClick={() => setStep(1)}>
              {t("boxes.back")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={pending}
              disabled={template === "custom" && custom.length === 0}
            >
              {t("boxes.create")}
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}

export function NewProjectButton({
  variant = "primary",
  label,
  compact = false,
  askClient = true,
  size = "md",
}: {
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
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
        size={size}
        variant={variant}
        onClick={() => setOpen(true)}
        aria-label={text}
        className={
          compact
            ? size === "sm"
              ? "max-sm:w-8 max-sm:px-0"
              : "max-sm:w-9 max-sm:px-0"
            : undefined
        }
      >
        <Plus size={16} strokeWidth={2.25} aria-hidden="true" />
        <span className={compact ? "max-sm:sr-only" : undefined}>{text}</span>
      </Button>
      <NewProjectDialog open={open} onClose={() => setOpen(false)} askClient={askClient} />
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
    <Dialog
      open={open}
      onClose={onClose}
      title={t("project.newProjectTitle")}
      className="max-w-[640px]"
    >
      <NewProjectForm onCancel={onClose} askClient={askClient} />
    </Dialog>
  );
}
