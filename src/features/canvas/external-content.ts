import { AssetRecordType, getHashForString, type Editor, type TLBookmarkAsset } from "tldraw";
import type { LinkMetadata } from "@/lib/unfurl/parse";

async function fetchMetadata(url: string): Promise<LinkMetadata | null> {
  try {
    const response = await fetch(`/api/unfurl?url=${encodeURIComponent(url)}`);
    if (!response.ok) return null;
    return (await response.json()) as LinkMetadata;
  } catch {
    return null;
  }
}

/**
 * Pasted or dropped URLs become bookmark cards using server-side metadata.
 * When a site blocks previews we still create a clean card with the URL.
 */
export function registerExternalContentHandlers(editor: Editor) {
  editor.registerExternalAssetHandler("url", async ({ url }) => {
    const metadata = await fetchMetadata(url);
    let hostname = url;
    try {
      hostname = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      // Keep the raw string.
    }

    const asset: TLBookmarkAsset = {
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
    return asset;
  });
}
