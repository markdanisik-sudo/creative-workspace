import { AssetUtil, T, type TLAsset, type TLAssetId } from "tldraw";
import { DOCUMENT_MIME_TYPES } from "./files";
import { FILE_TYPE } from "../shapes/types";

type FileAsset = Extract<TLAsset, { type: typeof FILE_TYPE }>;

/** Documents (PDFs, office files, text) dropped or pasted onto the canvas. */
export class FileAssetUtil extends AssetUtil<FileAsset> {
  static override type = FILE_TYPE;
  static override props = {
    name: T.string,
    src: T.srcUrl.nullable(),
    mimeType: T.string,
    fileSize: T.number,
  };

  override getDefaultProps(): FileAsset["props"] {
    return { name: "", src: null, mimeType: "", fileSize: 0 };
  }

  override getSupportedMimeTypes(): readonly string[] {
    return DOCUMENT_MIME_TYPES;
  }

  override async getAssetFromFile(file: File, assetId: TLAssetId): Promise<FileAsset> {
    return {
      id: assetId,
      typeName: "asset",
      type: FILE_TYPE,
      props: { name: file.name, src: "", mimeType: file.type, fileSize: file.size },
      meta: {},
    };
  }
}
