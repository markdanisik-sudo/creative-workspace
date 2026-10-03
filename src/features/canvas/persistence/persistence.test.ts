import {
  createShapeId,
  createTLStore,
  defaultBindingUtils,
  defaultShapeUtils,
  type TLPageId,
  type TLRecord,
} from "tldraw";
import { describe, expect, it, vi } from "vitest";
import { BoardSaver, type PersistenceBackend } from "./BoardSaver";
import { rowToShape, shapeToRow, tableForRecord, type ObjectRow } from "./mapping";

const BOARD_ID = "00000000-0000-0000-0000-000000000001";
const PAGE_ID = "page:page" as TLPageId;

function makeStore() {
  return createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils });
}

function noteShape(id = createShapeId()) {
  return {
    id,
    typeName: "shape",
    type: "note",
    parentId: PAGE_ID,
    index: "a1",
    x: 10,
    y: 20,
    rotation: 0.5,
    opacity: 1,
    isLocked: false,
    props: { w: 200, h: 200, color: "yellow" },
    meta: { createdBy: "test" },
  } as unknown as TLRecord & { typeName: "shape" };
}

describe("mapping", () => {
  it("round-trips a shape through a row", () => {
    const shape = noteShape();
    const row = shapeToRow(shape, BOARD_ID);
    expect(row).toMatchObject({
      board_id: BOARD_ID,
      id: shape.id,
      type: "note",
      parent_id: null,
      x: 10,
      y: 20,
      width: 200,
      height: 200,
      rotation: 0.5,
      z_index: "a1",
    });
    const back = rowToShape(row as ObjectRow, PAGE_ID);
    expect(back).toEqual(shape);
  });

  it("keeps the parent of nested shapes", () => {
    const shape = { ...noteShape(), parentId: "shape:frame" } as ReturnType<typeof noteShape>;
    expect(shapeToRow(shape, BOARD_ID).parent_id).toBe("shape:frame");
  });

  it("only persists document records", () => {
    expect(tableForRecord(noteShape())).toBe("canvas_objects");
    expect(tableForRecord({ typeName: "camera" } as unknown as TLRecord)).toBeNull();
  });
});

function fakeBackend() {
  const rows = new Map<string, unknown>();
  const backend: PersistenceBackend & { failNext: number } = {
    failNext: 0,
    upsert: vi.fn(async (_table, batch) => {
      if (backend.failNext > 0) {
        backend.failNext--;
        throw new Error("network down");
      }
      for (const row of batch) rows.set(row.id, row);
    }),
    remove: vi.fn(async (_table, ids) => {
      for (const id of ids) rows.delete(id);
    }),
    saveSchema: vi.fn(async () => {}),
  };
  return { backend, rows };
}

/** A minimal shape that passes store validation. */
function groupShape() {
  return { ...noteShape(), type: "group", props: {}, meta: {} } as ReturnType<typeof noteShape>;
}

describe("BoardSaver", () => {
  it("batches user changes into a single debounced write", async () => {
    vi.useFakeTimers();
    const store = makeStore();
    const { backend, rows } = fakeBackend();
    const saver = new BoardSaver(store, BOARD_ID, backend, { debounceMs: 100 });
    const stop = saver.start();

    const a = groupShape();
    const b = groupShape();
    store.put([a, b]);
    store.update(a.id, (shape) => ({ ...shape, x: 99 }));
    await vi.advanceTimersByTimeAsync(150);

    expect(backend.upsert).toHaveBeenCalledTimes(1);
    expect(rows.size).toBe(2);
    expect((rows.get(a.id) as { x: number }).x).toBe(99);

    store.remove([b.id]);
    await saver.flush();
    expect(rows.has(b.id)).toBe(false);

    stop();
    vi.useRealTimers();
  });

  it("ignores remote changes", async () => {
    const store = makeStore();
    const { backend } = fakeBackend();
    const saver = new BoardSaver(store, BOARD_ID, backend);
    saver.start();
    store.mergeRemoteChanges(() => store.put([groupShape()]));
    await saver.flush();
    expect(backend.upsert).not.toHaveBeenCalled();
  });

  it("retries failed writes without losing newer edits", async () => {
    vi.useFakeTimers();
    const store = makeStore();
    const { backend, rows } = fakeBackend();
    const statuses: string[] = [];
    const saver = new BoardSaver(store, BOARD_ID, backend, {
      debounceMs: 10,
      onStatusChange: (status) => statuses.push(status),
    });
    saver.start();

    const shape = groupShape();
    backend.failNext = 1;
    store.put([shape]);
    await vi.advanceTimersByTimeAsync(20);
    expect(statuses).toContain("error");
    expect(rows.size).toBe(0);

    await vi.advanceTimersByTimeAsync(2500);
    expect(rows.size).toBe(1);
    expect(statuses.at(-1)).toBe("saved");
    vi.useRealTimers();
  });
});
