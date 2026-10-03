"use client";

import {
  ArrowUpRight,
  Grid3x3,
  Hand,
  Keyboard,
  Magnet,
  Minus,
  MoreHorizontal,
  MousePointer2,
  PenLine,
  Plus,
  Redo2,
  Square,
  Undo2,
} from "lucide-react";
import { useEditor, useValue } from "tldraw";
import { IconButton } from "@/components/ui/Button";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { AddMenu } from "./AddMenu";
import { Panel, PanelDivider } from "./Panel";

const ICON = 17;
const ZOOM_ANIMATION = { animation: { duration: 220 } };

export function CanvasToolbar({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  const editor = useEditor();
  const toolId = useValue("tool", () => editor.getCurrentToolId(), [editor]);
  const canUndo = useValue("can undo", () => editor.getCanUndo(), [editor]);
  const canRedo = useValue("can redo", () => editor.getCanRedo(), [editor]);
  const zoom = useValue("zoom", () => Math.round(editor.getZoomLevel() * 100), [editor]);
  const isGridMode = useValue("grid", () => editor.getInstanceState().isGridMode, [editor]);
  const isSnapMode = useValue("snap", () => editor.user.getIsSnapMode(), [editor]);

  const setTool = (id: string) => editor.setCurrentTool(id);

  return (
    <nav
      aria-label="Canvas tools"
      className="pointer-events-none absolute inset-x-0 bottom-[max(16px,env(safe-area-inset-bottom))] z-[300] flex justify-center px-4"
    >
      <Panel className="animate-rise-in">
        <AddMenu />
        <PanelDivider />
        <IconButton
          label="Select (V)"
          active={toolId === "select"}
          aria-pressed={toolId === "select"}
          onClick={() => setTool("select")}
        >
          <MousePointer2 size={ICON} />
        </IconButton>
        <IconButton
          label="Pan (H, or hold Space)"
          active={toolId === "hand"}
          aria-pressed={toolId === "hand"}
          onClick={() => setTool("hand")}
        >
          <Hand size={ICON} />
        </IconButton>
        <PanelDivider />
        <IconButton label="Undo (⌘Z)" disabled={!canUndo} onClick={() => editor.undo()}>
          <Undo2 size={ICON} />
        </IconButton>
        <IconButton label="Redo (⇧⌘Z)" disabled={!canRedo} onClick={() => editor.redo()}>
          <Redo2 size={ICON} />
        </IconButton>
        <PanelDivider />
        <div className="hidden items-center sm:flex">
          <IconButton
            label="Zoom out (−)"
            size="sm"
            onClick={() => editor.zoomOut(undefined, ZOOM_ANIMATION)}
          >
            <Minus size={15} />
          </IconButton>
          <Menu
            label="Zoom"
            side="top"
            align="end"
            trigger={(props) => (
              <button
                type="button"
                aria-label={`Zoom ${zoom}%`}
                className="h-8 min-w-[52px] rounded-sm px-1 text-caption font-medium text-text-secondary tabular-nums hover:bg-surface-hover hover:text-text"
                {...props}
              >
                {zoom}%
              </button>
            )}
          >
            <MenuItem shortcut="⇧1" onSelect={() => editor.zoomToFit(ZOOM_ANIMATION)}>
              Zoom to fit
            </MenuItem>
            <MenuItem shortcut="⇧2" onSelect={() => editor.zoomToSelection(ZOOM_ANIMATION)}>
              Zoom to selection
            </MenuItem>
            <MenuItem shortcut="⇧0" onSelect={() => editor.resetZoom(undefined, ZOOM_ANIMATION)}>
              Zoom to 100%
            </MenuItem>
          </Menu>
          <IconButton
            label="Zoom in (+)"
            size="sm"
            onClick={() => editor.zoomIn(undefined, ZOOM_ANIMATION)}
          >
            <Plus size={15} />
          </IconButton>
          <PanelDivider />
        </div>
        <Menu
          label="More tools"
          side="top"
          align="end"
          trigger={(props) => (
            <IconButton label="More" {...props}>
              <MoreHorizontal size={ICON} />
            </IconButton>
          )}
        >
          <MenuItem icon={<PenLine size={16} />} shortcut="D" onSelect={() => setTool("draw")}>
            Draw
          </MenuItem>
          <MenuItem
            icon={<ArrowUpRight size={16} />}
            shortcut="A"
            onSelect={() => setTool("arrow")}
          >
            Arrow
          </MenuItem>
          <MenuItem icon={<Square size={16} />} shortcut="R" onSelect={() => setTool("geo")}>
            Shape
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            icon={<Grid3x3 size={16} />}
            shortcut={isGridMode ? "On" : "Off"}
            onSelect={() => editor.updateInstanceState({ isGridMode: !isGridMode })}
          >
            Grid
          </MenuItem>
          <MenuItem
            icon={<Magnet size={16} />}
            shortcut={isSnapMode ? "On" : "Off"}
            onSelect={() => editor.user.updateUserPreferences({ isSnapMode: !isSnapMode })}
          >
            Snap to objects
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Keyboard size={16} />} shortcut="?" onSelect={onShowShortcuts}>
            Keyboard shortcuts
          </MenuItem>
        </Menu>
      </Panel>
    </nav>
  );
}
