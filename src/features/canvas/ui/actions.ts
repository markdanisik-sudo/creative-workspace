import {
  createShapeId,
  toRichText,
  type Editor,
  type TLShapeId,
  type TLShapePartial,
} from "tldraw";
import {
  CHECKLIST_DEFAULT_WIDTH,
  checklistHeight,
  newChecklistItem,
} from "../shapes/ChecklistShapeUtil";
import { findFreeSpot, revealPoint } from "../placement";
import { CHECKLIST_TYPE } from "../shapes/types";

/** Typical footprint of an added image or link card, used to find room for it. */
const MEDIA_FOOTPRINT = { w: 560, h: 400 };
const LINK_FOOTPRINT = { w: 300, h: 320 };

function placementPoint(editor: Editor, size: { w: number; h: number }) {
  const point = findFreeSpot(editor, size);
  revealPoint(editor, point, size);
  return point;
}

function createAndEdit(editor: Editor, partial: TLShapePartial, size: { w: number; h: number }) {
  const point = placementPoint(editor, size);
  const id = partial.id as TLShapeId;
  editor.run(() => {
    editor.markHistoryStoppingPoint(`create ${partial.type}`);
    editor.createShape({ ...partial, x: point.x - size.w / 2, y: point.y - size.h / 2 });
    editor.select(id);
    editor.setEditingShape(id);
  });
}

export function addText(editor: Editor) {
  editor.setCurrentTool("select");
  createAndEdit(
    editor,
    {
      id: createShapeId(),
      type: "text",
      props: { richText: toRichText(""), font: "sans", size: "m" },
    },
    { w: 40, h: 30 },
  );
}

export function addNote(editor: Editor) {
  editor.setCurrentTool("select");
  createAndEdit(
    editor,
    {
      id: createShapeId(),
      type: "note",
      props: { color: "yellow", font: "sans", size: "s" },
    } as TLShapePartial,
    { w: 200, h: 200 },
  );
}

export function addChecklist(editor: Editor) {
  editor.setCurrentTool("select");
  const items = [newChecklistItem()];
  createAndEdit(
    editor,
    {
      id: createShapeId(),
      type: CHECKLIST_TYPE,
      props: { title: "Checklist", items },
    } as TLShapePartial,
    { w: CHECKLIST_DEFAULT_WIDTH, h: checklistHeight(items.length) },
  );
}

export const SECTION_SIZE = { w: 720, h: 480 };

export function addSection(editor: Editor) {
  editor.setCurrentTool("select");
  const point = placementPoint(editor, SECTION_SIZE);
  const id = createShapeId();
  editor.run(() => {
    editor.markHistoryStoppingPoint("create section");
    editor.createShape({
      id,
      type: "frame",
      x: point.x - SECTION_SIZE.w / 2,
      y: point.y - SECTION_SIZE.h / 2,
      props: { ...SECTION_SIZE, name: "Section" },
    });
    editor.select(id);
  });
}

export function addFiles(editor: Editor, files: File[]) {
  if (files.length === 0) return;
  editor.setCurrentTool("select");
  const columns = Math.min(files.length, 3);
  const rows = Math.ceil(files.length / 3);
  const point = placementPoint(editor, {
    w: MEDIA_FOOTPRINT.w * columns,
    h: MEDIA_FOOTPRINT.h * rows,
  });
  void editor.putExternalContent({ type: "files", files, point });
}

/** Adds http(s) links as bookmark cards. Returns false for anything that isn't a URL. */
export function addLink(editor: Editor, raw: string): boolean {
  const text = raw.trim();
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return false;
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname.includes("."))
    return false;
  editor.setCurrentTool("select");
  void editor.putExternalContent({
    type: "url",
    url: url.href,
    point: placementPoint(editor, LINK_FOOTPRINT),
  });
  return true;
}

export function startCrop(editor: Editor, shapeId: TLShapeId) {
  editor.run(() => {
    editor.select(shapeId);
    editor.setCroppingShape(shapeId);
    editor.setCurrentTool("select.crop.idle");
  });
}
