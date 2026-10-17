"use client";

import { Check, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/client";
import { formatEdited } from "@/lib/format";
import { setCommentResolved } from "./actions";
import { subjectLabel, type Subjects } from "./subjects";
import type { Comment } from "./types";

/**
 * Open discussion notes about a box, shown at the top of it: who asked for
 * what, with "Resolved" and a link to answer in the discussion.
 */
export function NotesBanner({
  projectId,
  notes,
  subjects,
  viewerId,
  isStudio,
}: {
  projectId: string;
  notes: Comment[];
  subjects: Subjects;
  viewerId: string;
  isStudio: boolean;
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const resolve = (id: string) =>
    startTransition(async () => {
      const result = await setCommentResolved(projectId, id, true);
      if (!result.ok) toast.show({ title: result.error, tone: "error" });
      router.refresh();
    });

  return (
    <section
      aria-label={t("notes.title")}
      className="mb-6 flex flex-col gap-3 rounded-[20px] p-4 shadow-[0_0_0_2px_var(--danger)] sm:p-5"
    >
      <h3 className="flex items-center gap-2 text-callout font-semibold text-danger">
        <span className="size-2 rounded-full bg-danger" aria-hidden="true" />
        {t("notes.title")} ({notes.length})
      </h3>
      <ul className="flex flex-col gap-3">
        {notes.map((note) => {
          const label = subjectLabel(t, subjects, note.topic ?? "", note.target);
          const canResolve = isStudio || note.author.id === viewerId;
          const reply = `/projects/${projectId}/discussion?o=${note.topic}${note.target ? `&t=${note.target}` : ""}`;
          return (
            <li key={note.id} className="flex flex-col gap-1.5 rounded-[14px] bg-surface-muted p-3">
              <div className="flex flex-wrap items-baseline gap-x-2 text-caption text-text-secondary">
                <span className="font-semibold text-text">{note.author.name}</span>
                <span>{formatEdited(note.createdAt, locale)}</span>
                {label.part ? (
                  <span className="font-medium text-danger">· {label.part}</span>
                ) : null}
              </div>
              <p className="text-body whitespace-pre-line">{note.body}</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {canResolve ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => resolve(note.id)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3 text-caption font-semibold text-text-inverse disabled:opacity-50"
                  >
                    <Check size={13} aria-hidden="true" />
                    {t("discussion.markResolved")}
                  </button>
                ) : null}
                <Link
                  href={reply}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3 text-caption font-semibold hover:bg-surface-pressed"
                >
                  <MessageSquare size={13} aria-hidden="true" />
                  {t("notes.reply")}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
