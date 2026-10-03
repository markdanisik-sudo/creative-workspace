/** Upload rules, mirrored by the storage bucket's server-side limits. */
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/svg+xml",
] as const;

export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;

export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/rtf",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/markdown": "md",
  "text/csv": "csv",
  "application/rtf": "rtf",
  "application/zip": "zip",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};

export function extensionForMimeType(mimeType: string): string {
  return EXTENSIONS[mimeType] ?? "bin";
}

/** Short label for a file card, e.g. "PDF", "DOCX". */
export function fileKindLabel(mimeType: string, name: string): string {
  const fromName = name.includes(".") ? name.split(".").pop() : undefined;
  return (fromName || extensionForMimeType(mimeType)).toUpperCase().slice(0, 5);
}

/** Asset `src` values point into private storage with this prefix. */
export const STORAGE_SRC_PREFIX = "asset:";

export function storagePathFromSrc(src: string | null | undefined): string | null {
  return src?.startsWith(STORAGE_SRC_PREFIX) ? src.slice(STORAGE_SRC_PREFIX.length) : null;
}
