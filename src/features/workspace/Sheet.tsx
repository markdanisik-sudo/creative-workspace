"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "@/lib/i18n/client";

/**
 * A panel that slides in from the right (from the bottom on phones) over the
 * workspace. Esc and the backdrop close it; the workspace's own Esc waits.
 */
export function Sheet({
  title,
  onClose,
  actions,
  children,
}: {
  title: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.querySelector("dialog[open]")) return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [onClose]);

  // Portalled: the zoomed workspace panel is its own stacking context
  // (view-transition-name), which would trap the sheet under the app's bars.
  return createPortal(
    <div data-sheet-open className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label={t("moodboard.close")}
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/25 backdrop-blur-[2px]"
      />
      <section
        role="dialog"
        aria-modal="true"
        className="absolute inset-x-0 bottom-0 flex max-h-[90dvh] animate-sheet-in flex-col rounded-t-[26px] bg-surface shadow-lg sm:inset-y-3 sm:right-3 sm:left-auto sm:max-h-none sm:w-[460px] sm:rounded-[26px]"
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="min-w-0 truncate text-title font-semibold">{title}</h2>
          <div className="flex shrink-0 items-center gap-1">
            {actions}
            <button
              type="button"
              onClick={onClose}
              aria-label={t("moodboard.close")}
              className="flex size-8 items-center justify-center rounded-full bg-surface-muted text-text-secondary hover:text-text"
            >
              <X size={15} />
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-[max(20px,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </section>
    </div>,
    document.body,
  );
}
