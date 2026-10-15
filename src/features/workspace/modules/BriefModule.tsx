"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { saveBrief } from "../actions";
import { BRIEF_FIELDS, type Brief, type BriefField } from "../types";

const SAVE_DELAY_MS = 800;
/** The first two fields lead the page in larger type. */
const LEAD: BriefField[] = ["goal", "message"];

function AutoTextArea({
  value,
  onChange,
  placeholder,
  lead,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  lead: boolean;
  id: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      id={id}
      value={value}
      rows={lead ? 2 : 3}
      maxLength={5000}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full resize-none bg-transparent outline-none placeholder:text-text-tertiary",
        lead
          ? "text-headline leading-tight font-medium tracking-tight sm:text-[32px]"
          : "text-callout",
      )}
    />
  );
}

/** The brief as a calm document: a few prompts, each a free text field. Saves as you type. */
export function BriefModule({ projectId, brief: initial }: { projectId: string; brief: Brief }) {
  const { t } = useI18n();
  const toast = useToast();
  const [brief, setBrief] = useState<Brief>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(brief);

  const flush = async () => {
    clearTimeout(timer.current);
    setStatus("saving");
    const result = await saveBrief(projectId, latest.current);
    if (!result.ok) {
      setStatus("idle");
      toast.show({ title: result.error, tone: "error" });
      return;
    }
    setStatus("saved");
  };

  const update = (field: BriefField, value: string) => {
    const next = { ...latest.current, [field]: value };
    latest.current = next;
    setBrief(next);
    setStatus("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY_MS);
  };

  // Save anything pending when the box is closed.
  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void saveBrief(projectId, latest.current);
      }
    },
    [projectId],
  );

  const rest = BRIEF_FIELDS.filter((field) => !LEAD.includes(field));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10">
      <p
        aria-live="polite"
        className="-mt-2 flex h-5 items-center gap-1.5 self-end text-caption text-text-tertiary"
      >
        {status === "saving" ? t("workspace.saving") : null}
        {status === "saved" ? (
          <>
            <Check size={13} aria-hidden="true" />
            {t("workspace.saved")}
          </>
        ) : null}
      </p>
      {LEAD.map((field) => (
        <div key={field} className="flex flex-col gap-2">
          <label
            htmlFor={`brief-${field}`}
            className="text-caption font-medium text-text-secondary"
          >
            {t(`brief.fields.${field}`)}
          </label>
          <AutoTextArea
            id={`brief-${field}`}
            lead
            value={brief[field] ?? ""}
            onChange={(value) => update(field, value)}
            placeholder={t(`brief.hints.${field}`)}
          />
        </div>
      ))}
      <div className="grid gap-x-10 gap-y-8 border-t border-border-strong pt-8 sm:grid-cols-2">
        {rest.map((field) => (
          <div key={field} className="flex flex-col gap-2">
            <label
              htmlFor={`brief-${field}`}
              className="text-caption font-medium text-text-secondary"
            >
              {t(`brief.fields.${field}`)}
            </label>
            <AutoTextArea
              id={`brief-${field}`}
              lead={false}
              value={brief[field] ?? ""}
              onChange={(value) => update(field, value)}
              placeholder={t(`brief.hints.${field}`)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
