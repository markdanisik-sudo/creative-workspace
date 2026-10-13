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
import { useI18n } from "@/lib/i18n/client";
import { AddMenu } from "./AddMenu";
import { Panel, PanelDivider } from "./Panel";

const ICON = 17;
const ZOOM_ANIMATION = { animation: { duration: 220 } };

export function CanvasToolbar({ onShowShortcuts }: { onShowShortcuts: () => void }) {
  const editor = useEditor();
  const { t } = useI18n();
  const toolId = useValue("tool", () => editor.getCurrentToolId(), [editor]);
  const canUndo = useValue("can undo", () => editor.getCanUndo(), [editor]);
  const canRedo = useValue("can redo", () => editor.getCanRedo(), [editor]);
  const zoom = useValue("zoom", () => Math.round(editor.getZoomLevel() * 100), [editor]);
  const isGridMode = useValue("grid", () => editor.getInstanceState().isGridMode, [editor]);
  const isSnapMode = useValue("snap", () => editor.user.getIsSnapMode(), [editor]);

  const setTool = (id: string) => editor.setCurrentTool(id);

  return (
    <nav
      aria-label={t("canvas.tools")}
      className="pointer-events-none absolute inset-x-0 bottom-[max(16px,env(safe-area-inset-bottom))] z-[300] flex justify-center px-4"
    >
      <Panel className="animate-rise-in">
        <AddMenu />
        <PanelDivider />
        <IconButton
          label={t("canvas.select")}
          active={toolId === "select"}
          aria-pressed={toolId === "select"}
          onClick={() => setTool("select")}
        >
          <MousePointer2 size={ICON} />
        </IconButton>
        <IconButton
          label={t("canvas.pan")}
          active={toolId === "hand"}
          aria-pressed={toolId === "hand"}
          onClick={() => setTool("hand")}
        >
          <Hand size={ICON} />
        </IconButton>
        <PanelDivider />
        <IconButton label={t("canvas.undo")} disabled={!canUndo} onClick={() => editor.undo()}>
          <Undo2 size={ICON} />
        </IconButton>
        <IconButton label={t("canvas.redo")} disabled={!canRedo} onClick={() => editor.redo()}>
          <Redo2 size={ICON} />
        </IconButton>
        <PanelDivider />
        <div className="hidden items-center sm:flex">
          <IconButton
            label={t("canvas.zoomOut")}
            size="sm"
            onClick={() => editor.zoomOut(undefined, ZOOM_ANIMATION)}
          >
            <Minus size={15} />
          </IconButton>
          <Menu
            label={t("canvas.zoom")}
            side="top"
            align="end"
            trigger={(props) => (
              <button
                type="button"
                aria-label={t("canvas.zoomLevel", { percent: zoom })}
                className="h-8 min-w-[52px] rounded-sm px-1 text-caption font-medium text-text-secondary tabular-nums hover:bg-surface-hover hover:text-text"
                {...props}
              >
                {zoom}%
              </button>
            )}
          >
            <MenuItem shortcut="⇧1" onSelect={() => editor.zoomToFit(ZOOM_ANIMATION)}>
              {t("canvas.zoomToFit")}
            </MenuItem>
            <MenuItem shortcut="⇧2" onSelect={() => editor.zoomToSelection(ZOOM_ANIMATION)}>
              {t("canvas.zoomToSelection")}
            </MenuItem>
            <MenuItem shortcut="⇧0" onSelect={() => editor.resetZoom(undefined, ZOOM_ANIMATION)}>
              {t("canvas.zoomTo100")}
            </MenuItem>
          </Menu>
          <IconButton
            label={t("canvas.zoomIn")}
            size="sm"
            onClick={() => editor.zoomIn(undefined, ZOOM_ANIMATION)}
          >
            <Plus size={15} />
          </IconButton>
          <PanelDivider />
        </div>
        <Menu
          label={t("canvas.moreTools")}
          side="top"
          align="end"
          trigger={(props) => (
            <IconButton label={t("canvas.more")} {...props}>
              <MoreHorizontal size={ICON} />
            </IconButton>
          )}
        >
          <MenuItem icon={<PenLine size={16} />} shortcut="D" onSelect={() => setTool("draw")}>
            {t("canvas.draw")}
          </MenuItem>
          <MenuItem
            icon={<ArrowUpRight size={16} />}
            shortcut="A"
            onSelect={() => setTool("arrow")}
          >
            {t("canvas.arrow")}
          </MenuItem>
          <MenuItem icon={<Square size={16} />} shortcut="R" onSelect={() => setTool("geo")}>
            {t("canvas.shape")}
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            icon={<Grid3x3 size={16} />}
            shortcut={isGridMode ? t("common.on") : t("common.off")}
            onSelect={() => editor.updateInstanceState({ isGridMode: !isGridMode })}
          >
            {t("canvas.grid")}
          </MenuItem>
          <MenuItem
            icon={<Magnet size={16} />}
            shortcut={isSnapMode ? t("common.on") : t("common.off")}
            onSelect={() => editor.user.updateUserPreferences({ isSnapMode: !isSnapMode })}
          >
            {t("canvas.snap")}
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Keyboard size={16} />} shortcut="?" onSelect={onShowShortcuts}>
            {t("canvas.shortcuts")}
          </MenuItem>
        </Menu>
      </Panel>
    </nav>
  );
}
