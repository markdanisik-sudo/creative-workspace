import { ImagePlus, MapPin } from "lucide-react";
import type { Phase } from "@/features/projects/types";
import { PHASES } from "@/features/projects/types";
import type { Task } from "@/features/hub/types";
import type { Translator } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/cn";
import type { Palette, PaletteColor } from "./palettes";
import { LIST_MODULES, type ListModuleId, type PlanItem } from "./plan";
import { displayValue, itemTitle } from "./plan-format";
import { DEFAULT_GROUPS, specGroup } from "./shot-options";
import {
  BRIEF_FIELDS,
  type Brief,
  type ProjectLocation,
  type Shot,
  type ShotSpecs,
  type WorkspaceImage,
} from "./types";

type T = Translator["t"];

function Empty({ children }: { children: string }) {
  return (
    <p className="mt-auto text-title font-medium text-balance text-text-tertiary">{children}</p>
  );
}

export function specLabel(t: T, key: string, value: string | undefined): string | undefined {
  if (!value) return undefined;
  const option = specGroup(key)?.options.find((item) => item.value === value);
  return option?.labelKey ? t(option.labelKey) : value;
}

export function BriefPreview({ brief, t }: { brief: Brief; t: T }) {
  const filled = BRIEF_FIELDS.filter((field) => brief[field]);
  if (filled.length === 0) return <Empty>{t("workspace.empty.brief")}</Empty>;
  return (
    <dl className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {filled.slice(0, 3).map((field, index) => (
        <div key={field} className="flex min-h-0 flex-col gap-1">
          <dt className="text-caption text-text-secondary">{t(`brief.fields.${field}`)}</dt>
          <dd
            className={cn(
              "whitespace-pre-line text-text",
              index === 0 ? "line-clamp-4 text-title font-medium" : "line-clamp-2 text-body",
            )}
          >
            {brief[field]}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Collage cells for 1–5 images in a 4×2 grid: the first one always leads. */
const COLLAGE: Record<number, string[]> = {
  1: ["col-span-4 row-span-2"],
  2: ["col-span-2 row-span-2", "col-span-2 row-span-2"],
  3: ["col-span-2 row-span-2", "col-span-2", "col-span-2"],
  4: ["col-span-2 row-span-2", "col-span-2", "", ""],
  5: ["col-span-2 row-span-2", "", "", "", ""],
};

function PaletteStrip({ colors }: { colors: PaletteColor[] }) {
  if (colors.length === 0) return null;
  return (
    <div className="absolute inset-x-3 bottom-3 z-10 flex h-7 overflow-hidden rounded-[9px] shadow-md ring-1 ring-black/10">
      {colors.map((color, index) => (
        <span
          key={`${color.hex}-${index}`}
          className="flex-1"
          style={{ backgroundColor: color.hex }}
        />
      ))}
    </div>
  );
}

export function MoodboardPreview({
  images,
  palette,
  t,
}: {
  images: WorkspaceImage[];
  palette?: Palette;
  t: T;
}) {
  const all = images.filter((image) => image.url);
  const shown = all.slice(0, 5);
  const colors = palette?.colors ?? [];
  if (shown.length === 0 && colors.length > 0) {
    return (
      <div className="mt-auto flex h-24 overflow-hidden rounded-[14px]">
        {colors.map((color, index) => (
          <span
            key={`${color.hex}-${index}`}
            className="flex-1"
            style={{ backgroundColor: color.hex }}
          />
        ))}
      </div>
    );
  }
  if (shown.length === 0) {
    return (
      <div className="m-5 mt-14 flex flex-1 flex-col items-center justify-center gap-3 rounded-[18px] border border-dashed border-border-strong text-text-tertiary sm:m-6 sm:mt-14">
        <ImagePlus size={28} strokeWidth={1.5} aria-hidden="true" />
        <span className="text-body">{t("workspace.empty.moodboard")}</span>
      </div>
    );
  }
  const cells = COLLAGE[shown.length];
  const more = all.length - shown.length;
  return (
    <div className="grid h-full grid-cols-4 grid-rows-2 gap-0.5 bg-surface-muted">
      {shown.map((image, index) => (
        <div key={image.id} className={cn("relative min-h-0 overflow-hidden", cells[index])}>
          {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URLs */}
          <img src={image.url!} alt="" loading="lazy" className="size-full object-cover" />
          {more > 0 && index === shown.length - 1 ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-title font-semibold text-white">
              +{more}
            </span>
          ) : null}
        </div>
      ))}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/35 to-transparent" />
      <PaletteStrip colors={colors} />
    </div>
  );
}

export function ShotsPreview({
  shots,
  defaults,
  t,
  tp,
}: {
  shots: Shot[];
  defaults: ShotSpecs;
  t: T;
  tp: Translator["tp"];
}) {
  const setup = DEFAULT_GROUPS.map((group) => defaults[group.key]).filter(Boolean);
  const done = shots.filter((shot) => shot.done).length;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {setup.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {setup.slice(0, 5).map((value) => (
            <span
              key={value}
              className="rounded-full bg-surface-muted px-2.5 py-1 text-caption font-medium"
            >
              {value}
            </span>
          ))}
        </div>
      ) : null}
      {shots.length === 0 ? (
        <Empty>{t("workspace.empty.shots")}</Empty>
      ) : (
        <>
          <ol className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border-strong">
            {shots.slice(0, 5).map((shot, index) => (
              <li
                key={shot.id}
                className="flex items-baseline gap-3 border-b border-border-strong py-2 text-body"
              >
                <span className="w-6 shrink-0 text-caption text-text-tertiary tabular-nums">
                  {index + 1}
                </span>
                <span className="w-12 shrink-0 text-caption font-semibold">
                  {shot.specs.size ?? "—"}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate",
                    shot.done && "text-text-tertiary line-through",
                  )}
                >
                  {shot.description || "—"}
                </span>
                <span className="shrink-0 text-caption text-text-secondary">
                  {shot.specs.focal ?? ""}
                </span>
              </li>
            ))}
          </ol>
          <p className="text-caption text-text-secondary">
            {tp("plural.shot", shots.length)} · {t("shots.done")} {done}
          </p>
        </>
      )}
    </div>
  );
}

