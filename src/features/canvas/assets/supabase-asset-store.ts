import type { TLAsset, TLAssetContext, TLAssetStore } from "tldraw";
import type { BrowserSupabase } from "@/lib/supabase/client";
import { STORAGE_BUCKET } from "@/lib/supabase/env";
import { logError } from "@/lib/errors";
import { SignedUrlCache } from "./SignedUrlCache";
import { createImagePreview } from "./preview";
import { extensionForMimeType, STORAGE_SRC_PREFIX, storagePathFromSrc } from "./files";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export interface AssetStoreContext {
  supabase: BrowserSupabase;
  userId: string;
  projectId: string;
  boardId: string;
}

function numberProp(asset: TLAsset, key: string): number {
  const value = (asset.props as Record<string, unknown>)[key];
  return typeof value === "number" ? value : 0;
}

/**
 * Stores uploads in the private Supabase bucket under
 * `user/project/board/<uuid>.<ext>` and serves them through short-lived,
 * cached signed URLs. Large images also get a preview, used whenever an image
 * is displayed small enough for the preview to look identical.
 */
export function createSupabaseAssetStore(context: AssetStoreContext): TLAssetStore & {
  urls: SignedUrlCache;
} {
  const { supabase, userId, projectId, boardId } = context;

  const urls = new SignedUrlCache(async (paths) => {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    if (error) throw error;
    return new Map(
      data.flatMap((entry) =>
        entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl]] : [],
      ),
    );
  }, SIGNED_URL_TTL_SECONDS * 1000);

  const folder = `${userId}/${projectId}/${boardId}`;

  return {
    urls,

    async upload(asset, file, abortSignal) {
      const id = crypto.randomUUID();
      const path = `${folder}/${id}.${extensionForMimeType(file.type)}`;

      const upload = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });
      if (upload.error) {
        logError("assets.upload", upload.error, { type: file.type, size: file.size });
        throw upload.error;
      }
      if (abortSignal?.aborted) throw new DOMException("Upload aborted", "AbortError");

      let previewPath: string | null = null;
      let previewWidth = 0;
      if (asset.type === "image") {
        try {
          const preview = await createImagePreview(file);
          if (preview) {
            const candidate = `${folder}/${id}.preview.webp`;
            const result = await supabase.storage
              .from(STORAGE_BUCKET)
              .upload(candidate, preview.blob, {
                contentType: "image/webp",
                cacheControl: "31536000",
              });
            if (!result.error) {
              previewPath = candidate;
              previewWidth = preview.width;
            }
          }
        } catch (error) {
          // The original still works; previews are an optimisation.
          logError("assets.preview", error);
        }
      }

      const width = Math.round(numberProp(asset, "w")) || null;
      const height = Math.round(numberProp(asset, "h")) || null;
      const { data, error } = await supabase
        .from("files")
        .insert({
          project_id: projectId,
          board_id: boardId,
          storage_path: path,
          preview_path: previewPath,
          name: file.name.slice(0, 255),
          mime_type: file.type,
          size_bytes: file.size,
          width,
          height,
        })
        .select("id")
        .single();
      if (error) {
        logError("assets.register", error);
        throw error;
      }

      return {
        src: `${STORAGE_SRC_PREFIX}${path}`,
        meta: { fileId: data.id, previewPath, previewWidth },
      };
    },

    resolve(asset: TLAsset, ctx: TLAssetContext) {
      const src = (asset.props as { src?: string | null }).src;
      const originalPath = storagePathFromSrc(src);
      if (!originalPath) return src ?? null;

      const previewPath =
        typeof asset.meta.previewPath === "string" ? asset.meta.previewPath : null;
      const previewWidth =
        typeof asset.meta.previewWidth === "number" ? asset.meta.previewWidth : 0;
      const displayedWidth = numberProp(asset, "w") * ctx.steppedScreenScale * ctx.dpr;
      const usePreview =
        previewPath !== null && !ctx.shouldResolveToOriginal && displayedWidth <= previewWidth;
      const path = usePreview ? previewPath : originalPath;

      return urls.peek(path) ?? urls.get(path);
    },
  };
}
