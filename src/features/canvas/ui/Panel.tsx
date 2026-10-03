import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Floating surface for canvas controls. */
export const Panel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Panel(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "pointer-events-auto flex items-center gap-0.5 rounded-xl bg-surface/95 p-1 shadow-md backdrop-blur-xl",
        className,
      )}
      {...props}
    />
  );
});

export function PanelDivider() {
  return <div aria-hidden="true" className="mx-1 h-5 w-px bg-border" />;
}
