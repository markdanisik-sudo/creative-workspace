import type { Translator } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { PHASES, type Phase } from "./types";

/** Quiet pill with the production phase and a five-step progress dot row. */
export function PhaseBadge({ phase, t, className }: { phase: Phase; t: Translator["t"]; className?: string }) {
  const step = PHASES.indexOf(phase);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-text-secondary",
        className,
      )}
    >
      <span aria-hidden="true" className="flex gap-0.5">
        {PHASES.map((p, index) => (
          <span
            key={p}
            className={cn("size-1.5 rounded-full", index <= step ? "bg-text" : "bg-border-strong")}
          />
        ))}
      </span>
      {t(`phases.${phase}`)}
    </span>
  );
}
