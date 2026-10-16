"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Visually hide the title (it is still announced). */
  hideTitle?: boolean;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Modal built on the native <dialog> element, which provides focus trapping,
 * Escape to close and an inert background for free.
 */
export function Dialog({
  open,
  onClose,
  title,
  hideTitle = false,
  description,
  children,
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the <dialog> element itself.
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-32px)] max-w-[440px] rounded-xl bg-surface p-0 text-text shadow-lg",
        "backdrop:bg-overlay open:animate-sheet-in backdrop:animate-fade-in",
        className,
      )}
    >
      {open ? (
        <div className="flex flex-col gap-6 p-7">
          <header className={cn("flex flex-col gap-1", hideTitle && "sr-only")}>
            <h2 id="dialog-title" className="text-headline font-medium">
              {title}
            </h2>
            {description ? <p className="text-body text-text-secondary">{description}</p> : null}
          </header>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
