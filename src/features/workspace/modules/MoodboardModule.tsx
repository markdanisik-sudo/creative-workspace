"use client";

import { ChevronLeft, ChevronRight, ImagePlus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition, type DragEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { deleteImage } from "../actions";
import type { Palette } from "../palettes";
import type { WorkspaceImage } from "../types";
import { PaletteEditor } from "./PaletteEditor";
import { isUploadableImage, uploadImages } from "../upload";

function Lightbox({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: WorkspaceImage[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const image = images[index];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "ArrowRight") onIndex((index + 1) % images.length);
      if (event.key === "ArrowLeft") onIndex((index - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [index, images.length, onClose, onIndex]);

  if (!image) return null;
  const nav =
    "flex size-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20";
  return createPortal(
    <div
      data-sheet-open
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[90] flex animate-fade-in items-center justify-center bg-black/90 p-4 sm:p-10"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URLs */}
      <img
        src={image.fullUrl ?? image.url ?? ""}
        alt=""
        onClick={(event) => event.stopPropagation()}
        className="max-h-full max-w-full rounded-[10px] object-contain shadow-lg"
      />
      <button
        type="button"
        onClick={onClose}
        aria-label={t("moodboard.close")}
        className={cn(nav, "absolute top-4 right-4")}
      >
        <X size={18} />
      </button>
      {images.length > 1 ? (
        <>
          <button
            type="button"
            aria-label={t("moodboard.previous")}
            onClick={(event) => {
              event.stopPropagation();
              onIndex((index - 1 + images.length) % images.length);
            }}
            className={cn(nav, "absolute left-4")}
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            aria-label={t("moodboard.next")}
            onClick={(event) => {
              event.stopPropagation();
              onIndex((index + 1) % images.length);
            }}
            className={cn(nav, "absolute right-4")}
          >
            <ChevronRight size={20} />
          </button>
        </>
      ) : null}
      <span className="absolute bottom-5 text-caption text-white/60 tabular-nums">
        {index + 1} / {images.length}
      </span>
    </div>,
    document.body,
  );
}

/** Mood images in a masonry wall. Drop, paste or pick files to add; click to view large. */
export function MoodboardModule({
  projectId,
  images,
  viewerId,
  isStudio,
  palette,
  flagged = [],
}: {
  projectId: string;
  images: WorkspaceImage[];
  viewerId: string;
  isStudio: boolean;
  palette: Palette;
  /** Parts with open discussion notes: "palette", "image:<id>". */
  flagged?: string[];
}) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const visible = images.filter((image) => !removed.has(image.id));

  const add = useCallback(
    async (files: File[]) => {
      const usable = files.filter(isUploadableImage);
      if (usable.length === 0) return;
      const previews = usable.map((file) => URL.createObjectURL(file));
      setUploading((current) => [...current, ...previews]);
      const { failed } = await uploadImages(usable, {
        projectId,
        userId: viewerId,
        collection: "moodboard",
      });
      if (failed > 0) toast.show({ title: t("moodboard.uploadFailed"), tone: "error" });
      router.refresh();
      // Let the refreshed images arrive before the placeholders go.
      setTimeout(() => {
        setUploading((current) => current.filter((url) => !previews.includes(url)));
        previews.forEach((url) => URL.revokeObjectURL(url));
      }, 600);
    },
    [projectId, viewerId, router, toast, t],
  );

  // Paste images straight in while the moodboard is open.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable=true]")) return;
      const files = [...(event.clipboardData?.files ?? [])];
      if (files.length > 0) {
        event.preventDefault();
        void add(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [add]);

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void add([...event.dataTransfer.files]);
  };

  const remove = (id: string) => {
    setRemoved((current) => new Set(current).add(id));
    startTransition(async () => {
      const result = await deleteImage(projectId, id);
      if (!result.ok) {
        setRemoved((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
        toast.show({ title: result.error, tone: "error" });
      }
      router.refresh();
    });
  };

  return (
    <div
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={onDrop}
      className="relative flex min-h-[50vh] flex-col gap-5"
    >
      <PaletteEditor
        projectId={projectId}
        palette={palette}
        images={visible}
        flagged={flagged.includes("palette")}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-text-secondary">{t("moodboard.hint")}</p>
        <Button variant="primary" onClick={() => input.current?.click()}>
          <ImagePlus size={16} aria-hidden="true" />
          {t("moodboard.add")}
        </Button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => {
            void add([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
      </div>

      {visible.length === 0 && uploading.length === 0 ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          className="flex flex-1 flex-col items-center justify-center gap-3 rounded-[22px] border border-dashed border-border-strong py-24 text-text-tertiary transition-colors hover:border-text-secondary hover:text-text-secondary"
        >
          <ImagePlus size={32} strokeWidth={1.5} aria-hidden="true" />
          <span className="text-callout">{t("workspace.empty.moodboard")}</span>
        </button>
      ) : (
        <div className="columns-2 gap-2 sm:columns-3 lg:columns-4 [&>*]:mb-2">
          {visible.map((image, index) => {
            const canRemove = isStudio || image.uploadedBy === viewerId;
            const marked = flagged.includes(`image:${image.id}`);
            return (
              <figure
                key={image.id}
                className={cn(
                  "group relative break-inside-avoid overflow-hidden rounded-[14px] bg-surface-muted",
                  marked && "shadow-[0_0_0_3px_var(--danger)]",
                )}
              >
                {marked ? (
                  <span className="pointer-events-none absolute top-2 left-2 z-10 rounded-full bg-danger px-2 py-0.5 text-[11px] font-semibold text-white">
                    {t("notes.changeRequested")}
                  </span>
                ) : null}
                <button type="button" onClick={() => setViewing(index)} className="block w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URLs */}
                  <img
                    src={image.url ?? ""}
                    alt={image.caption ?? ""}
                    loading="lazy"
                    width={image.width ?? undefined}
                    height={image.height ?? undefined}
                    className="h-auto w-full transition-transform duration-500 ease-out group-hover:scale-[1.02]"
                  />
                </button>
                {canRemove ? (
                  <button
                    type="button"
                    onClick={() => remove(image.id)}
                    aria-label={t("moodboard.remove")}
                    className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-visible:opacity-100 max-sm:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                ) : null}
              </figure>
            );
          })}
          {uploading.map((url) => (
            <figure
              key={url}
              className="relative break-inside-avoid overflow-hidden rounded-[14px]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
              <img src={url} alt="" className="h-auto w-full opacity-50" />
              <span className="absolute inset-0 flex items-center justify-center">
                <Spinner size={20} />
              </span>
            </figure>
          ))}
        </div>
      )}

      {dragging ? (
        <div className="pointer-events-none absolute -inset-2 flex items-center justify-center rounded-[22px] border-2 border-dashed border-text bg-surface/80 text-title font-medium backdrop-blur-sm">
          {t("moodboard.drop")}
        </div>
      ) : null}

      {viewing !== null ? (
        <Lightbox
          images={visible}
          index={viewing}
          onIndex={setViewing}
          onClose={() => setViewing(null)}
        />
      ) : null}
    </div>
  );
}
