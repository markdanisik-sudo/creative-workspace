"use client";

import { CalendarDays, Plus, StickyNote } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type DragEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Input";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/Toast";
import { PHASES, type Phase } from "@/features/projects/types";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { createTask, deleteTask, updateTask } from "./actions";
import type { Task } from "./types";
import { randomUuid } from "@/lib/ids";

const DRAG_TYPE = "application/x-lab-task";

function byPosition(a: Task, b: Task) {
  return a.position - b.position;
}

/** Round check like Reminders; toggles without opening the card. */
function DoneCheck({
  done,
  label,
  onToggle,
}: {
  done: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className={cn(
        "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors duration-150",
        done
          ? "border-ink bg-ink text-text-inverse"
          : "border-border-strong hover:border-text-secondary",
      )}
    >
      <svg
        viewBox="0 0 12 12"
        className={cn("size-2.5", done ? "opacity-100" : "opacity-0")}
        aria-hidden="true"
      >
        <path
          d="M2.5 6.2 4.9 8.5 9.5 3.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function TaskCard({
  task,
  onOpen,
  onToggle,
  onDragStart,
}: {
  task: Task;
  onOpen: () => void;
  onToggle: () => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
}) {
  const { t, locale } = useI18n();
  return (
    <li
      draggable
      onDragStart={onDragStart}
      data-task={task.id}
      className="group cursor-grab rounded-[12px] bg-surface p-3 shadow-sm transition-shadow duration-200 hover:shadow-md active:cursor-grabbing"
    >
      <div className="flex items-start gap-2.5">
        <DoneCheck
          done={task.done}
          label={task.done ? t("plan.markOpen") : t("plan.markDone")}
          onToggle={onToggle}
        />
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 flex-col items-start gap-1.5 text-left"
        >
          <span
            className={cn(
              "text-body break-words",
              task.done && "text-text-tertiary line-through decoration-1",
            )}
          >
            {task.title}
          </span>
          {task.dueDate || task.notes ? (
            <span className="flex items-center gap-2.5 text-[11px] text-text-secondary">
              {task.dueDate ? (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays size={12} aria-hidden="true" />
                  {formatDate(task.dueDate, locale)}
                </span>
              ) : null}
              {task.notes ? <StickyNote size={12} aria-label={t("plan.notes")} /> : null}
            </span>
          ) : null}
        </button>
      </div>
    </li>
  );
}

function AddTask({ onAdd }: { onAdd: (title: string) => Promise<void> }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex h-9 w-full items-center gap-1.5 rounded-[10px] px-2 text-body text-text-secondary transition-colors hover:bg-surface hover:text-text"
      >
        <Plus size={15} aria-hidden="true" />
        {t("plan.addTask")}
      </button>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const title = value.trim();
    if (!title) return setEditing(false);
    setValue("");
    await onAdd(title);
  };

  return (
    <form onSubmit={submit}>
      <input
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => !value.trim() && setEditing(false)}
        onKeyDown={(event) => event.key === "Escape" && setEditing(false)}
        placeholder={t("plan.taskPlaceholder")}
        aria-label={t("plan.taskTitle")}
        maxLength={300}
        className="h-10 w-full rounded-[10px] bg-surface px-3 text-body shadow-sm outline-none focus:shadow-[0_0_0_1.5px_var(--text)]"
      />
    </form>
  );
}

