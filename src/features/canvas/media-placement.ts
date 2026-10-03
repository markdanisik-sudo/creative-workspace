import type { Editor, TLShape, TLShapeId } from "tldraw";

/** Longest edge, in canvas units, of an image or video when first added. */
export const MAX_NEW_MEDIA_SIZE = 560;
const TIDY_GAP = 16;

type MediaShape = TLShape & {
  type: "image" | "video";
  props: { w: number; h: number; assetId: string | null };
};

function isMedia(shape: TLShape): shape is MediaShape {
  return shape.type === "image" || shape.type === "video";
}

/**
 * New photos arrive at their native pixel size, which can swamp a board.
 * Scale freshly added media down to a comfortable size, and tidy several
 * files dropped together into a compact group instead of a long row.
 */
export function registerMediaPlacement(editor: Editor): () => void {
  let batch: TLShapeId[] = [];

  return editor.sideEffects.registerBeforeCreateHandler("shape", (shape, source) => {
    if (source !== "user" || !isMedia(shape) || !shape.props.assetId) return shape;

    // Only shapes at the asset's natural size are fresh; copies keep their size.
    const asset = editor.getAsset(shape.props.assetId as never) as
      { props?: { w?: number; h?: number } } | undefined;
    const isFresh = asset?.props?.w === shape.props.w && asset?.props?.h === shape.props.h;
    const longest = Math.max(shape.props.w, shape.props.h);
    if (!isFresh || longest <= MAX_NEW_MEDIA_SIZE) return shape;

    const scale = MAX_NEW_MEDIA_SIZE / longest;
    if (batch.length === 0) {
      queueMicrotask(() => {
        const ids = batch.filter((id) => editor.getShape(id));
        batch = [];
        if (ids.length < 2) return;
        const center = editor.getSelectionPageBounds()?.center;
        editor.run(
          () => {
            editor.packShapes(ids, TIDY_GAP);
            if (center) {
              const bounds = editor.getSelectionPageBounds();
              if (bounds) {
                const dx = center.x - bounds.center.x;
                const dy = center.y - bounds.center.y;
                editor.updateShapes(
                  ids.map((id) => {
                    const s = editor.getShape(id)!;
                    return { id, type: s.type, x: s.x + dx, y: s.y + dy };
                  }),
                );
              }
            }
          },
          { history: "ignore" },
        );
      });
    }
    batch.push(shape.id);

    // Keep the shape centred where it would have landed.
    const w = shape.props.w * scale;
    const h = shape.props.h * scale;
    return {
      ...shape,
      x: shape.x + (shape.props.w - w) / 2,
      y: shape.y + (shape.props.h - h) / 2,
      props: { ...shape.props, w, h },
    } as TLShape;
  });
}
