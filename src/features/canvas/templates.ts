import { createShapeId, toRichText, type Editor, type TLShapePartial } from "tldraw";
import type { BoardTemplateId } from "@/features/boards/templates";
import { newChecklistItem } from "./shapes/ChecklistShapeUtil";
import { CHECKLIST_TYPE } from "./shapes/types";

const GAP = 40;

function heading(text: string, x: number, y: number): TLShapePartial {
  return {
    id: createShapeId(),
    type: "text",
    x,
    y,
    props: { richText: toRichText(text), size: "xl", font: "sans", autoSize: true },
  };
}

function section(name: string, x: number, y: number, w: number, h: number): TLShapePartial {
  return { id: createShapeId(), type: "frame", x, y, props: { name, w, h } };
}

function caption(text: string, x: number, y: number): TLShapePartial {
  return {
    id: createShapeId(),
    type: "text",
    x,
    y,
    props: { richText: toRichText(text), size: "s", font: "sans", color: "grey", autoSize: true },
  } as TLShapePartial;
}

function note(text: string, x: number, y: number, color = "yellow"): TLShapePartial {
  return {
    id: createShapeId(),
    type: "note",
    x,
    y,
    props: { richText: toRichText(text), color, font: "sans", size: "s" },
  } as TLShapePartial;
}

function checklist(title: string, items: string[], x: number, y: number): TLShapePartial {
  return {
    id: createShapeId(),
    type: CHECKLIST_TYPE,
    x,
    y,
    props: { title, items: items.map((text) => newChecklistItem(text)) },
  } as TLShapePartial;
}

function buildTemplate(id: BoardTemplateId): TLShapePartial[] {
  switch (id) {
    case "moodboard":
      return [
        heading("Moodboard", 0, -90),
        section("Imagery", 0, 0, 960, 640),
        section("Colour", 960 + GAP, 0, 400, 300),
        section("Type & tone", 960 + GAP, 300 + GAP, 400, 300),
      ];
    case "storyboard": {
      const frameW = 400;
      const frameH = 225;
      const rowStride = frameH + 110;
      return [
        heading("Storyboard", 0, -90),
        ...Array.from({ length: 6 }, (_, i) => {
          const x = (i % 3) * (frameW + GAP);
          const y = Math.floor(i / 3) * rowStride;
          return [
            section(`Shot ${i + 1}`, x, y, frameW, frameH),
            caption("Action · dialogue · sound", x, y + frameH + 14),
          ];
        }).flat(),
      ];
    }
    case "references":
      return [
        heading("References", 0, -90),
        section("Images", 0, 0, 720, 520),
        section("Links", 720 + GAP, 0, 520, 520),
        section("Notes", 0, 520 + GAP, 1240 + GAP, 260),
      ];
    case "shot-list":
      return [
        heading("Shot list", 0, -90),
        checklist(
          "Shot list",
          ["Establishing shot", "Close-up", "Interior", "Detail", "Hero shot"],
          0,
          0,
        ),
        note("Location, call time, gear", 320, 0),
      ];
    case "ideas":
      return [
        heading("Ideas", 0, -90),
        note("What should it feel like?", 0, 0),
        note("Who is it for?", 240, 0, "light-green"),
        note("What must we see?", 480, 0, "light-violet"),
      ];
    case "blank":
      return [];
  }
}

/** Seeds a new board with its template's starter content. */
export function applyTemplate(editor: Editor, id: BoardTemplateId) {
  const shapes = buildTemplate(id);
  if (shapes.length === 0) return;
  editor.run(
    () => {
      editor.createShapes(shapes);
      editor.zoomToFit({ animation: { duration: 0 } });
    },
    { history: "ignore" },
  );
}