function TaskDialog({
  task,
  onClose,
  onSave,
  onDelete,
}: {
  task: Task | null;
  onClose: () => void;
  onSave: (patch: Partial<Task>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const { t } = useI18n();
  const [pending, setPending] = useState(false);
  if (!task)
    return (
      <Dialog open={false} onClose={onClose} title="">
        {null}
      </Dialog>
    );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    await onSave({
      title: String(form.get("title") ?? ""),
      notes: String(form.get("notes") ?? "") || null,
      dueDate: String(form.get("due") ?? "") || null,
      phase: String(form.get("phase")) as Phase,
    });
    setPending(false);
  };

  return (
    <Dialog open onClose={onClose} title={t("plan.editTask")}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <TextField
          label={t("plan.taskTitle")}
          name="title"
          defaultValue={task.title}
          maxLength={300}
          required
          autoFocus
        />
        <TextArea
          label={t("plan.notes")}
          name="notes"
          defaultValue={task.notes ?? ""}
          rows={4}
          maxLength={5000}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label={t("plan.dueDate")}
            name="due"
            type="date"
            defaultValue={task.dueDate ?? ""}
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-medium text-text-secondary">{t("plan.moveTo")}</span>
            <select
              name="phase"
              defaultValue={task.phase}
              className="h-11 rounded-lg bg-surface-muted px-3 text-callout outline-none focus-visible:shadow-[0_0_0_2px_var(--text)]"
            >
              {PHASES.map((phase) => (
                <option key={phase} value={phase}>
                  {t(`phases.${phase}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button variant="danger" size="sm" onClick={onDelete}>
            {t("plan.deleteTask")}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="primary" loading={pending}>
              {t("common.save")}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

/** The job's kanban: one column per production phase. */
export function PlanBoard({
  projectId,
  tasks: initial,
  currentPhase,
}: {
  projectId: string;
  tasks: Task[];
  currentPhase: Phase;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [tasks, setTasks] = useState(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<Phase | null>(null);
  const [mobilePhase, setMobilePhase] = useState<Phase>(currentPhase);
  const [, startTransition] = useTransition();

  // Server data wins whenever it changes (another person's edit, a refresh).
  const [synced, setSynced] = useState(initial);
  if (synced !== initial) {
    setSynced(initial);
    setTasks(initial);
  }

  const run = (work: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      if (!result.ok) {
        toast.show({ title: result.error ?? t("errors.generic"), tone: "error" });
        setTasks(initial);
      }
      router.refresh();
    });

  const patch = (id: string, change: Partial<Task>) => {
    setTasks((current) => current.map((task) => (task.id === id ? { ...task, ...change } : task)));
    run(() => updateTask(projectId, id, change));
  };

  const onDrop = (event: DragEvent<HTMLElement>, phase: Phase) => {
    event.preventDefault();
    setDropTarget(null);
    const id = event.dataTransfer.getData(DRAG_TYPE);
    const moving = tasks.find((task) => task.id === id);
    if (!moving) return;

    // Drop before the card under the pointer, or at the end of the column.
    const column = tasks.filter((task) => task.phase === phase && task.id !== id).sort(byPosition);
    const overId = (event.target as HTMLElement).closest<HTMLElement>("[data-task]")?.dataset.task;
    const overIndex = column.findIndex((task) => task.id === overId);
    let position: number;
    if (overIndex === -1) position = (column.at(-1)?.position ?? 0) + 1;
    else {
      const before = column[overIndex - 1]?.position ?? column[overIndex].position - 1;
      position = (before + column[overIndex].position) / 2;
    }
    if (moving.phase === phase && moving.position === position) return;
    patch(id, { phase, position });
  };

  const openTask = tasks.find((task) => task.id === openId) ?? null;

  const renderColumn = (phase: Phase) => {
    const column = tasks.filter((task) => task.phase === phase).sort(byPosition);
    const done = column.filter((task) => task.done).length;
    return (
      <section
        key={phase}
        aria-label={t(`phases.${phase}`)}
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
          event.preventDefault();
          setDropTarget(phase);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropTarget(null);
        }}
        onDrop={(event) => onDrop(event, phase)}
        className={cn(
          "flex min-h-64 flex-col gap-2 rounded-xl bg-surface-muted/70 p-2 transition-[box-shadow,background-color] duration-200",
          phase === currentPhase && "bg-surface-muted shadow-[inset_0_0_0_1.5px_var(--text)]",
          dropTarget === phase && "shadow-[inset_0_0_0_2px_var(--focus)]",
        )}
      >
        <header className="flex items-baseline justify-between px-2 pt-1.5 pb-1">
          <h2 className="text-body font-semibold">{t(`phases.${phase}`)}</h2>
          <span className="text-caption text-text-secondary tabular-nums">
            {column.length > 0 ? t("plan.doneCount", { done, total: column.length }) : ""}
          </span>
        </header>
        <ul className="flex flex-col gap-2">
          {column.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onOpen={() => setOpenId(task.id)}
              onToggle={() => patch(task.id, { done: !task.done })}
              onDragStart={(event) => {
                event.dataTransfer.setData(DRAG_TYPE, task.id);
                event.dataTransfer.effectAllowed = "move";
              }}
            />
          ))}
        </ul>
        <AddTask
          onAdd={async (title) => {
            const optimistic: Task = {
              id: `tmp-${randomUuid()}`,
              phase,
              title,
              notes: null,
              dueDate: null,
              done: false,
              position: (column.at(-1)?.position ?? 0) + 1,
            };
            setTasks((current) => [...current, optimistic]);
            run(() => createTask(projectId, phase, title));
          }}
        />
      </section>
    );
  };

  const countFor = (phase: Phase) => tasks.filter((task) => task.phase === phase).length;

  return (
    <>
      {/* Phone: one phase at a time, picked from a row of chips. */}
      <div className="sm:hidden">
        <div
          role="tablist"
          aria-label={t("hub.phaseLabel")}
          className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1"
        >
          {PHASES.map((phase) => (
            <button
              key={phase}
              type="button"
              role="tab"
              aria-selected={mobilePhase === phase}
              onClick={() => setMobilePhase(phase)}
              className={cn(
                "flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-body font-medium transition-colors",
                mobilePhase === phase
                  ? "bg-ink text-text-inverse"
                  : "bg-surface text-text-secondary shadow-sm",
              )}
            >
              {t(`phases.${phase}`)}
              {countFor(phase) > 0 ? (
                <span className="text-caption tabular-nums opacity-60">{countFor(phase)}</span>
              ) : null}
            </button>
          ))}
        </div>
        {renderColumn(mobilePhase)}
      </div>

      {/* Larger screens: the whole board, cards drag between phases. */}
      <div className="hidden sm:block">
        <p className="mb-4 text-caption text-text-secondary">{t("plan.dragHint")}</p>
        <div className="overflow-x-auto pb-4">
          <div className="grid min-w-[1000px] grid-cols-5 gap-3">{PHASES.map(renderColumn)}</div>
        </div>
      </div>

      <TaskDialog
        task={openTask}
        onClose={() => setOpenId(null)}
        onSave={async (change) => {
          if (!openTask) return;
          patch(openTask.id, change);
          setOpenId(null);
        }}
        onDelete={async () => {
          if (!openTask) return;
          setTasks((current) => current.filter((task) => task.id !== openTask.id));
          setOpenId(null);
          run(() => deleteTask(projectId, openTask.id));
        }}
      />
    </>
  );
}
