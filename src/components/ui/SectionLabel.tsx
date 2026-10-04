import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** "/Recent ……… (01)": the small slash label and running number that open a section. */
export function SectionLabel({
  label,
  index,
  aside,
  className,
}: {
  label: string;
  index?: number;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 text-caption", className)}>
      <span className="font-medium">
        <span aria-hidden="true">/</span>
        {label}
      </span>
      <span className="flex items-baseline gap-5 text-text-secondary">
        {aside}
        {index !== undefined ? (
          <span aria-hidden="true" className="tabular-nums">
            ({String(index).padStart(2, "0")})
          </span>
        ) : null}
      </span>
    </div>
  );
}
