import type { SerializedSchema, TLPageId, TLRecord, TLStore } from "tldraw";
import type { BrowserSupabase } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
import { logError } from "@/lib/errors";
import type { PersistenceBackend } from "./BoardSaver";
import {
  rowToAsset,
  rowToBinding,
  rowToShape,
  type AssetRow,
  type ConnectionRow,
  type ObjectRow,
  type PersistedTable,
} from "./mapping";

/** PostgREST returns at most this many rows per request by default. */
const PAGE_SIZE = 1000;

export function createSupabaseBackend(
  supabase: BrowserSupabase,
  boardId: string,
): PersistenceBackend {
  return {
    async upsert(table, rows) {
      // The row type is chosen by `table`; the union is not expressible to the client's generics.
      const { error } = await supabase
        .from(table as "canvas_objects")
        .upsert(rows as never[], { onConflict: "board_id,id" });
      if (error) throw error;
    },
    async remove(table: PersistedTable, ids) {
      const { error } = await supabase
        .from(table as "canvas_objects")
        .delete()
        .eq("board_id", boardId)
        .in("id", ids);
      if (error) throw error;
    },
    async saveSchema(schema) {
      const { error } = await supabase
        .from("boards")
        .update({ canvas_schema: schema as Json })
        .eq("id", boardId);
      if (error) throw error;
    },
  };
}

async function selectAll<T>(
  supabase: BrowserSupabase,
  table: PersistedTable,
  boardId: string,
  orderBy: string,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table as "canvas_objects")
      .select("*")
      .eq("board_id", boardId)
      .order(orderBy as "id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) return rows;
  }
}

export interface LoadedBoard {
  records: TLRecord[];
  template: string | null;
}

/** Loads a board's records, migrated to the current canvas schema. */
export async function loadBoardRecords(
  supabase: BrowserSupabase,
  store: TLStore,
  boardId: string,
  pageId: TLPageId,
): Promise<LoadedBoard> {
  const [board, objects, connections, assets] = await Promise.all([
    supabase.from("boards").select("canvas_schema, template").eq("id", boardId).single(),
    selectAll<ObjectRow>(supabase, "canvas_objects", boardId, "z_index"),
    selectAll<ConnectionRow>(supabase, "canvas_connections", boardId, "id"),
    selectAll<AssetRow>(supabase, "board_assets", boardId, "id"),
  ]);
  if (board.error) throw board.error;

  const records: TLRecord[] = [
    ...assets.map(rowToAsset),
    ...objects.map((row) => rowToShape(row, pageId)),
    ...connections.map(rowToBinding),
  ];

  const template = board.data.template;
  const schema = board.data.canvas_schema as SerializedSchema | null;
  if (!schema || records.length === 0) return { records, template };

  const migrated = store.schema.migrateStoreSnapshot({
    schema,
    store: Object.fromEntries(records.map((record) => [record.id, record])),
  });
  if (migrated.type === "error") {
    logError("canvas.migrate", migrated.reason, { boardId });
    return { records, template };
  }
  return { records: Object.values(migrated.value), template };
}
