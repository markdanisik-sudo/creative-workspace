"use client";

import {
  ArrowDown,
  ArrowUp,
  Camera,
  Check,
  Copy,
  Plus,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { createShot, deleteShot, saveShotDefaults, updateShot } from "../actions";
import { Configurator } from "../Configurator";
import { DEFAULT_GROUPS, effectiveSpec, SPEC_GROUPS, specGroup } from "../shot-options";
import { Sheet } from "../Sheet";
import { DAY_NIGHT, INT_EXT, type ProjectLocation, type Shot, type ShotSpecs } from "../types";

const CAMERA_GROUPS = SPEC_GROUPS.filter((group) =>
  ["camera", "optics", "focal", "resolution", "codec", "aspect", "fps", "shutter"].includes(
    group.key,
  ),
);
const FRAME_GROUPS = SPEC_GROUPS.filter((group) =>
  ["size", "angle", "movement", "support"].includes(group.key),
);

function Segmented<T extends string>({
  options,
  value,
  label,
  onChange,
}: {
  options: readonly T[];
  value: T | null;
  label: (option: T) => string;
  onChange: (value: T | null) => void;
}) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full bg-surface-muted p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(value === option ? null : option)}
          className={cn(
            "h-8 rounded-full px-3 text-caption font-semibold transition-colors",
            value === option
              ? "bg-surface text-text shadow-sm"
              : "text-text-secondary hover:text-text",
          )}
        >
          {label(option)}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-caption font-medium text-text-secondary">{label}</span>
      {children}
    </label>
  );
}

const INPUT =
  "w-full rounded-[12px] bg-surface-muted px-3.5 py-2.5 text-body outline-none placeholder:text-text-tertiary focus-visible:shadow-[0_0_0_2px_var(--text)]";

