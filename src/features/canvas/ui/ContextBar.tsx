"use client";

import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowDownToLine,
  ArrowUpToLine,
  Copy,
  Crop,
  LayoutGrid,
  Lock,
  LockOpen,
  Trash2,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  DefaultColorStyle,
  DefaultSizeStyle,
  DefaultTextAlignStyle,
  getColorValue,
  useEditor,
  useValue,
  type TLDefaultColorStyle,
  type TLDefaultSizeStyle,
  type TLDefaultTextAlignStyle,
  type TLShapeId,
} from "tldraw";
import { Button, IconButton } from "@/components/ui/Button";
import { Menu, MenuItem, useMenuClose } from "@/components/ui/Menu";
import { cn } from "@/lib/cn";
import type { MessageKey } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { startCrop } from "./actions";
import { Panel, PanelDivider } from "./Panel";

const ICON = 16;
const GAP = 12;
const EDGE_MARGIN = 12;
const TOP_SAFE_AREA = 64;
const DUPLICATE_OFFSET = 24;
const TIDY_GAP = 16;

const COLORS: TLDefaultColorStyle[] = [
  "black",
  "grey",
  "white",
  "yellow",
  "orange",
  "light-red",
  "red",
  "light-violet",
  "violet",
  "light-blue",
  "blue",
  "light-green",
  "green",
];

const SIZES: { value: TLDefaultSizeStyle; label: MessageKey }[] = [
  { value: "s", label: "canvas.sizeSmall" },
  { value: "m", label: "canvas.sizeMedium" },
  { value: "l", label: "canvas.sizeLarge" },
  { value: "xl", label: "canvas.sizeExtraLarge" },
];

const TEXT_ALIGNS: { value: TLDefaultTextAlignStyle; label: MessageKey }[] = [
  { value: "start", label: "canvas.left" },
  { value: "middle", label: "canvas.center" },
  { value: "end", label: "canvas.right" },
];

type AlignOperation = "left" | "center-horizontal" | "right" | "top" | "center-vertical" | "bottom";

const ALIGNMENTS: { op: AlignOperation; label: MessageKey; icon: ReactNode }[] = [
  { op: "left", label: "canvas.alignLeft", icon: <AlignStartVertical size={ICON} /> },
  {
    op: "center-horizontal",
    label: "canvas.alignCenters",
    icon: <AlignCenterVertical size={ICON} />,
  },
  { op: "right", label: "canvas.alignRight", icon: <AlignEndVertical size={ICON} /> },
  { op: "top", label: "canvas.alignTop", icon: <AlignStartHorizontal size={ICON} /> },
  {
    op: "center-vertical",
    label: "canvas.alignMiddles",
    icon: <AlignCenterHorizontal size={ICON} />,
  },
  { op: "bottom", label: "canvas.alignBottom", icon: <AlignEndHorizontal size={ICON} /> },
];

function sharedValue<T>(
  style: { type: "shared"; value: T } | { type: "mixed" } | undefined,
): T | null | undefined {
  if (!style) return undefined;
  return style.type === "shared" ? style.value : null;
}

function ColorSwatches({
  current,
  onPick,
}: {
  current: TLDefaultColorStyle | null;
  onPick: (c: TLDefaultColorStyle) => void;
}) {
  const editor = useEditor();
  const { t } = useI18n();
  const close = useMenuClose();
  const mode = useValue("color mode", () => editor.getColorMode(), [editor]);
  const colors = editor.getCurrentTheme().colors[mode];
  return (
    <div className="grid grid-cols-5 gap-1.5 p-1">
      {COLORS.map((color) => (
        <button
          key={color}
          type="button"
          role="menuitem"
          tabIndex={-1}
          aria-label={t(`canvas.colors.${color}`)}
          aria-current={current === color || undefined}
          onClick={() => {
            onPick(color);
            close();
          }}
          className={cn(
            "size-7 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)] outline-none transition-transform duration-150",
            "hover:scale-110 focus-visible:scale-110 focus-visible:ring-2 focus-visible:ring-focus",
            current === color && "ring-2 ring-text ring-offset-2 ring-offset-surface",
          )}
          style={{ background: getColorValue(colors, color, "solid") }}
        />
      ))}
    </div>
  );
}

