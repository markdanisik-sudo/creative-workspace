/** Longest edge of generated image previews, in pixels. */
export const PREVIEW_MAX_DIMENSION = 1600;
const PREVIEW_QUALITY = 0.82;

// Animated and vector images keep their original.
const SKIP_PREVIEW_TYPES = new Set(["image/gif", "image/svg+xml"]);

export interface ImagePreview {
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Creates a downscaled WebP preview for large images so boards with many
 * photos load quickly. Returns null when the original is already small enough.
 */
export async function createImagePreview(file: File): Promise<ImagePreview | null> {
  if (SKIP_PREVIEW_TYPES.has(file.type) || typeof createImageBitmap !== "function") return null;

  const bitmap = await createImageBitmap(file);
  try {
    const scale = PREVIEW_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height);
    if (scale >= 1) return null;

    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", PREVIEW_QUALITY),
    );
    return blob ? { blob, width, height } : null;
  } finally {
    bitmap.close();
  }
}
