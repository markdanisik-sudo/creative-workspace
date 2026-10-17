import { Check, CircleCheck } from "lucide-react";
import { PHASES, type Phase } from "@/features/projects/types";
import type { Translator } from "@/lib/i18n";
import { cn } from "@/lib/cn";

export type PhaseProgress = Record<Phase, { done: number; total: number }>;

/** Every checklist item of every phase ticked off. */
export function isProjectFinished(progress: PhaseProgress): boolean {
  const phases = PHASES.map((phase) => progress[phase]);
  return (
    phases.some((phase) => phase.total > 0) && phases.every((phase) => phase.done === phase.total)
  );
}

/**
 * The five production phases as a progress track. Each segment fills as its
 * checklist is ticked off on the overview; a finished phase gets a check.
 */
export function PhaseStepper({
  phase,
  progress,
  t,
}: {
  phase: Phase;
  progress: PhaseProgress;
  t: Translator["t"];
}) {
  const current = PHASES.indexOf(phase);
  const finished = isProjectFinished(progress);
  return (
    <div>
      {finished ? (
        <p className="mb-3 flex items-center gap-2 text-callout font-semibold text-success">
          <CircleCheck size={18} strokeWidth={2.25} aria-hidden="true" />
          {t("overview.projectComplete")}
        </p>
      ) : null}
      <ol aria-label={t("hub.phaseLabel")} className="grid grid-cols-5 gap-1.5">
        {PHASES.map((step, index) => {
          const { done, total } = progress[step];
          const complete = total > 0 && done === total;
          const ratio = total > 0 ? done / total : 0;
          const isCurrent = index === current && !complete;
          return (
            <li key={step} className="min-w-0" aria-current={isCurrent ? "step" : undefined}>
              <div className="flex flex-col items-start">
                <span className="relative h-1 w-full overflow-hidden rounded-full bg-border-strong">
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full transition-[width,background-color] duration-500 ease-out",
                      finished ? "bg-success" : "bg-text",
                    )}
                    style={{ width: `${complete ? 100 : ratio * 100}%` }}
                  />
                </span>
                <span className="flex max-w-full min-w-0 items-center gap-1.5 pt-2.5 max-sm:hidden">
                  <span
                    className={cn(
                      "truncate text-caption",
                      isCurrent || complete ? "font-semibold text-text" : "text-text-secondary",
                    )}
                  >
                    {t(`phases.${step}`)}
                  </span>
                  {complete ? (
                    <Check
                      size={12}
                      className={cn("shrink-0", finished ? "text-success" : "text-text")}
                      aria-label={t("overview.phaseDone")}
                    />
                  ) : total > 0 ? (
                    <span className="text-[11px] text-text-tertiary tabular-nums">
                      {done}/{total}
                    </span>
                  ) : null}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      {/* Five labels don't fit a phone; show the current one under the track. */}
      {finished ? null : (
        <p className="pt-2.5 text-caption sm:hidden" aria-hidden="true">
          <span className="font-semibold">{t(`phases.${phase}`)}</span>
          <span className="text-text-secondary">{` · ${current + 1}/${PHASES.length}`}</span>
        </p>
      )}
    </div>
  );
}
