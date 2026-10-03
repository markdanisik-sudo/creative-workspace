/**
 * Conversion between canvas records (tldraw) and database rows.
 *
 * The database stays library-neutral: geometry lives in columns, everything
 * type-specific lives in `data`. Keep this module pure so it can be unit tested
 * and reused by a future sync server.
 */
import type { JsonObject, TLAsset, TLBinding, TLPageId, TLRecord, TLShape } from "tldraw";
import type { Database, Json } from "@/lib/supabase/database.types";

export const OBJECT_DATA_VERSION = 1;

type Tables = Database["public"]["Tables"];
export type ObjectRow = Tables["canvas_objects"]["Row"];
export type ObjectInsert = Tables["canvas_objects"]["Insert"];
export type ConnectionRow = Tables["canvas_connections"]["Row"];
export type ConnectionInsert = Tables["canvas_connections"]["Insert"];
export type AssetRow = Tables["board_assets"]["Row"];
export type AssetInsert = Tables["board_assets"]["Insert"];

export type PersistedTable = "canvas_objects" | "canvas_connections" | "board_assets";

interface ObjectData {
  version: number;
  props: JsonObject;
  meta: JsonObject;
  opacity: number;
  isLocked: boolean;
}

interface RecordData {
  props: JsonObject;
  meta: JsonObject;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asJson(value: unknown): NonNullable<Json> {
  return value as NonNullable<Json>;
}

/** Which table a record is stored in, or null if it is not persisted. */
export function tableForRecord(record: TLRecord): PersistedTable | null {
  switch (record.typeName) {
    case "shape":
      return "canvas_objects";
    case "binding":
      return "canvas_connections";
    case "asset":
      return "board_assets";
    default:
      return null;
  }
}

function dimension(props: object, key: "w" | "h"): number {
  const value = (props as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function shapeToRow(shape: TLShape, boardId: string): ObjectInsert {
  const data: ObjectData = {
    version: OBJECT_DATA_VERSION,
    props: shape.props as unknown as JsonObject,
    meta: shape.meta,
    opacity: shape.opacity,
    isLocked: shape.isLocked,
  };
  return {
    board_id: boardId,
    id: shape.id,
    type: shape.type,
    parent_id: shape.parentId.startsWith("page:") ? null : shape.parentId,
    x: shape.x,
    y: shape.y,
    width: dimension(shape.props, "w"),
    height: dimension(shape.props, "h"),
    rotation: shape.rotation,
    z_index: shape.index,
    data: asJson(data),
  };
}

export function rowToShape(row: ObjectRow, pageId: TLPageId): TLShape {
  const data = isObject(row.data) ? row.data : {};
  return {
    id: row.id,
    typeName: "shape",
    type: row.type,
    parentId: row.parent_id ?? pageId,
    index: row.z_index,
    x: row.x,
    y: row.y,
    rotation: row.rotation,
    opacity: typeof data.opacity === "number" ? data.opacity : 1,
    isLocked: data.isLocked === true,
    props: isObject(data.props) ? data.props : {},
    meta: isObject(data.meta) ? data.meta : {},
  } as unknown as TLShape;
}

export function bindingToRow(binding: TLBinding, boardId: string): ConnectionInsert {
  const data: RecordData = { props: binding.props as unknown as JsonObject, meta: binding.meta };
  return {
    board_id: boardId,
    id: binding.id,
    type: binding.type,
    from_id: binding.fromId,
    to_id: binding.toId,
    data: asJson(data),
  };
}

export function rowToBinding(row: ConnectionRow): TLBinding {
  const data = isObject(row.data) ? row.data : {};
  return {
    id: row.id,
    typeName: "binding",
    type: row.type,
    fromId: row.from_id,
    toId: row.to_id,
    props: isObject(data.props) ? data.props : {},
    meta: isObject(data.meta) ? data.meta : {},
  } as unknown as TLBinding;
}

/** Uploaded assets carry the id of their `files` row in meta. */
export function assetFileId(asset: TLAsset): string | null {
  const fileId = asset.meta.fileId;
  return typeof fileId === "string" ? fileId : null;
}

export function assetToRow(asset: TLAsset, boardId: string): AssetInsert {
  const data: RecordData = { props: asset.props as unknown as JsonObject, meta: asset.meta };
  return {
    board_id: boardId,
    id: asset.id,
    type: asset.type,
    file_id: assetFileId(asset),
    data: asJson(data),
  };
}

export function rowToAsset(row: AssetRow): TLAsset {
  const data = isObject(row.data) ? row.data : {};
  return {
    id: row.id,
    typeName: "asset",
    type: row.type,
    props: isObject(data.props) ? data.props : {},
    meta: isObject(data.meta) ? data.meta : {},
  } as unknown as TLAsset;
}

export function recordToRow(record: TLRecord, boardId: string) {
  switch (record.typeName) {
    case "shape":
      return shapeToRow(record, boardId);
    case "binding":
      return bindingToRow(record, boardId);
    case "asset":
      return assetToRow(record, boardId);
    default:
      return null;
  }
}
