import { useEffect } from "react";
import {
  AssetRecordType,
  defaultHandleExternalFileContent,
  defaultHandleExternalTextContent,
  defaultHandleExternalUrlContent,
  getHashForString,
  useEditor,
  useToasts,
  useTranslation,
  type Editor,
  type TLBookmarkAsset,
  type TLDefaultExternalContentHandlerOpts,
} from "tldraw";
import type { LinkMetadata } from "@/lib/unfurl/parse";
import { IMAGE_MIME_TYPES, MAX_UPLOAD_BYTES, VIDEO_MIME_TYPES } from "./assets/files";
import { findFreeSpot } from "./placement";

const TEXT_FOOTPRINT = { w: 320, h: 80 };
const LINK_FOOTPRINT = { w: 300, h: 320 };
const MEDIA_FOOTPRINT = { w: 560, h: 400 };

async function fetchMetadata(url: string): Promise<LinkMetadata | null> {
  try {
    const response = await fetch(`/api/unfurl?url=${encodeURIComponent(url)}`);
    // 204: the site offers no preview.
    if (response.status !== 200) return null;
    return (await response.json()) as LinkMetadata;
  } catch {
    return null;
  }
}

/** Bookmark metadata comes from our server; blocked sites still get a clean card. */
async function createBookmarkAsset(url: string): Promise<TLBookmarkAsset> {
  const metadata = await fetchMetadata(url);
  let hostname = url;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // Keep the raw string.
  }
  return {
    id: AssetRecordType.createId(getHashForString(url)),
    typeName: "asset",
    type: "bookmark",
    props: {
      src: url,
      title: metadata?.title || hostname,
      description: metadata?.description ?? "",
      image: metadata?.image ?? "",
      favicon: metadata?.favicon ?? "",
    },
    meta: { siteName: metadata?.siteName ?? hostname },
  };
}

function registerHandlers(editor: Editor, options: TLDefaultExternalContentHandlerOpts) {
  editor.registerExternalAssetHandler("url", ({ url }) => createBookmarkAsset(url));

  // Pastes without an explicit position go to free space instead of the
  // viewport centre, so they never cover existing work.
  editor.registerExternalContentHandler("text", (content) =>
    defaultHandleExternalTextContent(editor, {
      ...content,
      point: content.point ?? findFreeSpot(editor, TEXT_FOOTPRINT),
    }),
  );
  editor.registerExternalContentHandler("url", (content) =>
    defaultHandleExternalUrlContent(
      editor,
      { ...content, point: content.point ?? findFreeSpot(editor, LINK_FOOTPRINT) },
      options,
    ),
  );
  editor.registerExternalContentHandler("files", (content) =>
    defaultHandleExternalFileContent(
      editor,
      { ...content, point: content.point ?? findFreeSpot(editor, MEDIA_FOOTPRINT) },
      options,
    ),
  );
}

/** Wires paste and drop handling for URLs, text and files. */
export function useExternalContent() {
  const editor = useEditor();
  const toasts = useToasts();
  const msg = useTranslation();

  useEffect(() => {
    registerHandlers(editor, {
      toasts,
      msg,
      maxAssetSize: MAX_UPLOAD_BYTES,
      acceptedImageMimeTypes: IMAGE_MIME_TYPES,
      acceptedVideoMimeTypes: VIDEO_MIME_TYPES,
    });
  }, [editor, toasts, msg]);
}
