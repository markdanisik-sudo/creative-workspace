"use client";

import { Pipette, Plus, Sparkles, SwatchBook } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { savePalette } from "../actions";
import {
  dominantColors,
  inkOn,
  MAX_COLORS,
  normalizeHex,
  PALETTE_PRESETS,
  PRESET_FAMILIES,
  type Palette,
  type PaletteColor,
} from "../palettes";
import type { WorkspaceImage } from "../types";

/** Pixels of an image, downscaled, read through a canvas. */
async function samplePixels(url: string): Promise<[number, number, number][]> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.src = url;
  await image.decode();
  const size = 48;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.drawImage(image, 0, 0, size, size);
  const { data } = context.getImageData(0, 0, size, size);
  const pixels: [number, number, number][] = [];
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] > 200) pixels.push([data[index], data[index + 1], data[index + 2]]);
  }
  return pixels;
}

function Swatch({
  color,
  onClick,
  large = false,
}: {
  color: PaletteColor;
  onClick?: () => void;
  large?: boolean;
}) {
  const ink = inkOn(color.hex);
  return (
    <button
      type="button"
      onClick={onClick}
      title={color.name ? `${color.name} ${color.hex}` : color.hex}
      style={{ backgroundColor: color.hex, color: ink }}
      className={cn(
        "flex min-w-0 flex-1 flex-col justify-end text-left transition-transform hover:-translate-y-0.5",
        large ? "h-28 rounded-[14px] p-2.5 sm:h-36" : "h-10 rounded-[8px]",
      )}
    >
      {large ? (
        <>
          {color.name ? (
            <span className="truncate text-caption font-semibold">{color.name}</span>
          ) : null}
          <span className="font-mono text-[11px] uppercase opacity-80">{color.hex}</span>
        </>
      ) : null}
    </button>
  );
}

/**
 * The moodboard's colour palette: start from a film stock, pull the colours
 * out of the moodboard images, or set your own.
 */
