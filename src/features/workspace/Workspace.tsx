"use client";

import { ArrowUpRight, ChevronLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { isModuleId, type ModuleId } from "./types";

export interface WorkspaceModule {
  id: ModuleId;
  title: string;
  blurb: string;
  /** What the box shows on the overview. */
  preview: ReactNode;
  /** The full tool, shown when the box is zoomed in. */
  content: ReactNode;
  /** Grid placement on large screens. */
  className: string;
  /** Previews that fill the box edge to edge (e.g. image collages). */
  bleed?: boolean;
}

const QUERY_KEY = "m";

function moduleFromLocation(): ModuleId | null {
  const value = new URLSearchParams(window.location.search).get(QUERY_KEY);
  return isModuleId(value) ? value : null;
}

/** Runs a DOM update as a View Transition when the browser supports it. */
function withTransition(update: () => void) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = (document as Document & { startViewTransition?: (cb: () => void) => unknown })
    .startViewTransition;
  if (!start || reduce) {
    update();
    return;
  }
  start.call(document, () => flushSync(update));
}

function Index({ value }: { value: number }) {
  return (
    <span aria-hidden="true" className="tabular-nums">
      ({String(value).padStart(2, "0")})
    </span>
  );
}

/**
 * The project's overview as a bento grid of boxes. Clicking a box zooms it to
 * the full tool on the same page (?m=<id>, so links and the back button work);
 * the back button, Esc or browser back zooms out again.
 */
export function Workspace({
  modules,
  extras,
  initialOpen,
}: {
  modules: WorkspaceModule[];
  /** Small link boxes after the modules (dates, add-ons, discussion). */
  extras?: ReactNode;
  initialOpen: ModuleId | null;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState<ModuleId | null>(initialOpen);
  const panelRef = useRef<HTMLElement>(null);
  const pushed = useRef(false);

  const scrollToPanel = () => {
    const panel = panelRef.current;
    if (!panel) return;
    const top = panel.getBoundingClientRect().top + window.scrollY - 96;
    if (Math.abs(window.scrollY - top) > 4) window.scrollTo({ top: Math.max(0, top) });
  };

  const zoomIn = useCallback((id: ModuleId) => {
    withTransition(() => {
      setOpen(id);
      const url = new URL(window.location.href);
      url.searchParams.set(QUERY_KEY, id);
      window.history.pushState(null, "", url);
      pushed.current = true;
    });
    requestAnimationFrame(scrollToPanel);
  }, []);

  const zoomOut = useCallback(() => {
    // Opened from the overview: step back in history so Back doesn't reopen it.
    if (pushed.current) {
      window.history.back();
      return;
    }
    withTransition(() => {
      setOpen(null);
      const url = new URL(window.location.href);
      url.searchParams.delete(QUERY_KEY);
      window.history.replaceState(null, "", url);
    });
  }, []);

  // Browser back/forward between overview and a box.
  useEffect(() => {
    const onPop = () => {
      const next = moduleFromLocation();
      pushed.current = false;
      withTransition(() => setOpen(next));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Esc zooms out, unless a dialog or sheet inside the tool has it.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector("dialog[open], [data-sheet-open]")) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true]")) {
        target.blur();
        return;
      }
      zoomOut();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, zoomOut]);

  const active = modules.find((module) => module.id === open);
  const activeIndex = active ? modules.indexOf(active) + 1 : 0;

  if (active) {
    return (
      <section
        ref={panelRef}
        aria-label={active.title}
        style={{ viewTransitionName: `ws-${active.id}` }}
        className="flex min-h-[70vh] flex-col rounded-[28px] bg-surface p-4 shadow-sm sm:p-8"
      >
        <header className="mb-6 flex items-center justify-between gap-4 sm:mb-8">
          <button
            type="button"
            onClick={zoomOut}
            title={t("workspace.backHint")}
            className="-ml-1 inline-flex h-9 items-center gap-1 rounded-full bg-surface-muted pr-4 pl-2.5 text-body font-medium transition-colors hover:bg-surface-pressed"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            {t("workspace.backToOverview")}
          </button>
          <div className="flex items-baseline gap-3 text-caption text-text-secondary">
            <span className="font-medium text-text">
              <span aria-hidden="true">/</span>
              {active.title}
            </span>
            <Index value={activeIndex} />
          </div>
        </header>
        <div className="flex-1">{active.content}</div>
      </section>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:auto-rows-[188px] lg:grid-cols-12">
      {modules.map((module, index) => (
        <button
          key={module.id}
          type="button"
          onClick={() => zoomIn(module.id)}
          aria-label={t("workspace.open", { name: module.title })}
          style={{ viewTransitionName: `ws-${module.id}` }}
          className={cn(
            "group relative flex min-h-[260px] flex-col overflow-hidden rounded-[24px] bg-surface text-left shadow-sm",
            "transition-[box-shadow,transform] duration-300 ease-out hover:shadow-md active:scale-[0.995]",
            "focus-visible:outline-offset-4 lg:min-h-0",
            module.className,
          )}
        >
          <div
            className={cn(
              "relative z-10 flex items-baseline justify-between p-5 pb-0 text-caption sm:p-6 sm:pb-0",
              module.bleed && "text-white [text-shadow:0_1px_8px_rgb(0_0_0/0.35)]",
            )}
          >
            <span className="font-medium">
              <span aria-hidden="true">/</span>
              {module.title}
            </span>
            <span className="flex items-center gap-2 opacity-60">
              <ArrowUpRight
                size={14}
                aria-hidden="true"
                className="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              />
              <Index value={index + 1} />
            </span>
          </div>
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col",
              module.bleed ? "absolute inset-0" : "p-5 pt-4 sm:p-6 sm:pt-4",
            )}
          >
            {module.preview}
          </div>
        </button>
      ))}
      {extras}
    </div>
  );
}
