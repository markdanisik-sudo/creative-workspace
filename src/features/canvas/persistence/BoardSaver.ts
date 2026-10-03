import type { TLRecord, TLStore } from "tldraw";
import { logError } from "@/lib/errors";
import { recordToRow, tableForRecord, type PersistedTable } from "./mapping";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type Row = NonNullable<ReturnType<typeof recordToRow>>;

/** Storage operations the saver needs. Implemented with Supabase in production. */
export interface PersistenceBackend {
  upsert(table: PersistedTable, rows: Row[]): Promise<void>;
  remove(table: PersistedTable, ids: string[]): Promise<void>;
  saveSchema(schema: unknown): Promise<void>;
}

interface BoardSaverOptions {
  debounceMs?: number;
  batchSize?: number;
  maxRetryDelayMs?: number;
  onStatusChange?: (status: SaveStatus) => void;
}

const DEFAULT_DEBOUNCE_MS = 500;
const DEFAULT_BATCH_SIZE = 500;
const INITIAL_RETRY_DELAY_MS = 2000;
const DEFAULT_MAX_RETRY_DELAY_MS = 30_000;

// Parents before children on write, children before parents on delete, so
// referencing rows never point at missing ones longer than necessary.
const WRITE_ORDER: PersistedTable[] = ["board_assets", "canvas_objects", "canvas_connections"];
const DELETE_ORDER: PersistedTable[] = ["canvas_connections", "canvas_objects", "board_assets"];

/**
 * Watches the canvas store for user changes and writes them to the database
 * in debounced, batched upserts and deletes. Failed writes are retried with
 * backoff; nothing is lost while the page stays open.
 */
export class BoardSaver {
  /** Pending changes by record id: the table, and whether the record was removed. */
  private dirty = new Map<string, { table: PersistedTable; removed: boolean }>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<void> | null = null;
  private retryDelay = INITIAL_RETRY_DELAY_MS;
  private schemaSaved = false;
  private status: SaveStatus = "idle";
  private readonly debounceMs: number;
  private readonly batchSize: number;
  private readonly maxRetryDelayMs: number;

  constructor(
    private readonly store: TLStore,
    private readonly boardId: string,
    private readonly backend: PersistenceBackend,
    private readonly options: BoardSaverOptions = {},
  ) {
    this.debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
    this.maxRetryDelayMs = options.maxRetryDelayMs ?? DEFAULT_MAX_RETRY_DELAY_MS;
  }

  /** Starts listening to user changes. Returns a function that stops listening. */
  start(): () => void {
    return this.store.listen(
      ({ changes }) => {
        for (const record of Object.values(changes.added)) this.mark(record, false);
        for (const [, next] of Object.values(changes.updated)) this.mark(next, false);
        for (const record of Object.values(changes.removed)) this.mark(record, true);
        this.schedule(this.debounceMs);
      },
      { source: "user", scope: "document" },
    );
  }

  get hasPendingChanges(): boolean {
    return this.dirty.size > 0 || this.inFlight !== null;
  }

  /** Writes everything pending now. Resolves once all writes have settled. */
  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    while (this.inFlight) await this.inFlight;
    if (this.dirty.size === 0) return;

    this.inFlight = this.write().finally(() => {
      this.inFlight = null;
    });
    await this.inFlight;
  }

  dispose() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private mark(record: TLRecord, removed: boolean) {
    const table = tableForRecord(record);
    if (table) this.dirty.set(record.id, { table, removed });
  }

  private schedule(delay: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, delay);
  }

  private setStatus(status: SaveStatus) {
    if (status === this.status) return;
    this.status = status;
    this.options.onStatusChange?.(status);
  }

  private async write() {
    const batch = this.dirty;
    this.dirty = new Map();
    this.setStatus("saving");

    const upserts = new Map<PersistedTable, Row[]>();
    const removals = new Map<PersistedTable, string[]>();

    for (const [id, { table, removed }] of batch) {
      const record = removed ? undefined : this.store.get(id as TLRecord["id"]);
      if (record) {
        const row = recordToRow(record, this.boardId);
        if (row) upserts.set(table, [...(upserts.get(table) ?? []), row]);
      } else {
        removals.set(table, [...(removals.get(table) ?? []), id]);
      }
    }

    try {
      if (!this.schemaSaved) {
        await this.backend.saveSchema(this.store.schema.serialize());
        this.schemaSaved = true;
      }
      for (const table of WRITE_ORDER) {
        const rows = upserts.get(table) ?? [];
        for (let i = 0; i < rows.length; i += this.batchSize) {
          await this.backend.upsert(table, rows.slice(i, i + this.batchSize));
        }
      }
      for (const table of DELETE_ORDER) {
        const ids = removals.get(table) ?? [];
        for (let i = 0; i < ids.length; i += this.batchSize) {
          await this.backend.remove(table, ids.slice(i, i + this.batchSize));
        }
      }
      this.retryDelay = INITIAL_RETRY_DELAY_MS;
      this.setStatus(this.dirty.size > 0 ? "saving" : "saved");
    } catch (error) {
      logError("canvas.save", error, { boardId: this.boardId, changes: batch.size });
      // Re-queue, keeping any newer change made while this write was in flight.
      for (const [id, change] of batch) {
        if (!this.dirty.has(id)) this.dirty.set(id, change);
      }
      this.setStatus("error");
      this.schedule(this.retryDelay);
      this.retryDelay = Math.min(this.retryDelay * 2, this.maxRetryDelayMs);
    }
  }
}
