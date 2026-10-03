import type { TLAssetId, TLShape } from "tldraw";

export const CHECKLIST_TYPE = "checklist";
export const FILE_TYPE = "file";

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

declare module "tldraw" {
  export interface TLGlobalShapePropsMap {
    [CHECKLIST_TYPE]: { w: number; h: number; title: string; items: ChecklistItem[] };
    [FILE_TYPE]: { w: number; h: number; assetId: TLAssetId | null };
  }
  export interface TLGlobalAssetPropsMap {
    [FILE_TYPE]: { name: string; src: string | null; mimeType: string; fileSize: number };
  }
}

export type ChecklistShape = TLShape<typeof CHECKLIST_TYPE>;
export type FileShape = TLShape<typeof FILE_TYPE>;
