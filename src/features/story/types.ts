export const BLOCK_TYPES = ["scene", "action", "dialogue"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

/** One piece of the script: a scene heading, action, or a line of dialogue. */
export interface ScriptBlock {
  id: string;
  type: BlockType;
  text: string;
  /** Dialogue: who speaks. */
  character?: string;
  /** Dialogue: how, e.g. "(šeptem)". */
  parenthetical?: string;
}

export interface Story {
  blocks: ScriptBlock[];
  updatedAt: string | null;
}

export const MAX_BLOCKS = 2000;

const clip = (value: unknown, max: number) =>
  typeof value === "string" ? value.slice(0, max) : "";

/** Blocks read back from the database or sent by the browser, trimmed to shape. */
export function toBlocks(value: unknown): ScriptBlock[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const blocks: ScriptBlock[] = [];
  for (const raw of value.slice(0, MAX_BLOCKS)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const type = BLOCK_TYPES.find((option) => option === item.type);
    const id = clip(item.id, 64);
    if (!type || !id || seen.has(id)) continue;
    seen.add(id);
    const block: ScriptBlock = { id, type, text: clip(item.text, 20_000) };
    if (type === "dialogue") {
      block.character = clip(item.character, 80);
      const direction = clip(item.parenthetical, 200);
      if (direction) block.parenthetical = direction;
    }
    blocks.push(block);
  }
  return blocks;
}

/** Everyone who speaks, in order of first line. */
export function scriptCharacters(blocks: ScriptBlock[]): string[] {
  const names = new Map<string, string>();
  for (const block of blocks) {
    const name = block.type === "dialogue" ? block.character?.trim() : "";
    if (name && !names.has(name.toUpperCase())) names.set(name.toUpperCase(), name);
  }
  return [...names.values()];
}
