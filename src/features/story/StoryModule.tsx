"use client";

import { FileUp, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { formatEdited } from "@/lib/format";
import { saveStoryBody, summarizeStory } from "./actions";
import type { Story, StorySummary } from "./types";

/** Under the upload limit: photos are scaled down in the browser first. */
const MAX_PDF_BYTES = 3_800_000;

/** A phone photo resized to a sharp-enough JPEG for reading handwriting. */
async function shrinkImage(file: File): Promise<File> {
  if (file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.85),
  );
  if (!blob) return file;
  return new File([blob], "notes.jpg", { type: "image/jpeg" });
}

function List({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-caption font-semibold tracking-wide text-text-secondary uppercase">
        {title}
      </span>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li key={item} className="rounded-full bg-surface-muted px-3 py-1 text-body">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Summary({ summary }: { summary: StorySummary }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        {summary.title ? <h3 className="text-title font-semibold">{summary.title}</h3> : null}
        {summary.logline ? (
          <p className="text-headline leading-snug font-medium text-balance">{summary.logline}</p>
        ) : null}
      </div>
      {summary.synopsis ? (
        <p className="text-callout whitespace-pre-line text-text-secondary">{summary.synopsis}</p>
      ) : null}
      {summary.tone ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-caption font-semibold tracking-wide text-text-secondary uppercase">
            {t("story.tone")}
          </span>
          <p className="text-body">{summary.tone}</p>
        </div>
      ) : null}
      {summary.scenes.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-caption font-semibold tracking-wide text-text-secondary uppercase">
            {t("story.scenes")}
          </span>
          <ol className="flex flex-col border-t border-border-strong">
            {summary.scenes.map((scene, index) => (
              <li key={index} className="flex gap-4 border-b border-border py-3">
                <span className="text-caption text-text-tertiary tabular-nums">
                  ({String(index + 1).padStart(2, "0")})
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-callout font-medium">{scene.title}</span>
                  {scene.description ? (
                    <span className="text-body text-text-secondary">{scene.description}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <List title={t("story.locations")} items={summary.needs.locations} />
        <List title={t("story.cast")} items={summary.needs.cast} />
        <List title={t("story.gear")} items={summary.needs.gear} />
        <List title={t("story.props")} items={summary.needs.props} />
      </div>
      {summary.questions.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-[18px] bg-surface-muted p-4">
          <span className="text-caption font-semibold tracking-wide text-text-secondary uppercase">
            {t("story.questions")}
          </span>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-body">
            {summary.questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The idea and script, written out: type it, or upload a photo or PDF of
 * handwritten notes, and have Claude transcribe and sum it up.
 */
export function StoryModule({ projectId, story }: { projectId: string; story: Story }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState(story.body);
  const [synced, setSynced] = useState(story.body);
  const [saved, setSaved] = useState(true);
  const [reading, startReading] = useTransition();
  const [readingWhat, setReadingWhat] = useState<"file" | "text" | null>(null);

  // A newer text from the server (a transcript added, someone else wrote).
  if (story.body !== synced) {
    setSynced(story.body);
    setBody(story.body);
    setSaved(true);
  }

  // Saves a moment after typing stops.
  useEffect(() => {
    if (saved) return;
    const timer = window.setTimeout(async () => {
      const result = await saveStoryBody(projectId, body);
      if (!result.ok) return toast.show({ title: result.error, tone: "error" });
      setSaved(true);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [body, saved, projectId, toast]);

  const read = (file: File | null) =>
    startReading(async () => {
      setReadingWhat(file ? "file" : "text");
      if (!saved) {
        await saveStoryBody(projectId, body);
        setSaved(true);
      }
      const form = new FormData();
      if (file) {
        if (file.type === "application/pdf" && file.size > MAX_PDF_BYTES) {
          setReadingWhat(null);
          return toast.show({ title: t("story.fileTooLarge"), tone: "error" });
        }
        form.set("file", file.type.startsWith("image/") ? await shrinkImage(file) : file);
      }
      const result = await summarizeStory(projectId, form);
      setReadingWhat(null);
      if (!result.ok) return toast.show({ title: result.error, tone: "error" });
      toast.show({ title: file ? t("story.notesRead") : t("story.summarized") });
      router.refresh();
    });

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
      <section className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionLabel label={t("story.writeTitle")} index={1} />
          <span className="text-caption text-text-tertiary">
            {saved
              ? story.updatedAt
                ? formatEdited(story.updatedAt, locale)
                : ""
              : t("story.saving")}
          </span>
        </div>
        <textarea
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            setSaved(false);
          }}
          placeholder={t("story.placeholder")}
          aria-label={t("story.writeTitle")}
          maxLength={200_000}
          className="min-h-[52vh] w-full resize-y rounded-[22px] bg-surface-muted p-5 text-callout leading-relaxed outline-none placeholder:text-text-tertiary focus-visible:shadow-[0_0_0_2px_var(--text)] sm:p-6"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => fileRef.current?.click()}
            loading={reading && readingWhat === "file"}
            disabled={reading}
          >
            <FileUp size={16} aria-hidden="true" />
            {t("story.upload")}
          </Button>
          <Button
            variant="primary"
            onClick={() => read(null)}
            loading={reading && readingWhat === "text"}
            disabled={reading || !body.trim()}
          >
            <Sparkles size={16} aria-hidden="true" />
            {story.summary ? t("story.resummarize") : t("story.summarize")}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              event.target.value = "";
              if (file) read(file);
            }}
          />
        </div>
        <p className="text-caption text-text-tertiary">{t("story.uploadHint")}</p>
      </section>

      <section className="flex min-w-0 flex-col gap-4">
        <SectionLabel label={t("story.summaryTitle")} index={2} />
        <div
          className={cn(
            "rounded-[22px] bg-surface-muted/60 p-5 ring-1 ring-border ring-inset sm:p-7",
            reading && "animate-pulse",
          )}
        >
          {reading ? (
            <p className="text-callout text-text-secondary">
              {readingWhat === "file" ? t("story.readingNotes") : t("story.reading")}
            </p>
          ) : story.summary ? (
            <Summary summary={story.summary} />
          ) : (
            <p className="text-callout text-text-secondary">{t("story.summaryEmpty")}</p>
          )}
        </div>
        {story.summarizedAt && !reading ? (
          <p className="text-caption text-text-tertiary">
            {t("story.summarizedAt", { when: formatEdited(story.summarizedAt, locale) })}
          </p>
        ) : null}
      </section>
    </div>
  );
}

/** The story box on the Plan's overview. */
export function StoryPreview({ story, empty }: { story: Story; empty: string }) {
  const text = story.summary?.logline || story.body.trim();
  if (!text) {
    return <p className="mt-auto text-headline text-text-secondary">{empty}</p>;
  }
  return (
    <div className="mt-auto flex flex-col gap-2">
      {story.summary?.title ? (
        <span className="text-callout font-semibold">{story.summary.title}</span>
      ) : null}
      <p className="line-clamp-4 text-headline leading-snug font-medium">{text}</p>
    </div>
  );
}
