/** Board starting points. Starter content is applied by the canvas on first open. */
export const BOARD_TEMPLATES = [
  { id: "blank", name: "Blank", description: "An empty canvas." },
  { id: "moodboard", name: "Moodboard", description: "Sections for images, colour and type." },
  { id: "storyboard", name: "Storyboard", description: "Six frames with notes." },
  { id: "references", name: "References", description: "Collect links and images." },
  { id: "shot-list", name: "Shot List", description: "A ready-made checklist." },
  { id: "ideas", name: "Ideas", description: "Notes to get you going." },
] as const;

export type BoardTemplateId = (typeof BOARD_TEMPLATES)[number]["id"];

export const DEFAULT_FIRST_BOARD_NAME = "Main board";

export function isBoardTemplateId(value: unknown): value is BoardTemplateId {
  return BOARD_TEMPLATES.some((template) => template.id === value);
}

export function templateBoardName(id: BoardTemplateId) {
  return id === "blank" ? "Untitled board" : BOARD_TEMPLATES.find((t) => t.id === id)!.name;
}
