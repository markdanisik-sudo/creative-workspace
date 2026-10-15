"use client";

import { ImagePlus, MapPin, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { deleteImage, deleteLocation, saveLocation } from "../actions";
import { LOCATION_STATUSES, type LocationStatus, type ProjectLocation, type Shot } from "../types";
import { uploadImages } from "../upload";

const STATUS_STYLE: Record<LocationStatus, string> = {
  idea: "bg-surface-muted text-text-secondary",
  scouting: "bg-[#f5a524]/15 text-[#a35c00] dark:text-[#f5c26b]",
  confirmed: "bg-[#30a46c]/15 text-[#1d7a4c] dark:text-[#5bd49a]",
};

function mapsUrl(address: string) {
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
}

function LocationDialog({
  projectId,
  location,
  viewerId,
  isStudio,
  onClose,
  onCreated,
}: {
  projectId: string;
  location: ProjectLocation | null;
  viewerId: string;
  isStudio: boolean;
  onClose: () => void;
  /** A new location got its id: let the parent show its photos as they arrive. */
  onCreated?: (id: string) => void;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const photoInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<LocationStatus>(location?.status ?? "idea");
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  // A new location stays open after saving so photos can be added straight away.
  const [savedId, setSavedId] = useState<string | null>(location?.id ?? null);
  const [, startTransition] = useTransition();

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (name: string) => String(form.get(name) ?? "");
    setPending(true);
    const result = await saveLocation(projectId, savedId, {
      name: get("name"),
      address: get("address"),
      contact: get("contact"),
      notes: get("notes"),
      status,
    });
    setPending(false);
    if (!result.ok) return toast.show({ title: result.error, tone: "error" });
    router.refresh();
    if (savedId) onClose();
    else {
      setSavedId(result.data.id);
      onCreated?.(result.data.id);
    }
  };

  const addPhotos = async (files: File[]) => {
    if (!savedId || files.length === 0) return;
    setUploading(true);
    const { failed } = await uploadImages(files, {
      projectId,
      userId: viewerId,
      collection: "location",
      locationId: savedId,
    });
    setUploading(false);
    if (failed > 0) toast.show({ title: t("moodboard.uploadFailed"), tone: "error" });
    router.refresh();
  };

  const remove = () =>
    startTransition(async () => {
      if (!savedId) return;
      const result = await deleteLocation(projectId, savedId);
      if (!result.ok) return toast.show({ title: result.error, tone: "error" });
      router.refresh();
      onClose();
    });

  return (
    <Dialog
      open
      onClose={onClose}
      title={savedId ? t("locations.edit") : t("locations.add")}
      className="max-w-[560px]"
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <TextField
          label={t("locations.name")}
          name="name"
          defaultValue={location?.name}
          placeholder={t("locations.namePlaceholder")}
          required
          maxLength={200}
          autoFocus
        />
        <TextField
          label={t("locations.address")}
          name="address"
          defaultValue={location?.address ?? ""}
          maxLength={500}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-caption font-medium text-text-secondary">
            {t("locations.statusLabel")}
          </span>
          <div className="inline-flex w-fit gap-1 rounded-full bg-surface-muted p-1">
            {LOCATION_STATUSES.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={status === option}
                onClick={() => setStatus(option)}
                className={cn(
                  "h-8 rounded-full px-3.5 text-caption font-semibold transition-colors",
                  status === option ? "bg-surface text-text shadow-sm" : "text-text-secondary",
                )}
              >
                {t(`locations.status.${option}`)}
              </button>
            ))}
          </div>
        </div>
        <TextField
          label={t("locations.contact")}
          name="contact"
          defaultValue={location?.contact ?? ""}
          maxLength={500}
        />
        <TextArea
          label={t("locations.notes")}
          name="notes"
          defaultValue={location?.notes ?? ""}
          rows={3}
          maxLength={5000}
        />

        {savedId ? (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(location?.photos ?? []).map((photo) => (
                <div key={photo.id} className="group relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URLs */}
                  <img
                    src={photo.url ?? ""}
                    alt=""
                    className="size-20 rounded-[12px] object-cover"
                  />
                  {isStudio || photo.uploadedBy === viewerId ? (
                    <button
                      type="button"
                      aria-label={t("moodboard.remove")}
                      onClick={() =>
                        startTransition(async () => {
                          await deleteImage(projectId, photo.id);
                          router.refresh();
                        })
                      }
                      className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 max-sm:opacity-100"
                    >
                      <Trash2 size={11} />
                    </button>
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                onClick={() => photoInput.current?.click()}
                className="flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed border-border-strong text-[11px] text-text-secondary hover:border-text-secondary"
              >
                {uploading ? <Spinner size={16} /> : <ImagePlus size={18} aria-hidden="true" />}
                {t("locations.addPhotos")}
              </button>
              <input
                ref={photoInput}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(event) => {
                  void addPhotos([...(event.target.files ?? [])]);
                  event.target.value = "";
                }}
              />
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 pt-1">
          {savedId ? (
            <Button variant="danger" size="sm" onClick={remove}>
              {t("locations.delete")}
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

/** Location cards: a photo, the status of the scout, the address and the shots planned there. */
export function LocationsModule({
  projectId,
  locations,
  shots,
  viewerId,
  isStudio,
}: {
  projectId: string;
  locations: ProjectLocation[];
  shots: Shot[];
  viewerId: string;
  isStudio: boolean;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const currentId = editing === "new" ? createdId : editing;
  const current = currentId ? (locations.find((item) => item.id === currentId) ?? null) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => setEditing("new")}>
          <Plus size={16} aria-hidden="true" />
          {t("locations.add")}
        </Button>
      </div>

      {locations.length === 0 ? (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex flex-col items-center gap-3 rounded-[22px] border border-dashed border-border-strong py-20 text-text-tertiary hover:border-text-secondary hover:text-text-secondary"
        >
          <MapPin size={28} strokeWidth={1.5} aria-hidden="true" />
          <span className="text-callout">{t("workspace.empty.locations")}</span>
        </button>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => {
            const photo = location.photos.find((image) => image.url);
            const shotCount = shots.filter((shot) => shot.locationId === location.id).length;
            return (
              <li key={location.id}>
                <div className="group flex h-full flex-col overflow-hidden rounded-[20px] bg-surface-muted">
                  <button
                    type="button"
                    onClick={() => setEditing(location.id)}
                    className="flex flex-1 flex-col text-left"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-surface-pressed">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element -- signed storage URLs
                        <img
                          src={photo.url!}
                          alt=""
                          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center text-text-tertiary">
                          <MapPin size={28} strokeWidth={1.5} aria-hidden="true" />
                        </span>
                      )}
                      <span
                        className={cn(
                          "absolute top-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur",
                          STATUS_STYLE[location.status],
                        )}
                      >
                        {t(`locations.status.${location.status}`)}
                      </span>
                      {location.photos.length > 1 ? (
                        <span className="absolute right-3 bottom-3 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-semibold text-white">
                          {location.photos.length}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-1 p-4">
                      <span className="text-callout font-semibold">{location.name}</span>
                      {location.address ? (
                        <span className="text-caption text-text-secondary">{location.address}</span>
                      ) : null}
                      {location.notes ? (
                        <span className="line-clamp-2 pt-1 text-body text-text-secondary">
                          {location.notes}
                        </span>
                      ) : null}
                    </div>
                  </button>
                  <div className="flex items-center justify-between gap-2 px-4 pb-4 text-caption">
                    <span className="text-text-tertiary">
                      {shotCount > 0 ? t("locations.shotsHere", { count: shotCount }) : ""}
                    </span>
                    {location.address ? (
                      <a
                        href={mapsUrl(location.address)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold hover:underline"
                      >
                        <MapPin size={12} aria-hidden="true" />
                        {t("locations.openMap")}
                      </a>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing ? (
        <LocationDialog
          key={editing}
          projectId={projectId}
          location={current}
          viewerId={viewerId}
          isStudio={isStudio}
          onClose={() => {
            setEditing(null);
            setCreatedId(null);
          }}
          onCreated={setCreatedId}
        />
      ) : null}
    </div>
  );
}