export function PaletteEditor({
  projectId,
  palette,
  images,
  flagged,
}: {
  projectId: string;
  palette: Palette;
  images: WorkspaceImage[];
  /** Someone asked for a change to the palette (open discussion note). */
  flagged: boolean;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [current, setCurrent] = useState<Palette>(palette);
  const [synced, setSynced] = useState(palette);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [, startTransition] = useTransition();

  // A newer palette from the server (another person saved) replaces ours.
  if (palette !== synced) {
    setSynced(palette);
    setCurrent(palette);
  }

  const save = (next: Palette) => {
    setCurrent(next);
    startTransition(async () => {
      const result = await savePalette(projectId, next);
      if (!result.ok) toast.show({ title: result.error, tone: "error" });
      router.refresh();
    });
  };

  const extract = async () => {
    const sources = images.flatMap((image) => (image.url ? [image.url] : [])).slice(0, 12);
    if (sources.length === 0) return toast.show({ title: t("palette.noImages"), tone: "error" });
    setExtracting(true);
    try {
      const pixels = (await Promise.all(sources.map(samplePixels))).flat();
      const colors = dominantColors(pixels, 6).map((hex) => ({ hex }));
      save({ colors, notes: current.notes });
    } catch {
      toast.show({ title: t("palette.extractFailed"), tone: "error" });
    } finally {
      setExtracting(false);
    }
  };

  const preset = PALETTE_PRESETS.find((item) => item.id === current.preset);
  const editingColor =
    editing === "new" ? { hex: "#888888" } : editing !== null ? current.colors[editing] : null;

  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-[22px] bg-surface-muted p-4 sm:p-5",
        flagged && "shadow-[0_0_0_2px_var(--danger)]",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <h3 className="flex items-center gap-2 text-callout font-semibold">
            {t("palette.title")}
            {flagged ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-danger px-2 py-0.5 text-[11px] font-semibold text-white">
                {t("notes.changeRequested")}
              </span>
            ) : null}
          </h3>
          <p className="text-caption text-text-secondary">
            {preset ? t("palette.basedOn", { name: preset.name }) : t("palette.hint")}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => setChoosing(true)}>
            <SwatchBook size={14} aria-hidden="true" />
            {t("palette.presets")}
          </Button>
          <Button size="sm" variant="secondary" onClick={extract} loading={extracting}>
            <Sparkles size={14} aria-hidden="true" />
            {t("palette.fromImages")}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setEditing("new")}
            disabled={current.colors.length >= MAX_COLORS}
          >
            <Plus size={14} aria-hidden="true" />
            {t("palette.addColor")}
          </Button>
        </div>
      </div>

      {current.colors.length === 0 ? (
        <button
          type="button"
          onClick={() => setChoosing(true)}
          className="flex h-28 items-center justify-center gap-2 rounded-[14px] border border-dashed border-border-strong text-body text-text-tertiary hover:border-text-secondary hover:text-text-secondary"
        >
          <Pipette size={16} aria-hidden="true" />
          {t("palette.empty")}
        </button>
      ) : (
        <div className="flex gap-1.5">
          {current.colors.map((color, index) => (
            <Swatch
              key={`${color.hex}-${index}`}
              color={color}
              large
              onClick={() => setEditing(index)}
            />
          ))}
        </div>
      )}

      <NotesField
        value={current.notes ?? ""}
        onSave={(notes) => save({ ...current, notes: notes || undefined })}
      />
      {preset ? <p className="text-[11px] text-text-tertiary">{t("palette.disclaimer")}</p> : null}

      {editingColor ? (
        <ColorDialog
          key={String(editing)}
          color={editingColor}
          isNew={editing === "new"}
          onClose={() => setEditing(null)}
          onSave={(color) => {
            const colors =
              editing === "new"
                ? [...current.colors, color]
                : current.colors.map((item, index) => (index === editing ? color : item));
            save({ ...current, colors });
            setEditing(null);
          }}
          onRemove={() => {
            save({ ...current, colors: current.colors.filter((_, index) => index !== editing) });
            setEditing(null);
          }}
        />
      ) : null}

      <Dialog
        open={choosing}
        onClose={() => setChoosing(false)}
        title={t("palette.presets")}
        description={t("palette.presetsBody")}
        className="max-w-[640px]"
      >
        <div className="flex max-h-[60vh] flex-col gap-5 overflow-y-auto pr-1">
          {PRESET_FAMILIES.map((family) => (
            <div key={family} className="flex flex-col gap-2">
              <h4 className="text-caption font-semibold tracking-wide text-text-secondary uppercase">
                {t(`palette.families.${family}`)}
              </h4>
              <ul className="grid gap-2 sm:grid-cols-2">
                {PALETTE_PRESETS.filter((item) => item.family === family).map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        save({
                          colors: item.colors.map((hex) => ({ hex })),
                          preset: item.id,
                          notes: current.notes,
                        });
                        setChoosing(false);
                      }}
                      className={cn(
                        "flex w-full flex-col gap-2 rounded-[14px] bg-surface-muted p-3 text-left hover:bg-surface-pressed",
                        current.preset === item.id && "shadow-[0_0_0_2px_var(--text)]",
                      )}
                    >
                      <span className="text-body font-semibold">{item.name}</span>
                      <span className="flex gap-1">
                        {item.colors.map((hex) => (
                          <span
                            key={hex}
                            className="h-6 flex-1 rounded-[6px]"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Dialog>
    </section>
  );
}

function NotesField({ value, onSave }: { value: string; onSave: (value: string) => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    setDraft(value);
  }
  return (
    <textarea
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft.trim() !== value) onSave(draft.trim());
      }}
      placeholder={t("palette.notesPlaceholder")}
      aria-label={t("palette.notes")}
      rows={2}
      maxLength={1000}
      className="resize-none rounded-[12px] bg-surface px-3 py-2 text-body outline-none placeholder:text-text-tertiary focus-visible:shadow-[0_0_0_2px_var(--text)]"
    />
  );
}

function ColorDialog({
  color,
  isNew,
  onClose,
  onSave,
  onRemove,
}: {
  color: PaletteColor;
  isNew: boolean;
  onClose: () => void;
  onSave: (color: PaletteColor) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();
  const [hex, setHex] = useState(color.hex);
  const [text, setText] = useState(color.hex);
  const [name, setName] = useState(color.name ?? "");
  const valid = normalizeHex(text);

  return (
    <Dialog open onClose={onClose} title={isNew ? t("palette.addColor") : t("palette.editColor")}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!valid) return;
          onSave(name.trim() ? { hex: valid, name: name.trim() } : { hex: valid });
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex items-end gap-3">
          <label
            className="relative size-20 shrink-0 cursor-pointer overflow-hidden rounded-[16px] shadow-sm"
            style={{ backgroundColor: valid ?? hex }}
          >
            <span className="sr-only">{t("palette.pick")}</span>
            <input
              type="color"
              value={hex}
              onChange={(event) => {
                setHex(event.target.value);
                setText(event.target.value);
              }}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
          </label>
          <TextField
            label="HEX"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              const next = normalizeHex(event.target.value);
              if (next) setHex(next);
            }}
            error={text && !valid ? t("palette.invalidHex") : undefined}
            className="flex-1 font-mono"
            maxLength={7}
          />
        </div>
        <TextField
          label={t("palette.colorName")}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("palette.colorNamePlaceholder")}
          maxLength={40}
        />
        <div className="flex items-center justify-between gap-2">
          {!isNew ? (
            <Button variant="danger" size="sm" onClick={onRemove}>
              {t("palette.removeColor")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="primary" disabled={!valid}>
              {t("common.save")}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