const STATUS_DOT = {
  idea: "bg-text-tertiary",
  scouting: "bg-[#f5a524]",
  confirmed: "bg-[#30a46c]",
} as const;

export function LocationsPreview({ locations, t }: { locations: ProjectLocation[]; t: T }) {
  if (locations.length === 0) return <Empty>{t("workspace.empty.locations")}</Empty>;
  return (
    <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      {locations.slice(0, 4).map((location) => {
        const photo = location.photos.find((image) => image.url);
        return (
          <li key={location.id} className="flex items-center gap-3">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed storage URLs
              <img
                src={photo.url!}
                alt=""
                className="size-11 shrink-0 rounded-[10px] object-cover"
              />
            ) : (
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-surface-muted text-text-tertiary">
                <MapPin size={16} aria-hidden="true" />
              </span>
            )}
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-body font-semibold">{location.name}</span>
              <span className="flex items-center gap-1.5 truncate text-caption text-text-secondary">
                <span
                  className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[location.status])}
                />
                {t(`locations.status.${location.status}`)}
                {location.address ? ` · ${location.address}` : ""}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function TasksPreview({
  tasks,
  currentPhase,
  t,
}: {
  tasks: Task[];
  currentPhase: Phase;
  t: T;
}) {
  if (tasks.length === 0) return <Empty>{t("workspace.empty.tasks")}</Empty>;
  const done = tasks.filter((task) => task.done).length;
  return (
    <div className="mt-auto flex flex-col gap-3">
      <div className="grid grid-cols-5 gap-1">
        {PHASES.map((phase) => {
          const column = tasks.filter((task) => task.phase === phase);
          const ratio = column.length
            ? column.filter((task) => task.done).length / column.length
            : 0;
          // A phase with all its tasks done turns green.
          const finished = ratio === 1;
          return (
            <div key={phase} className="flex flex-col gap-1.5">
              <div className="h-1 overflow-hidden rounded-full bg-border-strong">
                <div
                  className={cn(
                    "h-full rounded-full transition-colors duration-500",
                    finished ? "bg-success" : "bg-text",
                  )}
                  style={{ width: `${ratio * 100}%` }}
                />
              </div>
              <span
                className={cn(
                  "truncate text-[11px]",
                  phase === currentPhase ? "font-semibold text-text" : "text-text-tertiary",
                )}
              >
                {t(`phases.${phase}`)} {column.length ? column.length : ""}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-caption text-text-secondary">
        {t("workspace.tasksOpen", { open: tasks.length - done, done })}
      </p>
    </div>
  );
}

/** A list box on the overview: progress and the first rows. */
export function ListPreview({
  module,
  items,
  t,
  locale,
}: {
  module: ListModuleId;
  items: PlanItem[];
  t: T;
  locale: Locale;
}) {
  if (items.length === 0) return <Empty>{t(`workspace.empty.${module}`)}</Empty>;
  const done = items.filter((item) => item.done).length;
  // The first fact a row has filled in (lens, platform, role…).
  const firstMeta = (item: PlanItem) =>
    LIST_MODULES[module].meta
      .map((key) => displayValue(t, locale, module, key, item.data[key]))
      .find(Boolean) ?? "";
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <ul className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border-strong">
        {items.slice(0, 5).map((item) => (
          <li
            key={item.id}
            className="flex items-baseline gap-3 border-b border-border-strong py-2 text-body"
          >
            <span
              className={cn(
                "min-w-0 flex-1 truncate",
                item.done && "text-text-tertiary line-through",
              )}
            >
              {itemTitle(item)}
            </span>
            <span className="shrink-0 text-caption text-text-secondary">{firstMeta(item)}</span>
          </li>
        ))}
      </ul>
      <p className="text-caption text-text-secondary">
        {t(`boxes.doneLabel.${module}`)} {t("boxes.doneCount", { done, total: items.length })}
      </p>
    </div>
  );
}
