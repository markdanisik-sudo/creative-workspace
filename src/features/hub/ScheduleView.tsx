"use client";

import { MapPin, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Input";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";
import { deleteEvent, saveEvent } from "./actions";
import { EventDate } from "./EventDate";
import { EVENT_KINDS, type EventKind, type ProjectEvent } from "./types";

const KIND_DOT: Record<EventKind, string> = {
  shoot: "bg-[#e5484d]",
  deadline: "bg-text",
  meeting: "bg-[#0a84ff]",
  delivery: "bg-[#30a46c]",
  other: "bg-text-tertiary",
};

function localDate(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function localTime(iso: string) {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function EventDialog({
  event,
  open,
  onClose,
  onSaved,
  projectId,
}: {
  event: ProjectEvent | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  projectId: string;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [allDay, setAllDay] = useState(event?.allDay ?? true);
  const [pending, setPending] = useState(false);

  const submit = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    const get = (name: string) => String(form.get(name) ?? "");
    setPending(true);
    const result = await saveEvent(projectId, event?.id ?? null, {
      kind: get("kind") as EventKind,
      title: get("title"),
      date: get("date"),
      endDate: get("endDate") || undefined,
      allDay,
      startTime: get("startTime") || undefined,
      endTime: get("endTime") || undefined,
      location: get("location"),
      notes: get("notes"),
      timezoneOffset: new Date(`${get("date")}T12:00`).getTimezoneOffset(),
    });
    setPending(false);
    if (!result.ok) return toast.show({ title: result.error, tone: "error" });
    onSaved();
  };

  const remove = async () => {
    if (!event) return;
    setPending(true);
    const result = await deleteEvent(projectId, event.id);
    setPending(false);
    if (!result.ok) return toast.show({ title: result.error, tone: "error" });
    onSaved();
  };

  return (
    <Dialog open={open} onClose={onClose} title={event ? t("schedule.editDate") : t("schedule.addDate")} className="max-w-[520px]">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <TextField label={t("schedule.title")} name="title" defaultValue={event?.title} required maxLength={200} autoFocus />
          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-medium text-text-secondary">{t("schedule.kind")}</span>
            <select
              name="kind"
              defaultValue={event?.kind ?? "shoot"}
              className="h-11 rounded-lg bg-surface-muted px-3 text-callout outline-none focus-visible:shadow-[0_0_0_2px_var(--text)]"
            >
              {EVENT_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {t(`schedule.kinds.${kind}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label={t("schedule.date")}
            name="date"
            type="date"
            required
            defaultValue={event ? localDate(event.startsAt) : ""}
          />
          {allDay ? (
            <TextField
              label={t("schedule.endDate")}
              name="endDate"
              type="date"
              defaultValue={event?.endsAt ? localDate(event.endsAt) : ""}
            />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <TextField
                label={t("schedule.startTime")}
                name="startTime"
                type="time"
                defaultValue={event && !event.allDay ? localTime(event.startsAt) : "09:00"}
              />
              <TextField
                label={t("schedule.endTime")}
                name="endTime"
                type="time"
                defaultValue={event?.endsAt && !event.allDay ? localTime(event.endsAt) : "17:00"}
              />
            </div>
          )}
        </div>
        <label className="flex items-center gap-2.5 text-body">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(change) => setAllDay(change.target.checked)}
            className="size-4 accent-[var(--ink)]"
          />
          {t("schedule.allDay")}
        </label>
        <TextField label={t("schedule.location")} name="location" defaultValue={event?.location ?? ""} maxLength={300} />
        <TextArea label={t("schedule.notes")} name="notes" defaultValue={event?.notes ?? ""} rows={3} maxLength={5000} />
        <div className="flex items-center justify-between gap-2 pt-1">
          {event ? (
            <Button variant="danger" size="sm" onClick={remove} disabled={pending}>
              {t("schedule.deleteDate")}
            </Button>
          ) : (
            <span />
          )}
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

function EventRow({ event, onOpen }: { event: ProjectEvent; onOpen?: () => void }) {
  const { t, locale } = useI18n();
  const content = (
    <>
      <EventDate iso={event.startsAt} locale={locale} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-callout font-semibold">{event.title}</span>
          <span className="inline-flex items-center gap-1.5 text-caption text-text-secondary">
            <span className={cn("size-1.5 rounded-full", KIND_DOT[event.kind])} aria-hidden="true" />
            {t(`schedule.kinds.${event.kind}`)}
          </span>
        </div>
        <span className="text-caption text-text-secondary">
          {event.allDay
            ? t("schedule.allDay")
            : `${formatTime(event.startsAt, locale)}${event.endsAt ? ` – ${formatTime(event.endsAt, locale)}` : ""}`}
          {event.allDay && event.endsAt && localDate(event.endsAt) !== localDate(event.startsAt)
            ? ` · ${new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(event.startsAt))} – ${new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(event.endsAt))}`
            : ""}
        </span>
        {event.location ? (
          <span className="inline-flex items-center gap-1 text-caption text-text-secondary">
            <MapPin size={12} aria-hidden="true" />
            {event.location}
          </span>
        ) : null}
        {event.notes ? <p className="pt-1 text-body whitespace-pre-line text-text-secondary">{event.notes}</p> : null}
      </div>
    </>
  );
  return (
    <li>
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="flex w-full items-start gap-4 rounded-xl bg-surface p-4 text-left shadow-sm transition-shadow hover:shadow-md"
        >
          {content}
        </button>
      ) : (
        <div className="flex items-start gap-4 rounded-xl bg-surface p-4 shadow-sm">{content}</div>
      )}
    </li>
  );
}

/** The job's dates. The studio edits; clients read. Times show in the viewer's time zone. */
export function ScheduleView({ projectId, events, canEdit }: { projectId: string; events: ProjectEvent[]; canEdit: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = useState<ProjectEvent | "new" | null>(null);

  const startOfToday = new Date(new Date().toDateString()).getTime();
  const isPast = (event: ProjectEvent) => new Date(event.endsAt ?? event.startsAt).getTime() < startOfToday;
  const upcoming = events.filter((event) => !isPast(event));
  const past = events.filter(isPast).reverse();

  return (
    <div className="flex max-w-3xl flex-col gap-12">
      {canEdit ? (
        <div>
          <Button variant="primary" onClick={() => setEditing("new")}>
            <Plus size={16} aria-hidden="true" />
            {t("schedule.addDate")}
          </Button>
        </div>
      ) : null}

      {events.length === 0 ? (
        <p className="text-callout text-text-secondary">{canEdit ? t("schedule.empty") : t("schedule.emptyClient")}</p>
      ) : null}

      {upcoming.length > 0 ? (
        <section className="flex flex-col gap-4">
          <SectionLabel label={t("schedule.upcoming")} index={1} />
          <ul className="flex flex-col gap-2">
            {upcoming.map((event) => (
              <EventRow key={event.id} event={event} onOpen={canEdit ? () => setEditing(event) : undefined} />
            ))}
          </ul>
        </section>
      ) : null}

      {past.length > 0 ? (
        <section className="flex flex-col gap-4 opacity-70">
          <SectionLabel label={t("schedule.past")} index={upcoming.length > 0 ? 2 : 1} />
          <ul className="flex flex-col gap-2">
            {past.map((event) => (
              <EventRow key={event.id} event={event} onOpen={canEdit ? () => setEditing(event) : undefined} />
            ))}
          </ul>
        </section>
      ) : null}

      {editing ? (
        <EventDialog
          key={editing === "new" ? "new" : editing.id}
          projectId={projectId}
          event={editing === "new" ? null : editing}
          open
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
