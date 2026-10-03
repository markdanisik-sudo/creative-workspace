"use client";

import "tldraw/tldraw.css";
import "./canvas.css";

import { getAssetUrls } from "@tldraw/assets/selfHosted";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createTLStore,
  DefaultFontStyle,
  DefaultSizeStyle,
  PageRecordType,
  Tldraw,
  useEditor,
  type Editor,
  type TLComponents,
  type TLStore,
} from "tldraw";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { isBoardTemplateId } from "@/features/boards/templates";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { friendlyErrors, logError } from "@/lib/errors";
import { MAX_UPLOAD_BYTES } from "./assets/files";
import { createSupabaseAssetStore } from "./assets/supabase-asset-store";
import { assetUtils, BOARD_PAGE_ID, bindingUtils, shapeUtils } from "./config";
import { registerExternalContentHandlers } from "./external-content";
import { BoardSaver, type SaveStatus } from "./persistence/BoardSaver";
import { createSupabaseBackend, loadBoardRecords } from "./persistence/supabase-backend";
import { applyTemplate } from "./templates";
import { canvasThemes } from "./theme";
import { BoardHeader, type BoardLink } from "./ui/BoardHeader";
import { CanvasToolbar } from "./ui/CanvasToolbar";
import { DropOverlay, EmptyBoardHint } from "./ui/CanvasOverlays";
import { ContextBar } from "./ui/ContextBar";
import { ShortcutsDialog } from "./ui/ShortcutsDialog";
import { restoreCamera, watchCamera } from "./camera";
import { registerMediaPlacement } from "./media-placement";

export interface BoardCanvasProps {
  userId: string;
  projectId: string;
  projectName: string;
  boardId: string;
  boardName: string;
  boards: BoardLink[];
}

// tldraw's own chrome is replaced by ours; keep only the context menu,
// rich-text toolbar, dialogs, toasts and accessibility helpers.
const components: TLComponents = {
  ActionsMenu: null,
  CursorChatBubble: null,
  DebugMenu: null,
  DebugPanel: null,
  FollowingIndicator: null,
  HelperButtons: null,
  HelpMenu: null,
  ImageToolbar: null,
  KeyboardShortcutsDialog: null,
  MainMenu: null,
  MenuPanel: null,
  Minimap: null,
  NavigationPanel: null,
  PageMenu: null,
  PeopleMenu: null,
  QuickActions: null,
  SharePanel: null,
  StylePanel: null,
  Toolbar: null,
  TopPanel: null,
  VideoToolbar: null,
  ZoomMenu: null,
};

// Fonts, icons and translations are served from our own origin (see scripts/).
const assetUrls = getAssetUrls({ baseUrl: "/tldraw" });

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; store: TLStore; template: string | null };

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

function CanvasUi({
  saveStatus,
  ...props
}: Omit<BoardCanvasProps, "userId"> & { saveStatus: SaveStatus }) {
  const editor = useEditor();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const showShortcuts = useCallback(() => setShortcutsOpen(true), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "?" || isTypingTarget(event.target) || editor.getEditingShapeId()) return;
      event.preventDefault();
      setShortcutsOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editor]);

  return (
    <>
      <EmptyBoardHint />
      <BoardHeader {...props} saveStatus={saveStatus} onShowShortcuts={showShortcuts} />
      <ContextBar />
      <CanvasToolbar onShowShortcuts={showShortcuts} />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </>
  );
}

export function BoardCanvas({
  userId,
  projectId,
  projectName,
  boardId,
  boardName,
  boards,
}: BoardCanvasProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [attempt, setAttempt] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  useEffect(() => {
    let cancelled = false;
    const assets = createSupabaseAssetStore({ supabase, userId, projectId, boardId });
    const store = createTLStore({
      shapeUtils,
      bindingUtils,
      assetUtils,
      assets,
      themes: canvasThemes,
    });

    loadBoardRecords(supabase, store, boardId, BOARD_PAGE_ID)
      .then(({ records, template }) => {
        if (cancelled) return;
        // Loaded data is "remote": it must not be written straight back.
        store.mergeRemoteChanges(() => {
          store.put([
            PageRecordType.create({ id: BOARD_PAGE_ID, name: boardName, index: "a1" as never }),
          ]);
          store.put(records);
        });
        setState({ status: "ready", store, template });
      })
      .catch((error) => {
        logError("canvas.load", error, { boardId });
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
    // boardName only labels the page; reloading for it would discard the canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, userId, projectId, boardId, attempt]);

  const onMount = useCallback(
    (editor: Editor) => {
      if (state.status !== "ready") return;

      editor.user.updateUserPreferences({ colorScheme: "system" });
      editor.setStyleForNextShapes(DefaultFontStyle, "sans", { history: "ignore" });
      editor.setStyleForNextShapes(DefaultSizeStyle, "m", { history: "ignore" });
      registerExternalContentHandlers(editor);
      const stopMediaPlacement = registerMediaPlacement(editor);

      // Start saving first so starter content from a template is persisted too.
      const saver = new BoardSaver(
        editor.store,
        boardId,
        createSupabaseBackend(supabase, boardId),
        {
          onStatusChange: setSaveStatus,
        },
      );
      const stopSaving = saver.start();

      const isNew = editor.getCurrentPageShapeIds().size === 0;
      if (isNew && state.template && isBoardTemplateId(state.template)) {
        applyTemplate(editor, state.template);
      } else if (!restoreCamera(editor, boardId) && !isNew) {
        editor.zoomToFit({ animation: { duration: 0 } });
        if (editor.getZoomLevel() > 1) editor.resetZoom();
      }
      if (state.template) {
        void supabase.from("boards").update({ template: null }).eq("id", boardId);
      }

      const stopCamera = watchCamera(editor, boardId);

      const flush = () => void saver.flush();
      const onVisibility = () => document.visibilityState === "hidden" && flush();
      const onBeforeUnload = (event: BeforeUnloadEvent) => {
        if (!saver.hasPendingChanges) return;
        flush();
        event.preventDefault();
      };
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("beforeunload", onBeforeUnload);

      return () => {
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("beforeunload", onBeforeUnload);
        stopCamera();
        stopMediaPlacement();
        stopSaving();
        flush();
        saver.dispose();
      };
    },
    [state, boardId, supabase],
  );

  if (state.status === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-bg text-text-tertiary">
        <Spinner size={20} />
        <span className="sr-only">Loading board</span>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
        <p className="text-title font-semibold">This board couldn&apos;t be opened.</p>
        <p className="text-callout text-text-secondary">{friendlyErrors.generic}</p>
        <Button
          variant="primary"
          onClick={() => {
            setState({ status: "loading" });
            setAttempt((n) => n + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="atelier-canvas fixed inset-0 bg-bg">
      <Tldraw
        store={state.store}
        shapeUtils={shapeUtils}
        bindingUtils={bindingUtils}
        assetUtils={assetUtils}
        themes={canvasThemes}
        components={components}
        onMount={onMount}
        maxAssetSize={MAX_UPLOAD_BYTES}
        assetUrls={assetUrls}
        licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY || undefined}
      >
        <CanvasUi
          projectId={projectId}
          projectName={projectName}
          boardId={boardId}
          boardName={boardName}
          boards={boards}
          saveStatus={saveStatus}
        />
      </Tldraw>
      <DropOverlay targetRef={containerRef} />
    </div>
  );
}