export function ContextBar() {
  const editor = useEditor();
  const { t } = useI18n();
  const [bar, setBar] = useState<HTMLDivElement | null>(null);
  const [barSize, setBarSize] = useState({ width: 0, height: 44 });

  useEffect(() => {
    if (!bar) return;
    const observer = new ResizeObserver(() =>
      setBarSize({ width: bar.offsetWidth, height: bar.offsetHeight }),
    );
    observer.observe(bar);
    return () => observer.disconnect();
  }, [bar]);

  const state = useValue(
    "context bar",
    () => {
      const isCropping = editor.isIn("select.crop");
      const visible =
        (editor.isIn("select.idle") || isCropping) &&
        editor.getSelectedShapeIds().length > 0 &&
        editor.getEditingShapeId() === null;
      if (!visible) return null;
      const bounds = editor.getSelectionRotatedScreenBounds();
      const viewport = editor.getViewportScreenBounds();
      if (!bounds) return null;
      return {
        isCropping,
        bounds: { x: bounds.x - viewport.x, y: bounds.y - viewport.y, w: bounds.w, h: bounds.h },
        viewport: { w: viewport.w, h: viewport.h },
      };
    },
    [editor],
  );

  const selection = useValue(
    "selection info",
    () => {
      const shapes = editor.getSelectedShapes();
      const styles = editor.getSharedStyles();
      return {
        ids: shapes.map((shape) => shape.id) as TLShapeId[],
        single: shapes.length === 1 ? shapes[0] : null,
        allLocked: shapes.length > 0 && shapes.every((shape) => shape.isLocked),
        color: sharedValue(styles.get(DefaultColorStyle)) as TLDefaultColorStyle | null | undefined,
        size: sharedValue(styles.get(DefaultSizeStyle)) as TLDefaultSizeStyle | null | undefined,
        textAlign: sharedValue(styles.get(DefaultTextAlignStyle)) as
          TLDefaultTextAlignStyle | null | undefined,
      };
    },
    [editor],
  );

  if (!state) return null;

  const { bounds, viewport } = state;
  const barHeight = barSize.height;
  const above = bounds.y - GAP - barHeight;
  const top =
    above >= TOP_SAFE_AREA
      ? above
      : Math.min(bounds.y + bounds.h + GAP, viewport.h - barHeight - 96);
  const half = barSize.width / 2;
  const left = Math.min(
    Math.max(bounds.x + bounds.w / 2, half + EDGE_MARGIN),
    viewport.w - half - EDGE_MARGIN,
  );

  const { ids, single } = selection;
  const run = (name: string, fn: () => void) => {
    editor.markHistoryStoppingPoint(name);
    fn();
  };

  return (
    <div
      className="pointer-events-none absolute z-[300]"
      style={{ top: Math.max(top, EDGE_MARGIN), left, transform: "translateX(-50%)" }}
    >
      <Panel
        ref={setBar}
        role="toolbar"
        aria-label={t("canvas.selection")}
        className="animate-pop-in"
      >
        {state.isCropping ? (
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              editor.setCroppingShape(null);
              editor.setCurrentTool("select.idle");
            }}
          >
            {t("common.done")}
          </Button>
        ) : (
          <>
            {single?.type === "image" ? (
              <IconButton
                label={t("canvas.crop")}
                size="sm"
                onClick={() => startCrop(editor, single.id)}
              >
                <Crop size={ICON} />
              </IconButton>
            ) : null}

            {ids.length > 1 ? (
              <>
                <Menu
                  label={t("canvas.align")}
                  trigger={(props) => (
                    <IconButton label={t("canvas.align")} size="sm" {...props}>
                      <AlignStartVertical size={ICON} />
                    </IconButton>
                  )}
                >
                  {ALIGNMENTS.map(({ op, label, icon }) => (
                    <MenuItem
                      key={op}
                      icon={icon}
                      onSelect={() => run("align", () => editor.alignShapes(ids, op))}
                    >
                      {t(label)}
                    </MenuItem>
                  ))}
                </Menu>
                <IconButton
                  label={t("canvas.tidy")}
                  size="sm"
                  onClick={() => run("tidy", () => editor.packShapes(ids, TIDY_GAP))}
                >
                  <LayoutGrid size={ICON} />
                </IconButton>
              </>
            ) : null}

            {selection.color !== undefined ? (
              <Menu
                label={t("canvas.colour")}
                trigger={(props) => (
                  <button
                    type="button"
                    aria-label={t("canvas.colour")}
                    title={t("canvas.colour")}
                    className="flex size-8 items-center justify-center rounded-sm hover:bg-surface-hover"
                    {...props}
                  >
                    <span
                      className="size-4 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]"
                      style={{
                        background: selection.color
                          ? getColorValue(
                              editor.getCurrentTheme().colors[editor.getColorMode()],
                              selection.color,
                              "solid",
                            )
                          : "conic-gradient(#f4c542, #e5484d, #8e4ec6, #0a84ff, #30a46c, #f4c542)",
                      }}
                    />
                  </button>
                )}
              >
                <ColorSwatches
                  current={selection.color}
                  onPick={(color) =>
                    run("color", () => editor.setStyleForSelectedShapes(DefaultColorStyle, color))
                  }
                />
              </Menu>
            ) : null}

            {selection.size !== undefined ? (
              <Menu
                label={t("canvas.textSize")}
                trigger={(props) => (
                  <button
                    type="button"
                    aria-label={t("canvas.textSize")}
                    title={t("canvas.textSize")}
                    className="h-8 min-w-8 rounded-sm px-2 text-caption font-semibold text-text-secondary uppercase hover:bg-surface-hover hover:text-text"
                    {...props}
                  >
                    {selection.size ?? "–"}
                  </button>
                )}
              >
                {SIZES.map(({ value, label }) => (
                  <MenuItem
                    key={value}
                    shortcut={value === selection.size ? "✓" : undefined}
                    onSelect={() =>
                      run("size", () => editor.setStyleForSelectedShapes(DefaultSizeStyle, value))
                    }
                  >
                    {t(label)}
                  </MenuItem>
                ))}
              </Menu>
            ) : null}

            {selection.textAlign !== undefined ? (
              <Menu
                label={t("canvas.textAlignment")}
                trigger={(props) => (
                  <IconButton label={t("canvas.textAlignment")} size="sm" {...props}>
                    {selection.textAlign === "middle" ? (
                      <AlignCenterVertical size={ICON} />
                    ) : selection.textAlign === "end" ? (
                      <AlignEndVertical size={ICON} />
                    ) : (
                      <AlignStartVertical size={ICON} />
                    )}
                  </IconButton>
                )}
              >
                {TEXT_ALIGNS.map(({ value, label }) => (
                  <MenuItem
                    key={value}
                    shortcut={value === selection.textAlign ? "✓" : undefined}
                    onSelect={() =>
                      run("text align", () =>
                        editor.setStyleForSelectedShapes(DefaultTextAlignStyle, value),
                      )
                    }
                  >
                    {t(label)}
                  </MenuItem>
                ))}
              </Menu>
            ) : null}

            <PanelDivider />
            <IconButton
              label={t("canvas.duplicate")}
              size="sm"
              onClick={() =>
                run("duplicate", () =>
                  editor.duplicateShapes(ids, { x: DUPLICATE_OFFSET, y: DUPLICATE_OFFSET }),
                )
              }
            >
              <Copy size={ICON} />
            </IconButton>
            <IconButton
              label={t("canvas.bringForward")}
              size="sm"
              onClick={() => run("forward", () => editor.bringForward(ids))}
            >
              <ArrowUpToLine size={ICON} />
            </IconButton>
            <IconButton
              label={t("canvas.sendBackward")}
              size="sm"
              onClick={() => run("backward", () => editor.sendBackward(ids))}
            >
              <ArrowDownToLine size={ICON} />
            </IconButton>
            <IconButton
              label={selection.allLocked ? t("canvas.unlock") : t("canvas.lock")}
              size="sm"
              active={selection.allLocked}
              onClick={() => run("lock", () => editor.toggleLock(ids))}
            >
              {selection.allLocked ? <Lock size={ICON} /> : <LockOpen size={ICON} />}
            </IconButton>
            <IconButton
              label={t("canvas.deleteShape")}
              size="sm"
              className="hover:text-danger"
              onClick={() => run("delete", () => editor.deleteShapes(ids))}
            >
              <Trash2 size={ICON} />
            </IconButton>
          </>
        )}
      </Panel>
    </div>
  );
}
