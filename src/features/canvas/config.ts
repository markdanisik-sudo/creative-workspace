import {
  defaultAssetUtils,
  defaultBindingUtils,
  defaultShapeUtils,
  FrameShapeUtil,
  NoteShapeUtil,
  type TLPageId,
} from "tldraw";
import { FileAssetUtil } from "./assets/FileAssetUtil";
import { ChecklistShapeUtil } from "./shapes/ChecklistShapeUtil";
import { FileShapeUtil } from "./shapes/FileShapeUtil";

/** Replaces defaults that share a `type` with a custom version. */
function withDefaults<T extends { type: string }>(
  custom: readonly T[],
  defaults: readonly T[],
): T[] {
  const types = new Set(custom.map((util) => util.type));
  return [...defaults.filter((util) => !types.has(util.type)), ...custom];
}

/** Our shapes plus tweaks to built-ins. Shared by the store and the editor. */
const customShapeUtils = [
  ChecklistShapeUtil,
  FileShapeUtil,
  NoteShapeUtil.configure({ resizeMode: "scale" }),
  FrameShapeUtil.configure({ showColors: true }),
];

export const shapeUtils = withDefaults<
  (typeof defaultShapeUtils)[number] | (typeof customShapeUtils)[number]
>(customShapeUtils, defaultShapeUtils);
export const assetUtils = withDefaults<(typeof defaultAssetUtils)[number] | typeof FileAssetUtil>(
  [FileAssetUtil],
  defaultAssetUtils,
);
export const bindingUtils = defaultBindingUtils;

/** Boards have a single page. */
export const BOARD_PAGE_ID = "page:page" as TLPageId;
