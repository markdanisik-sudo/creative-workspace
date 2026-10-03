import type { Editor } from "tldraw";

const SAVE_DELAY_MS = 400;
const key = (boardId: string) => `atelier:camera:${boardId}`;

/** Restores where the viewer last looked at this board. Returns false if unknown. */
export function restoreCamera(editor: Editor, boardId: string): boolean {
  try {
    const saved = window.localStorage.getItem(key(boardId));
    if (!saved) return false;
    const camera = JSON.parse(saved) as { x: number; y: number; z: number };
    if (![camera.x, camera.y, camera.z].every(Number.isFinite)) return false;
    editor.setCamera(camera, { immediate: true });
    return true;
  } catch {
    return false;
  }
}

/** Remembers the camera per board in this browser. Returns a stop function. */
export function watchCamera(editor: Editor, boardId: string): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = editor.store.listen(
    () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          const { x, y, z } = editor.getCamera();
          window.localStorage.setItem(key(boardId), JSON.stringify({ x, y, z }));
        } catch {
          // Storage can be unavailable (private mode); the camera just isn't remembered.
        }
      }, SAVE_DELAY_MS);
    },
    { scope: "session" },
  );
  return () => {
    clearTimeout(timer);
    stop();
  };
}
