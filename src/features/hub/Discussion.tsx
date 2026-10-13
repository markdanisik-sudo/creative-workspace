"use client";

import { ArrowUp, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useRef, useState, useTransition, type FormEvent, type KeyboardEvent } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { formatEdited } from "@/lib/format";
import { deleteComment, postComment } from "./actions";
import type { Comment } from "./types";

/** The job's conversation: a single thread, oldest first, composer at the bottom. */
export function Discussion({
  projectId,
  comments,
  viewer,
  isStudio,
}: {
  projectId: string;
  /** Newest first, as queried. */
  comments: Comment[];
  viewer: { id: string; name: string; isStudio: boolean };
  isStudio: boolean;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState("");
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const [thread, applyOptimistic] = useOptimistic(
    [...comments].reverse(),
    (current: Comment[], change: { add?: Comment; removeId?: string }) =>
      change.add ? [...current, change.add] : current.filter((comment) => comment.id !== change.removeId),
  );

  const send = (event?: FormEvent) => {
    event?.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    startTransition(async () => {
      applyOptimistic({
        add: {
          id: `tmp-${crypto.randomUUID()}`,
          body,
          author: viewer,
          createdAt: new Date().toISOString(),
          edited: false,
        },
      });
      const result = await postComment(projectId, body);
      if (!result.ok) {
        setDraft(body);
        toast.show({ title: result.error, tone: "error" });
      }
      router.refresh();
    });
  };

  const remove = (id: string) =>
    startTransition(async () => {
      applyOptimistic({ removeId: id });
      const result = await deleteComment(projectId, id);
      if (!result.ok) toast.show({ title: result.error, tone: "error" });
      router.refresh();
    });

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      {thread.length === 0 ? (
        <p className="text-callout text-text-secondary">{t("discussion.empty")}</p>
      ) : (
        <ol className="flex flex-col gap-5">
          {thread.map((comment) => {
            const mine = comment.author.id === viewer.id;
            return (
              <li key={comment.id} className={cn("group flex gap-3", comment.id.startsWith("tmp-") && "opacity-60")}>
                <Avatar name={comment.author.name} size={32} className={comment.author.isStudio ? "bg-ink text-text-inverse" : ""} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-body font-semibold">{mine ? t("discussion.you") : comment.author.name}</span>
                    {comment.author.isStudio ? (
                      <span className="text-[11px] font-medium text-text-secondary">{t("discussion.studio")}</span>
                    ) : null}
                    <time dateTime={comment.createdAt} className="text-caption text-text-tertiary">
                      {formatEdited(comment.createdAt, locale)}
                      {comment.edited ? ` · ${t("discussion.edited")}` : ""}
                    </time>
                    {(mine || isStudio) && !comment.id.startsWith("tmp-") ? (
                      <button
                        type="button"
                        onClick={() => remove(comment.id)}
                        aria-label={t("discussion.delete")}
                        title={t("discussion.delete")}
                        className="ml-auto flex size-7 items-center justify-center rounded-full text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100 hover:bg-surface hover:text-danger focus-visible:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : null}
                  </div>
                  <p className="rounded-[14px] rounded-tl-[4px] bg-surface px-4 py-3 text-callout whitespace-pre-line break-words shadow-sm">
                    {comment.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <form
        ref={formRef}
        onSubmit={send}
        className="sticky bottom-4 flex items-end gap-2 rounded-[18px] bg-surface p-2 pl-4 shadow-md"
      >
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("discussion.placeholder")}
          aria-label={t("discussion.placeholder")}
          rows={Math.min(8, Math.max(1, draft.split("\n").length))}
          maxLength={5000}
          className="min-h-10 flex-1 resize-none bg-transparent py-2 text-callout outline-none placeholder:text-text-tertiary"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label={t("discussion.send")}
          title={`${t("discussion.send")} (⌘↵)`}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-text-inverse transition-[opacity,transform] active:scale-95 disabled:opacity-30"
        >
          <ArrowUp size={18} />
        </button>
      </form>
    </div>
  );
}
