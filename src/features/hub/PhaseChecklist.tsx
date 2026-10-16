"use client";

import { ArrowUpRight, Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { PHASES, type Phase } from "@/features/projects/types";
import type { ShotCheck } from "@/features/workspace/queries";
import { updateShot } from "@/features/workspace/actions";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { updateTask } from "./actions";
import type { Task } from "./types";

interface Item {
  kind: "task" | "shot";
  id: string;
  label: string;
  detail?: string;
  done: boolean;
}

function CheckRow({ item, onToggle }: { item: Item; onToggle: () => void }) {
  return (
    <li>
      <button
        type="button"
        role="checkbox"
        aria-checked={item.done}
        onClick={onToggle}
        className="group flex w-full items-center gap-4 rounded-[14px] px-3 py-3 text-left transition-colors hover:bg-surface-muted sm:px-4"
      >
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-[background-color,border-color,transform] duration-200 group-active:scale-90",
            item.done ? "border-ink bg-ink text-text-inverse" : "border-border-strong",
          )}
        >
          <Check size={13} strokeWidth={2.5} className={item.done ? "opacity-100" : "opacity-0"} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className={cn(
              "text-callout transition-colors",
              item.done && "text-text-tertiary line-through decoration-1",
            )}
          >
            {item.label}
          </span>
          {item.detail ? (
            <span className="text-caption text-text-tertiary">{item.detail}</span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

/**
 * The overview: one column, phase by phase, with everything that has to
 * happen as a checklist. Ticking the last item of a phase completes it on the
 * phase track above (the database moves the project on).
 */
export function PhaseChecklist({
  projectId,
  tasks: initialTasks,
  shots: initialShots,
  currentPhase,
}: {
  projectId: string;
  tasks: Task[];
  shots: ShotCheck[];
  currentPhase: Phase;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [tasks, setTasks] = useState(initialTasks);
  const [shots, setShots] = useState(initialShots);
  const [synced, setSynced] = useState({ initialTasks, initialShots });
  const [expanded, setExpanded] = useState<Set<Phase>>(new Set());
  const [, startTransition] = useTransition();

  // Server data wins after a refresh (someone else may have ticked things).
  if (synced.initialTasks !== initialTasks || synced.initialShots !== initialShots) {
    setSynced({ initialTasks, initialShots });
    setTasks(initialTasks);
    setShots(initialShots);
  }

  const toggle = (item: Item) => {
    const done = !item.done;
    if (item.kind === "task") {
      setTasks((current) =>
        current.map((task) => (task.id === item.id ? { ...task, done } : task)),
      );
    } else {
      setShots((current) =>
        current.map((shot) => (shot.id === item.id ? { ...shot, done } : shot)),
      );
    }
    startTransition(async () => {
      const result =
        item.kind === "task"
          ? await updateTask(projectId, item.id, { done })
          : await updateShot(projectId, item.id, { done });
      if (!result.ok) toast.show({ title: result.error ?? t("errors.generic"), tone: "error" });
      router.refresh();
    });
  };

  const itemsFor = (phase: Phase): Item[] => {
    const phaseTasks = tasks
      .filter((task) => task.phase === phase)
      .sort((a, b) => a.position - b.position)
      .map<Item>((task) => ({
        kind: "task",
        id: task.id,
        label: task.title,
        detail: task.dueDate ? formatDate(task.dueDate, locale) : undefined,
        done: task.done,
      }));
    if (phase !== "production") return phaseTasks;
    const shotItems = shots.map<Item>((shot, index) => ({
      kind: "shot",
      id: shot.id,
      label: shot.description || t("overview.shot", { number: index + 1 }),
      detail: [t("overview.shot", { number: index + 1 }), shot.size].filter(Boolean).join(" · "),
      done: shot.done,
    }));
    return [...shotItems, ...phaseTasks];
  };

  const all = PHASES.flatMap(itemsFor);
  const doneCount = all.filter((item) => item.done).length;
  const currentIndex = PHASES.indexOf(currentPhase);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3">
      <div className="mb-3 flex items-end justify-between gap-4 px-1">
        <p className="text-callout text-text-secondary tabular-nums">
          {all.length > 0 && doneCount === all.length
            ? t("overview.projectDone")
            : t("overview.progress", { done: doneCount, total: all.length })}
        </p>
      </div>

      {PHASES.map((phase, index) => {
        const items = itemsFor(phase);
        const done = items.filter((item) => item.done).length;
        const complete = items.length > 0 && done === items.length;
        const state = complete ? "done" : index === currentIndex ? "active" : "waiting";
        // Finished phases fold away so today's work stays on top.
        const open = state !== "done" || expanded.has(phase);
        const planModule = phase === "production" ? "shots" : "tasks";
        return (
          <section
            key={phase}
            aria-labelledby={`phase-${phase}`}
            className={cn(
              "surface-invert rounded-[24px] bg-surface p-4 shadow-sm sm:p-6",
            )}
          >
            <header className="flex items-center gap-3 px-1 sm:px-0">
              <span className="text-caption text-text-tertiary tabular-nums">
                ({String(index + 1).padStart(2, "0")})
              </span>
              <h2 id={`phase-${phase}`} className="text-title font-semibold">
                {t(`phases.${phase}`)}
              </h2>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                  state === "done" && "bg-[#30a46c]/20 text-[#30a46c]",
                  state === "active" && "bg-ink text-text-inverse",
                  state === "waiting" && "bg-surface-muted text-text-secondary",
                )}
              >
                {state === "done"
                  ? t("overview.phaseDone")
                  : state === "active"
                    ? t("overview.phaseActive")
                    : t("overview.phaseWaiting")}
              </span>
              <span className="ml-auto text-caption text-text-secondary tabular-nums">
                {items.length > 0 ? `${done}/${items.length}` : ""}
              </span>
              {state === "done" ? (
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() =>
                    setExpanded((current) => {
                      const next = new Set(current);
                      if (next.has(phase)) next.delete(phase);
                      else next.add(phase);
                      return next;
                    })
                  }
                  className="flex h-8 items-center gap-1 rounded-full px-2.5 text-caption text-text-secondary hover:bg-surface-muted"
                >
                  {open ? t("overview.hideDone") : t("overview.showDone")}
                  <ChevronDown
                    size={13}
                    aria-hidden="true"
                    className={cn("transition-transform", open && "rotate-180")}
                  />
                </button>
              ) : null}
            </header>

            <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-ink transition-[width] duration-500 ease-out"
                style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}
              />
            </div>

            {open ? (
              <>
                {items.length > 0 ? (
                  <ul className="-mx-1 mt-3 flex flex-col sm:-mx-2">
                    {items.map((item) => (
                      <CheckRow
                        key={`${item.kind}-${item.id}`}
                        item={item}
                        onToggle={() => toggle(item)}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 px-1 text-body text-text-tertiary">
                    {t("overview.phaseEmpty")}
                  </p>
                )}
                <Link
                  href={`/projects/${projectId}/plan?m=${planModule}`}
                  className="mt-2 inline-flex items-center gap-1 px-1 text-caption text-text-secondary hover:text-text"
                >
                  {t("overview.editInPlan")}
                  <ArrowUpRight size={12} aria-hidden="true" />
                </Link>
              </>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
