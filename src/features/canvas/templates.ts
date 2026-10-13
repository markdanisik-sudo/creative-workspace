import { createShapeId, toRichText, type Editor, type TLShapePartial } from "tldraw";
import { templateName, type BoardTemplateId } from "@/features/boards/templates";
import type { Translator } from "@/lib/i18n";
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

function buildTemplate(id: BoardTemplateId, t: Translator["t"]): TLShapePartial[] {
  switch (id) {
    case "moodboard":
      return [
        heading(templateName(id, t), 0, -90),
        section(t("templates.content.imagery"), 0, 0, 960, 640),
        section(t("templates.content.colour"), 960 + GAP, 0, 400, 300),
        section(t("templates.content.typeAndTone"), 960 + GAP, 300 + GAP, 400, 300),
      ];
    case "storyboard": {
      const frameW = 400;
      const frameH = 225;
      const rowStride = frameH + 110;
      return [
        heading(templateName(id, t), 0, -90),
        ...Array.from({ length: 6 }, (_, i) => {
          const x = (i % 3) * (frameW + GAP);
          const y = Math.floor(i / 3) * rowStride;
          return [
            section(t("templates.content.shot", { number: i + 1 }), x, y, frameW, frameH),
            caption(t("templates.content.shotCaption"), x, y + frameH + 14),
          ];
        }).flat(),
      ];
    }
    case "references":
      return [
        heading(templateName(id, t), 0, -90),
        section(t("templates.content.images"), 0, 0, 720, 520),
        section(t("templates.content.links"), 720 + GAP, 0, 520, 520),
        section(t("templates.content.notes"), 0, 520 + GAP, 1240 + GAP, 260),
      ];
    case "shot-list": {
      const title = t("templates.content.shotListTitle");
      return [
        heading(title, 0, -90),
        checklist(title, t("templates.content.shotItems").split("|"), 0, 0),
        note(t("templates.content.logistics"), 320, 0),
      ];
    }
    case "ideas":
      return [
        heading(templateName(id, t), 0, -90),
        note(t("templates.content.ideaFeeling"), 0, 0),
        note(t("templates.content.ideaAudience"), 240, 0, "light-green"),
        note(t("templates.content.ideaMustSee"), 480, 0, "light-violet"),
      ];
    case "blank":
      return [];
  }
}

/** Seeds a new board with its template's starter content. */
export function applyTemplate(editor: Editor, id: BoardTemplateId, t: Translator["t"]) {
  const shapes = buildTemplate(id, t);
  if (shapes.length === 0) return;
  editor.run(
    () => {
      editor.createShapes(shapes);
      editor.zoomToFit({ animation: { duration: 0 } });
    },
    { history: "ignore" },
  );
}
