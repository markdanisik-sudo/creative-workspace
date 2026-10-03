import {
  BaseBoxShapeUtil,
  HTMLContainer,
  createShapeId,
  T,
  useEditor,
  useValue,
  type TLAsset,
  type TLAssetId,
  type VecModel,
} from "tldraw";
import { formatBytes } from "@/lib/format";
import { logError } from "@/lib/errors";
import { fileKindLabel } from "../assets/files";
import { FILE_TYPE, type FileShape } from "./types";
import styles from "./shapes.module.css";

export const FILE_CARD_WIDTH = 280;
export const FILE_CARD_HEIGHT = 84;

type FileAsset = Extract<TLAsset, { type: typeof FILE_TYPE }>;

/** Opens the original file (via a fresh signed URL) in a new tab. */
export async function openFileAsset(editor: ReturnType<typeof useEditor>, assetId: TLAssetId) {
  // Open the tab synchronously so pop-up blockers allow it, then point it at the file.
  const tab = window.open("", "_blank");
  if (tab) tab.opener = null;
  try {
    const url = await editor.resolveAssetUrl(assetId, { shouldResolveToOriginal: true });
    if (url && tab) tab.location.href = url;
    else tab?.close();
  } catch (error) {
    tab?.close();
    logError("canvas.openFile", error);
  }
}

/** A document card: kind badge, name and size. Double-click opens the file. */
export class FileShapeUtil extends BaseBoxShapeUtil<FileShape> {
  static override type = FILE_TYPE;
  static override handledAssetTypes = [FILE_TYPE] as const;
  static override props = {
    w: T.number,
    h: T.number,
    assetId: T.string.nullable() as unknown as T.Validator<TLAssetId | null>,
  };

  getDefaultProps(): FileShape["props"] {
    return { w: FILE_CARD_WIDTH, h: FILE_CARD_HEIGHT, assetId: null };
  }

  override createShapeForAsset(asset: TLAsset, position: VecModel) {
    return {
      id: createShapeId(),
      type: FILE_TYPE as typeof FILE_TYPE,
      x: position.x,
      y: position.y,
      props: { w: FILE_CARD_WIDTH, h: FILE_CARD_HEIGHT, assetId: asset.id },
    };
  }

  override isAspectRatioLocked() {
    return false;
  }

  override onDoubleClick(shape: FileShape) {
    if (shape.props.assetId) void openFileAsset(this.editor, shape.props.assetId);
  }

  getIndicatorPath(shape: FileShape) {
    const path = new Path2D();
    path.roundRect(0, 0, shape.props.w, shape.props.h, 14);
    return path;
  }

  component(shape: FileShape) {
    return <FileCard shape={shape} />;
  }
}

function FileCard({ shape }: { shape: FileShape }) {
  const editor = useEditor();
  const asset = useValue(
    "file asset",
    () =>
      shape.props.assetId
        ? (editor.getAsset(shape.props.assetId) as FileAsset | undefined)
        : undefined,
    [editor, shape.props.assetId],
  );
  const name = asset?.props.name || "File";
  const uploading = !asset?.props.src;

  return (
    <HTMLContainer
      id={shape.id}
      className={styles.card}
      style={{ width: shape.props.w, height: shape.props.h }}
    >
      <div className={styles.file}>
        <span className={styles.fileBadge} aria-hidden="true">
          {fileKindLabel(asset?.props.mimeType ?? "", name)}
        </span>
        <span className={styles.fileText}>
          <span className={styles.fileName}>{name}</span>
          <span className={styles.fileMeta}>
            {uploading
              ? "Uploading…"
              : `${formatBytes(asset?.props.fileSize ?? 0)} · Double-click to open`}
          </span>
        </span>
      </div>
    </HTMLContainer>
  );
}
