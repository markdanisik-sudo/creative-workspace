"use client";

import { ArrowUp, Check, CornerDownRight, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { formatEdited } from "@/lib/format";
import { deleteComment, postComment, setCommentResolved } from "./actions";
import { hasTargets, subjectLabel, type Subjects } from "./subjects";
import type { Comment } from "./types";
import { randomUuid } from "@/lib/ids";

/** The job's conversation: a single thread, oldest first, composer at the bottom. */
export function Discussion({
  projectId,
  comments,
  viewer,
  isStudio,
  subjects,
  initialTopic,
  initialTarget,
}: {
  projectId: string;
  /** Newest first, as queried. */
  comments: Comment[];
  viewer: { id: string; name: string; isStudio: boolean };
  isStudio: boolean;
  /** The Plan's boxes and their parts, to say what a message is about. */
  subjects: Subjects;
  /** Opened from a box ("Comment on this"): start with it selected. */
  initialTopic?: string | null;
  initialTarget?: string | null;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState("");
  const [topic, setTopic] = useState<string | null>(
    initialTopic && subjects.modules.some((id) => id === initialTopic) ? initialTopic : null,
  );
  const [target, setTarget] = useState<string | null>(topic ? (initialTarget ?? null) : null);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const [thread, applyOptimistic] = useOptimistic(
    [...comments].reverse(),
    (
      current: Comment[],
      change: { add?: Comment; removeId?: string; resolve?: { id: string; resolved: boolean } },
    ) =>
      change.add
        ? [...current, change.add]
        : change.resolve
          ? current.map((comment) =>
              comment.id === change.resolve!.id
                ? {
                    ...comment,
                    resolvedAt: change.resolve!.resolved ? new Date().toISOString() : null,
                  }
                : comment,
            )
          : current.filter((comment) => comment.id !== change.removeId),
  );

  // Like Messages: open at the newest message and follow new ones, so the
  // composer never covers the end of the thread.
  // (After the router's own scroll-to-top on navigation, hence the frame.)
  useEffect(() => {
    // The sticky composer always counts as visible, so scroll the page itself.
    const frame = requestAnimationFrame(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight }),
    );
    return () => cancelAnimationFrame(frame);
  }, [thread.length]);

  const send = (event?: FormEvent) => {
    event?.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    startTransition(async () => {
      applyOptimistic({
        add: {
          id: `tmp-${randomUuid()}`,
          body,
          author: viewer,
          createdAt: new Date().toISOString(),
          edited: false,
          topic,
          target,
          resolvedAt: null,
        },
      });
      const result = await postComment(projectId, body, { topic, target });
      if (!result.ok) {
        setDraft(body);
        toast.show({ title: result.error, tone: "error" });
      }
      router.refresh();
    });
  };

  const resolve = (id: string, resolved: boolean) =>
    startTransition(async () => {
      applyOptimistic({ resolve: { id, resolved } });
      const result = await setCommentResolved(projectId, id, resolved);
      if (!result.ok) toast.show({ title: result.error, tone: "error" });
      router.refresh();
    });

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
    <div className="flex max-w-3xl flex-col gap-6 pb-8">
      {thread.length === 0 ? (
        <p className="text-callout text-text-secondary">{t("discussion.empty")}</p>
      ) : (
        <ol className="flex flex-col gap-5">
          {thread.map((comment) => {
            const mine = comment.author.id === viewer.id;
            return (
              <li
                key={comment.id}
                className={cn("group flex gap-3", comment.id.startsWith("tmp-") && "opacity-60")}
              >
                <Avatar
                  name={comment.author.name}
                  size={32}
                  className={comment.author.isStudio ? "bg-ink text-text-inverse" : ""}
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-body font-semibold">
                      {mine ? t("discussion.you") : comment.author.name}
                    </span>
                    {comment.author.isStudio ? (
                      <span className="text-[11px] font-medium text-text-secondary">
                        {t("discussion.studio")}
                      </span>
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
                  {comment.topic ? (
                    <SubjectChip
                      projectId={projectId}
                      subjects={subjects}
                      topic={comment.topic}
                      target={comment.target}
                    />
                  ) : null}
                  <p
                    className={cn(
                      "rounded-[14px] rounded-tl-[4px] bg-surface px-4 py-3 text-callout whitespace-pre-line break-words shadow-sm",
                      comment.topic &&
                        !comment.resolvedAt &&
                        "shadow-[0_0_0_1.5px_var(--attention)]",
                    )}
                  >
                    {comment.body}
                  </p>
                  {comment.topic && !comment.id.startsWith("tmp-") ? (
                    <div className="flex flex-wrap items-center gap-2 pt-0.5 text-caption">
                      {comment.resolvedAt ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-[var(--success)]">
                          <Check size={13} strokeWidth={2.5} aria-hidden="true" />
                          {t("discussion.resolved")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-attention">
                          <span className="size-1.5 rounded-full bg-attention" aria-hidden="true" />
                          {t("discussion.open")}
                        </span>
                      )}
                      {mine || isStudio ? (
                        <button
                          type="button"
                          onClick={() => resolve(comment.id, !comment.resolvedAt)}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-text-secondary hover:bg-surface hover:text-text"
                        >
                          {comment.resolvedAt ? (
                            <>
                              <RotateCcw size={12} aria-hidden="true" />
                              {t("discussion.reopen")}
                            </>
                          ) : (
                            <>
                              <Check size={12} aria-hidden="true" />
                              {t("discussion.markResolved")}
                            </>
                          )}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <form
        ref={formRef}
        onSubmit={send}
        className="sticky bottom-[calc(max(12px,env(safe-area-inset-bottom))+72px)] flex flex-col gap-2 rounded-[18px] bg-surface p-2 shadow-md sm:bottom-4"
      >
        <SubjectPicker
          subjects={subjects}
          topic={topic}
          target={target}
          onChange={(nextTopic, nextTarget) => {
            setTopic(nextTopic);
            setTarget(nextTarget);
          }}
        />
        <div className="flex items-end gap-2 pl-2">
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
        </div>
      </form>
    </div>
  );
}

function SubjectChip({
  projectId,
  subjects,
  topic,
  target,
}: {
  projectId: string;
  subjects: Subjects;
  topic: string;
  target: string | null;
}) {
  const { t } = useI18n();
  const label = subjectLabel(t, subjects, topic, target);
  const known = subjects.modules.some((id) => id === topic);
  const content = (
    <>
      <CornerDownRight size={12} aria-hidden="true" />
      {label.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed storage URLs
        <img src={label.image} alt="" className="size-5 rounded-[5px] object-cover" />
      ) : null}
      <span className="font-semibold text-text">{label.box}</span>
      {label.part ? <span className="truncate">· {label.part}</span> : null}
    </>
  );
  const className =
    "inline-flex max-w-full items-center gap-1.5 self-start rounded-full bg-surface px-2.5 py-1 text-caption text-text-secondary shadow-sm";
  return known ? (
    <Link
      href={`/projects/${projectId}/plan?m=${topic}`}
      className={cn(className, "hover:text-text")}
    >
      {content}
    </Link>
  ) : (
    <span className={className}>{content}</span>
  );
}

/** "About:" — a Plan box and, for some boxes, a part of it (palette, an image, a row). */
function SubjectPicker({
  subjects,
  topic,
  target,
  onChange,
}: {
  subjects: Subjects;
  topic: string | null;
  target: string | null;
  onChange: (topic: string | null, target: string | null) => void;
}) {
  const { t } = useI18n();
  const chip = (active: boolean) =>
    cn(
      "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-caption font-medium transition-colors",
      active ? "bg-ink text-text-inverse" : "bg-surface-muted text-text-secondary hover:text-text",
    );
  const parts =
    topic === "moodboard"
      ? [
          { id: "palette", label: t("palette.title"), image: null as string | null },
          ...subjects.images.map((image, index) => ({
            id: `image:${image.id}`,
            label: `${t("discussion.aboutImage")} ${index + 1}`,
            image: image.url,
          })),
        ]
      : topic
        ? subjects.items
            .filter((item) => item.module === topic)
            .map((item) => ({ id: `item:${item.id}`, label: item.title, image: null }))
        : [];

  return (
    <div className="flex flex-col gap-1.5 px-1 pt-1">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
        <span className="shrink-0 pr-1 text-caption text-text-tertiary">
          {t("discussion.about")}
        </span>
        <button type="button" className={chip(topic === null)} onClick={() => onChange(null, null)}>
          {t("discussion.general")}
        </button>
        {subjects.modules.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={topic === id}
            className={chip(topic === id)}
            onClick={() => onChange(id, null)}
          >
            {t(`workspace.modules.${id}`)}
          </button>
        ))}
      </div>
      {topic && hasTargets(topic) && parts.length > 0 ? (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          <span className="shrink-0 pr-1 text-caption text-text-tertiary">
            {t("discussion.what")}
          </span>
          <button
            type="button"
            className={chip(target === null)}
            onClick={() => onChange(topic, null)}
          >
            {t("discussion.wholeBox")}
          </button>
          {parts.map((part) => (
            <button
              key={part.id}
              type="button"
              aria-pressed={target === part.id}
              title={part.label}
              className={cn(chip(target === part.id), part.image && "pl-1")}
              onClick={() => onChange(topic, part.id)}
            >
              {part.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- signed storage URLs
                <img src={part.image} alt="" className="size-5 rounded-full object-cover" />
              ) : null}
              <span className="max-w-40 truncate">{part.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
