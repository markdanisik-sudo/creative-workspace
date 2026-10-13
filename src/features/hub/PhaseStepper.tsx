"use client";

import { Check } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { PHASES, type Phase } from "@/features/projects/types";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { setPhase } from "./actions";

/** Five production phases as a calm progress track; the studio clicks to advance. */
export function PhaseStepper({
  projectId,
  phase,
  canEdit,
}: {
  projectId: string;
  phase: Phase;
  canEdit: boolean;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [optimistic, setOptimistic] = useOptimistic(phase);
  const [, startTransition] = useTransition();
  const current = PHASES.indexOf(optimistic);

  const choose = (next: Phase) =>
    startTransition(async () => {
      setOptimistic(next);
      const result = await setPhase(projectId, next);
      if (!result.ok) toast.show({ title: result.error, tone: "error" });
    });

  return (
    <div>
      <ol aria-label={t("hub.phaseLabel")} className="grid grid-cols-5 gap-1.5">
        {PHASES.map((step, index) => {
          const state = index < current ? "done" : index === current ? "current" : "todo";
          const content = (
            <>
              <span
                className={cn(
                  "h-1 w-full rounded-full transition-colors duration-300",
                  state === "todo" ? "bg-border-strong" : "bg-text",
                )}
              />
              <span className="flex min-w-0 max-w-full items-center gap-1.5 pt-2.5 max-sm:hidden">
                <span
                  className={cn(
                    "truncate text-caption transition-colors",
                    state === "current" ? "font-semibold text-text" : "text-text-secondary",
                  )}
                >
                  {t(`phases.${step}`)}
                </span>
                {state === "done" ? (
                  <Check size={12} className="shrink-0 text-text-secondary" aria-hidden="true" />
                ) : null}
              </span>
            </>
          );
          return (
            <li
              key={step}
              className="min-w-0"
              aria-current={state === "current" ? "step" : undefined}
            >
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => step !== optimistic && choose(step)}
                  aria-label={t("hub.setPhase", { phase: t(`phases.${step}`) })}
                  className="flex w-full flex-col items-start rounded-sm text-left outline-offset-4 hover:opacity-80"
                >
                  {content}
                </button>
              ) : (
                <div className="flex flex-col items-start">{content}</div>
              )}
            </li>
          );
        })}
      </ol>
      {/* Five labels don't fit a phone; show the current one under the track. */}
      <p className="pt-2.5 text-caption sm:hidden" aria-hidden="true">
        <span className="font-semibold">{t(`phases.${optimistic}`)}</span>
        <span className="text-text-secondary">{` · ${current + 1}/${PHASES.length}`}</span>
      </p>
    </div>
  );
}
