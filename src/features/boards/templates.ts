import type { Translator } from "@/lib/i18n";

/** Board starting points. Starter content is applied by the canvas on first open. */
export const BOARD_TEMPLATE_IDS = [
  "blank",
  "moodboard",
  "storyboard",
  "references",
  "shot-list",
  "ideas",
] as const;

export type BoardTemplateId = (typeof BOARD_TEMPLATE_IDS)[number];

export function isBoardTemplateId(value: unknown): value is BoardTemplateId {
  return BOARD_TEMPLATE_IDS.some((id) => id === value);
}

export function templateName(id: BoardTemplateId, t: Translator["t"]) {
  return t(`templates.${id}.name`);
}

export function templateDescription(id: BoardTemplateId, t: Translator["t"]) {
  return t(`templates.${id}.description`);
}

/** The name a new board gets from its template. */
export function templateBoardName(id: BoardTemplateId, t: Translator["t"]) {
  return id === "blank" ? t("board.untitledBoard") : templateName(id, t);
}
