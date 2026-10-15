"use client";

import { createImagePreview } from "@/features/canvas/assets/preview";
import {
  extensionForMimeType,
  IMAGE_MIME_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/features/canvas/assets/files";
import { randomUuid } from "@/lib/ids";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { STORAGE_BUCKET } from "@/lib/supabase/env";
import { addImages, type UploadedImage } from "./actions";

export function isUploadableImage(file: File) {
  return (
    (IMAGE_MIME_TYPES as readonly string[]).includes(file.type) && file.size <= MAX_UPLOAD_BYTES
  );
}

async function dimensions(file: File): Promise<{ width: number; height: number } | null> {
  if (typeof createImageBitmap !== "function" || file.type === "image/svg+xml") return null;
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null;
  }
}

/**
 * Uploads images straight to storage (with a light WebP preview for large
 * photos), then records them on the project. Returns how many failed.
 */
export async function uploadImages(
  files: File[],
  options: {
    projectId: string;
    userId: string;
    collection: "moodboard" | "location";
    locationId?: string | null;
  },
): Promise<{ failed: number }> {
  const supabase = getSupabaseBrowserClient();
  const images = files.filter(isUploadableImage);
  let failed = files.length - images.length;

  const uploaded = await Promise.all(
    images.map(async (file): Promise<UploadedImage | null> => {
      const base = `${options.userId}/${options.projectId}/images/${randomUuid()}`;
      const storagePath = `${base}.${extensionForMimeType(file.type)}`;
      const [size, preview] = await Promise.all([
        dimensions(file),
        createImagePreview(file).catch(() => null),
      ]);
      const original = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (original.error) return null;
      let previewPath: string | null = null;
      if (preview) {
        const path = `${base}.preview.webp`;
        const result = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, preview.blob, { contentType: "image/webp", upsert: false });
        if (!result.error) previewPath = path;
      }
      return { storagePath, previewPath, width: size?.width ?? null, height: size?.height ?? null };
    }),
  );

  const done = uploaded.filter((image): image is UploadedImage => image !== null);
  failed += uploaded.length - done.length;
  const result = await addImages(
    options.projectId,
    options.collection,
    options.locationId ?? null,
    done,
  );
  if (!result.ok) failed += done.length;
  return { failed };
}
