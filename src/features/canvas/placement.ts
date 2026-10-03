import { Box, Vec, type Editor } from "tldraw";

const MARGIN = 32;
const STEP = 48;
const MAX_RINGS = 24;

/**
 * Finds the centre of a free area of the given size, as close as possible to
 * the middle of the viewport, so new objects never land on top of existing ones.
 */
export function findFreeSpot(editor: Editor, size: { w: number; h: number }): Vec {
  const center = editor.getViewportPageBounds().center;
  const occupied = editor
    .getCurrentPageShapes()
    .filter((shape) => shape.parentId === editor.getCurrentPageId())
    .map((shape) => editor.getShapePageBounds(shape))
    .filter((bounds): bounds is Box => Boolean(bounds))
    .map((bounds) => bounds.clone().expandBy(MARGIN));

  const fits = (point: Vec) => {
    const candidate = new Box(point.x - size.w / 2, point.y - size.h / 2, size.w, size.h);
    return !occupied.some((box) => box.collides(candidate));
  };

  if (fits(center)) return center;

  // Walk outward in square rings, preferring positions nearest the centre.
  for (let ring = 1; ring <= MAX_RINGS; ring++) {
    const candidates: Vec[] = [];
    for (let i = -ring; i <= ring; i++) {
      candidates.push(
        new Vec(center.x + i * STEP, center.y - ring * STEP),
        new Vec(center.x + i * STEP, center.y + ring * STEP),
        new Vec(center.x - ring * STEP, center.y + i * STEP),
        new Vec(center.x + ring * STEP, center.y + i * STEP),
      );
    }
    candidates.sort((a, b) => Vec.Dist(a, center) - Vec.Dist(b, center));
    const spot = candidates.find(fits);
    if (spot) return spot;
  }
  return center;
}

/** Pans just enough to bring a page point into view if it is off-screen. */
export function revealPoint(editor: Editor, point: Vec, size: { w: number; h: number }) {
  const target = new Box(point.x - size.w / 2, point.y - size.h / 2, size.w, size.h);
  if (!editor.getViewportPageBounds().contains(target)) {
    editor.centerOnPoint(point, { animation: { duration: 220 } });
  }
}