function ShotSheet({
  shot,
  number,
  total,
  defaults,
  locations,
  onPatch,
  onClose,
  onDuplicate,
  onDelete,
  onMove,
}: {
  shot: Shot;
  number: number;
  total: number;
  defaults: ShotSpecs;
  locations: ProjectLocation[];
  onPatch: (patch: Partial<Shot>, save?: boolean) => void;
  onClose: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const { t } = useI18n();
  const iconButton =
    "flex size-8 items-center justify-center rounded-full text-text-secondary hover:bg-surface-muted hover:text-text disabled:opacity-30";
  return (
    <Sheet
      title={t("shots.shotTitle", { number })}
      onClose={onClose}
      actions={
        <>
          <button
            type="button"
            className={iconButton}
            disabled={number === 1}
            onClick={() => onMove(-1)}
            aria-label={t("shots.moveUp")}
            title={t("shots.moveUp")}
          >
            <ArrowUp size={15} />
          </button>
          <button
            type="button"
            className={iconButton}
            disabled={number === total}
            onClick={() => onMove(1)}
            aria-label={t("shots.moveDown")}
            title={t("shots.moveDown")}
          >
            <ArrowDown size={15} />
          </button>
          <button
            type="button"
            className={iconButton}
            onClick={onDuplicate}
            aria-label={t("shots.duplicate")}
            title={t("shots.duplicate")}
          >
            <Copy size={15} />
          </button>
          <button
            type="button"
            className={cn(iconButton, "hover:text-danger")}
            onClick={onDelete}
            aria-label={t("shots.delete")}
            title={t("shots.delete")}
          >
            <Trash2 size={15} />
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <button
          type="button"
          onClick={() => onPatch({ done: !shot.done })}
          className={cn(
            "flex h-11 items-center justify-center gap-2 rounded-full text-body font-semibold transition-colors",
            shot.done ? "bg-[#30a46c] text-white" : "bg-surface-muted text-text",
          )}
        >
          <Check size={16} aria-hidden="true" />
          {shot.done ? t("shots.done") : t("shots.markDone")}
        </button>

        <div className="grid grid-cols-[96px_1fr] gap-3">
          <Field label={t("shots.scene")}>
            <input
              defaultValue={shot.scene ?? ""}
              maxLength={40}
              onChange={(event) => onPatch({ scene: event.target.value }, false)}
              onBlur={(event) => onPatch({ scene: event.target.value })}
              className={INPUT}
            />
          </Field>
          <Field label={t("shots.location")}>
            <select
              value={shot.locationId ?? ""}
              onChange={(event) => onPatch({ locationId: event.target.value || null })}
              className={cn(INPUT, "h-[42px] py-0")}
            >
              <option value="">{t("shots.noLocation")}</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          <Segmented
            options={INT_EXT}
            value={shot.intExt}
            label={(option) => t(`shots.intExt.${option}`)}
            onChange={(value) => onPatch({ intExt: value })}
          />
          <Segmented
            options={DAY_NIGHT}
            value={shot.dayNight}
            label={(option) => t(`shots.dayNight.${option}`)}
            onChange={(value) => onPatch({ dayNight: value })}
          />
        </div>

        <Field label={t("shots.description")}>
          <textarea
            defaultValue={shot.description ?? ""}
            rows={3}
            maxLength={2000}
            placeholder={t("shots.descriptionPlaceholder")}
            onChange={(event) => onPatch({ description: event.target.value }, false)}
            onBlur={(event) => onPatch({ description: event.target.value })}
            className={cn(INPUT, "resize-none")}
          />
        </Field>

        <section className="flex flex-col gap-2.5">
          <h3 className="flex items-center gap-2 text-caption font-semibold tracking-wide text-text-secondary uppercase">
            <Camera size={13} aria-hidden="true" />
            {t("shots.specsTitle")}
          </h3>
          <Configurator
            groups={CAMERA_GROUPS}
            values={shot.specs}
            defaults={defaults}
            onChange={(key, value) => onPatch({ specs: { ...shot.specs, [key]: value } })}
          />
        </section>

        <section className="flex flex-col gap-2.5">
          <h3 className="flex items-center gap-2 text-caption font-semibold tracking-wide text-text-secondary uppercase">
            <SlidersHorizontal size={13} aria-hidden="true" />
            {t("shots.frameTitle")}
          </h3>
          <Configurator
            groups={FRAME_GROUPS}
            values={shot.specs}
            onChange={(key, value) => onPatch({ specs: { ...shot.specs, [key]: value } })}
          />
        </section>

        <div className="grid grid-cols-[120px_1fr] gap-3">
          <Field label={t("shots.duration")}>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={shot.durationSeconds ?? ""}
              onBlur={(event) =>
                onPatch({
                  durationSeconds: event.target.value === "" ? null : Number(event.target.value),
                })
              }
              className={INPUT}
            />
          </Field>
          <Field label={t("shots.notes")}>
            <input
              defaultValue={shot.notes ?? ""}
              maxLength={5000}
              onBlur={(event) => onPatch({ notes: event.target.value })}
              className={INPUT}
            />
          </Field>
        </div>
      </div>
    </Sheet>
  );
}

/** A production shot list: one row per shot, a configurator per shot, a project camera setup. */
export function ShotListModule({
  projectId,
  shots: initial,
  defaults: initialDefaults,
  locations,
}: {
  projectId: string;
  shots: Shot[];
  defaults: ShotSpecs;
  locations: ProjectLocation[];
}) {
  const { t, tp } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [shots, setShots] = useState(initial);
  const [synced, setSynced] = useState(initial);
  const [defaults, setDefaults] = useState(initialDefaults);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingDefaults, setEditingDefaults] = useState(false);
  const [, startTransition] = useTransition();

  // Fresh server data (after a refresh) replaces local edits that were saved.
  if (synced !== initial) {
    setSynced(initial);
    setShots(initial);
  }

  const run = (work: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const result = await work();
      if (!result.ok) toast.show({ title: result.error ?? t("errors.generic"), tone: "error" });
      router.refresh();
    });

  const patch = (id: string, change: Partial<Shot>, save = true) => {
    setShots((current) => current.map((shot) => (shot.id === id ? { ...shot, ...change } : shot)));
    if (save) run(() => updateShot(projectId, id, change));
  };

  const add = (copyFrom?: Shot) =>
    startTransition(async () => {
      const last = shots.at(-1)?.position ?? 0;
      const position = copyFrom
        ? (copyFrom.position +
            (shots[shots.indexOf(copyFrom) + 1]?.position ?? copyFrom.position + 2)) /
          2
        : last + 1;
      const result = await createShot(projectId, position, copyFrom);
      if (!result.ok) return toast.show({ title: result.error, tone: "error" });
      const { id } = result.data;
      setShots((current) =>
        [...current, { ...(copyFrom ?? emptyShot()), id, position, done: false }].sort(
          (a, b) => a.position - b.position,
        ),
      );
      setOpenId(id);
      router.refresh();
    });

  const remove = (id: string) => {
    setOpenId(null);
    setShots((current) => current.filter((shot) => shot.id !== id));
    run(() => deleteShot(projectId, id));
  };

  const move = (shot: Shot, direction: -1 | 1) => {
    const index = shots.indexOf(shot);
    const neighbour = shots[index + direction];
    if (!neighbour) return;
    const next = shots.map((item) =>
      item.id === shot.id
        ? { ...item, position: neighbour.position }
        : item.id === neighbour.id
          ? { ...item, position: shot.position }
          : item,
    );
    setShots(next.sort((a, b) => a.position - b.position));
    run(async () => {
      const first = await updateShot(projectId, shot.id, { position: neighbour.position });
      if (!first.ok) return first;
      return updateShot(projectId, neighbour.id, { position: shot.position });
    });
  };

  const changeDefault = (key: string, value: string | undefined) => {
    const next = { ...defaults, [key]: value };
    if (!value) delete next[key];
    setDefaults(next);
    run(() => saveShotDefaults(projectId, next));
  };

  const open = shots.find((shot) => shot.id === openId);
  const done = shots.filter((shot) => shot.done).length;
  const label = (key: string, value: string | undefined) => {
    if (!value) return "";
    const option = specGroup(key)?.options.find((item) => item.value === value);
    return option?.labelKey ? t(option.labelKey).split(" · ")[0] : value;
  };
  const setup = DEFAULT_GROUPS.map((group) => defaults[group.key]).filter(Boolean);

  return (
    <div className="flex flex-col gap-6">
      {/* Project camera setup */}
      <button
        type="button"
        onClick={() => setEditingDefaults(true)}
        className="flex flex-col gap-3 rounded-[20px] bg-surface-muted p-4 text-left transition-colors hover:bg-surface-pressed sm:flex-row sm:items-center sm:justify-between sm:p-5"
      >
        <span className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2 text-body font-semibold">
            <Camera size={15} aria-hidden="true" />
            {t("shots.defaultsTitle")}
          </span>
          <span className="text-caption text-text-secondary">{t("shots.defaultsBody")}</span>
        </span>
        <span className="flex flex-wrap gap-1.5">
          {setup.length > 0 ? (
            setup.map((value) => (
              <span
                key={value}
                className="rounded-full bg-surface px-2.5 py-1 text-caption font-semibold shadow-sm"
              >
                {value}
              </span>
            ))
          ) : (
            <span className="text-caption text-text-tertiary">{t("shots.notSet")}</span>
          )}
        </span>
      </button>

      <div className="flex items-center justify-between gap-3">
        <p className="text-caption text-text-secondary tabular-nums">
          {t("shots.summary", { shots: tp("plural.shot", shots.length), done })}
        </p>
        <Button variant="primary" onClick={() => add()}>
          <Plus size={16} aria-hidden="true" />
          {t("shots.add")}
        </Button>
      </div>

      {shots.length === 0 ? (
        <button
          type="button"
          onClick={() => add()}
          className="rounded-[22px] border border-dashed border-border-strong py-20 text-callout text-text-tertiary hover:border-text-secondary hover:text-text-secondary"
        >
          {t("workspace.empty.shots")}
        </button>
      ) : (
        <>
          {/* Phones: one card per shot. */}
          <ol className="flex flex-col gap-2 sm:hidden">
            {shots.map((shot, index) => (
              <li key={shot.id}>
                <div
                  className={cn(
                    "flex items-start gap-3 rounded-[16px] bg-surface-muted p-3.5",
                    shot.done && "text-text-tertiary",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(shot.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <span className="w-5 shrink-0 pt-0.5 text-body font-semibold tabular-nums">
                      {index + 1}
                    </span>
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className={cn("text-body", shot.done && "line-through")}>
                        {shot.description || "—"}
                      </span>
                      <span className="flex flex-wrap gap-x-2 text-caption text-text-secondary">
                        {[shot.specs.size, label("movement", shot.specs.movement), shot.specs.focal]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={shot.done ? t("shots.markOpen") : t("shots.markDone")}
                    onClick={() => patch(shot.id, { done: !shot.done })}
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                      shot.done
                        ? "border-[#30a46c] bg-[#30a46c] text-white"
                        : "border-border-strong",
                    )}
                  >
                    {shot.done ? <Check size={13} /> : null}
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[760px] border-collapse text-left text-body">
              <thead>
                <tr className="border-b border-border-strong text-caption text-text-secondary">
                  <th className="w-12 py-2 pl-4 font-medium sm:pl-2">#</th>
                  <th className="w-16 py-2 font-medium">{t("shots.scene")}</th>
                  <th className="py-2 font-medium">{t("shots.description")}</th>
                  <th className="w-20 py-2 font-medium">{t("shots.spec.size")}</th>
                  <th className="w-28 py-2 font-medium">{t("shots.spec.movement")}</th>
                  <th className="w-24 py-2 font-medium">{t("shots.spec.focal")}</th>
                  <th className="w-40 py-2 font-medium">{t("shots.spec.camera")}</th>
                  <th className="w-16 py-2 font-medium">{t("shots.spec.fps")}</th>
                  <th className="w-12 py-2 pr-4 font-medium sm:pr-2" />
                </tr>
              </thead>
              <tbody>
                {shots.map((shot, index) => {
                  const camera = effectiveSpec("camera", shot.specs, defaults);
                  const fps = effectiveSpec("fps", shot.specs, defaults);
                  return (
                    <tr
                      key={shot.id}
                      onClick={() => setOpenId(shot.id)}
                      className={cn(
                        "cursor-pointer border-b border-border transition-colors hover:bg-surface-muted",
                        shot.done && "text-text-tertiary",
                      )}
                    >
                      <td className="py-3 pl-4 font-semibold tabular-nums sm:pl-2">{index + 1}</td>
                      <td className="py-3 tabular-nums">{shot.scene ?? ""}</td>
                      <td className="max-w-0 py-3 pr-4">
                        <span className={cn("block truncate", shot.done && "line-through")}>
                          {shot.description || <span className="text-text-tertiary">—</span>}
                        </span>
                        {shot.intExt || shot.dayNight ? (
                          <span className="text-caption text-text-tertiary">
                            {[
                              shot.intExt && t(`shots.intExt.${shot.intExt}`),
                              shot.dayNight && t(`shots.dayNight.${shot.dayNight}`),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 font-semibold">{shot.specs.size ?? ""}</td>
                      <td className="py-3">{label("movement", shot.specs.movement)}</td>
                      <td className="py-3 tabular-nums">{shot.specs.focal ?? ""}</td>
                      <td className={cn("py-3", camera.inherited && "text-text-secondary")}>
                        {camera.value ?? ""}
                      </td>
                      <td
                        className={cn("py-3 tabular-nums", fps.inherited && "text-text-secondary")}
                      >
                        {fps.value ?? ""}
                      </td>
                      <td className="py-3 pr-4 sm:pr-2">
                        <button
                          type="button"
                          aria-label={shot.done ? t("shots.markOpen") : t("shots.markDone")}
                          onClick={(event) => {
                            event.stopPropagation();
                            patch(shot.id, { done: !shot.done });
                          }}
                          className={cn(
                            "flex size-6 items-center justify-center rounded-full border-[1.5px] transition-colors",
                            shot.done
                              ? "border-[#30a46c] bg-[#30a46c] text-white"
                              : "border-border-strong",
                          )}
                        >
                          {shot.done ? <Check size={12} /> : null}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {open ? (
        <ShotSheet
          key={open.id}
          shot={open}
          number={shots.indexOf(open) + 1}
          total={shots.length}
          defaults={defaults}
          locations={locations}
          onPatch={(change, save) => patch(open.id, change, save)}
          onClose={() => setOpenId(null)}
          onDuplicate={() => add(open)}
          onDelete={() => remove(open.id)}
          onMove={(direction) => move(open, direction)}
        />
      ) : null}

      {editingDefaults ? (
        <Sheet title={t("shots.defaultsTitle")} onClose={() => setEditingDefaults(false)}>
          <p className="mb-4 text-body text-text-secondary">{t("shots.defaultsBody")}</p>
          <Configurator groups={DEFAULT_GROUPS} values={defaults} onChange={changeDefault} />
        </Sheet>
      ) : null}
    </div>
  );
}

function emptyShot(): Shot {
  return {
    id: "",
    position: 0,
    scene: null,
    description: null,
    intExt: null,
    dayNight: null,
    locationId: null,
    durationSeconds: null,
    specs: {},
    notes: null,
    done: false,
  };
}
