import {
  HTMLContainer,
  Rectangle2d,
  ShapeUtil,
  T,
  resizeBox,
  stopEventPropagation,
  useEditor,
  useIsEditing,
  type TLResizeInfo,
} from "tldraw";
import { useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { CHECKLIST_TYPE, type ChecklistItem, type ChecklistShape } from "./types";
import styles from "./shapes.module.css";

const PADDING = 16;
const TITLE_HEIGHT = 30;
const ROW_HEIGHT = 32;
const FOOTER_HEIGHT = 30;
const MIN_WIDTH = 200;
export const CHECKLIST_DEFAULT_WIDTH = 280;

export function checklistHeight(itemCount: number) {
  return PADDING * 2 + TITLE_HEIGHT + itemCount * ROW_HEIGHT + FOOTER_HEIGHT;
}

export function newChecklistItem(text = ""): ChecklistItem {
  return { id: crypto.randomUUID(), text, checked: false };
}

export class ChecklistShapeUtil extends ShapeUtil<ChecklistShape> {
  static override type = CHECKLIST_TYPE;
  static override props = {
    w: T.number,
    h: T.number,
    title: T.string,
    items: T.arrayOf(T.object({ id: T.string, text: T.string, checked: T.boolean })),
  };

  getDefaultProps(): ChecklistShape["props"] {
    const items = [newChecklistItem()];
    return {
      w: CHECKLIST_DEFAULT_WIDTH,
      h: checklistHeight(items.length),
      title: "Checklist",
      items,
    };
  }

  override canEdit() {
    return true;
  }

  override canResize() {
    return true;
  }

  override isAspectRatioLocked() {
    return false;
  }

  getGeometry(shape: ChecklistShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  getIndicatorPath(shape: ChecklistShape) {
    const path = new Path2D();
    path.roundRect(0, 0, shape.props.w, shape.props.h, 14);
    return path;
  }

  // Height always follows the item count; only the width is user-resizable.
  override onBeforeCreate(shape: ChecklistShape) {
    return this.withHeight(shape);
  }

  override onBeforeUpdate(_prev: ChecklistShape, next: ChecklistShape) {
    return this.withHeight(next);
  }

  override onResize(shape: ChecklistShape, info: TLResizeInfo<ChecklistShape>) {
    const resized = resizeBox(shape, info, { minWidth: MIN_WIDTH });
    return { ...resized, y: shape.y, props: { ...resized.props, h: shape.props.h } };
  }

  override onEditEnd(shape: ChecklistShape) {
    // Drop empty rows left over from typing, keeping at least one.
    const filled = shape.props.items.filter((item) => item.text.trim());
    const items = filled.length > 0 ? filled : shape.props.items.slice(0, 1);
    if (items.length !== shape.props.items.length) {
      this.editor.updateShape<ChecklistShape>({
        id: shape.id,
        type: CHECKLIST_TYPE,
        props: { items },
      });
    }
  }

  component(shape: ChecklistShape) {
    return <ChecklistComponent shape={shape} />;
  }

  private withHeight(shape: ChecklistShape): ChecklistShape {
    const h = checklistHeight(shape.props.items.length);
    return shape.props.h === h ? shape : { ...shape, props: { ...shape.props, h } };
  }
}

function ChecklistComponent({ shape }: { shape: ChecklistShape }) {
  const editor = useEditor();
  const isEditing = useIsEditing(shape.id);
  const rootRef = useRef<HTMLDivElement>(null);
  // Item to focus after a structural edit (add/remove), applied once it renders.
  const focusRequest = useRef<string | null>(null);
  const { title, items, w, h } = shape.props;
  const done = items.filter((item) => item.checked).length;

  const update = (props: Partial<ChecklistShape["props"]>) =>
    editor.updateShape<ChecklistShape>({ id: shape.id, type: CHECKLIST_TYPE, props });

  const setItems = (next: ChecklistItem[]) => update({ items: next });

  // Entering edit mode focuses the first empty item, or the title.
  useLayoutEffect(() => {
    if (!isEditing || focusRequest.current) return;
    const empty = items.find((item) => !item.text);
    const target = empty
      ? rootRef.current?.querySelector<HTMLInputElement>(`[data-item="${empty.id}"]`)
      : rootRef.current?.querySelector<HTMLInputElement>("input");
    target?.focus();
    // Only when editing starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  useLayoutEffect(() => {
    if (!isEditing || !focusRequest.current) return;
    const input = rootRef.current?.querySelector<HTMLInputElement>(
      `[data-item="${focusRequest.current}"]`,
    );
    focusRequest.current = null;
    input?.focus();
  });

  const focusItem = (itemId: string) => {
    rootRef.current?.querySelector<HTMLInputElement>(`[data-item="${itemId}"]`)?.focus();
  };

  const addItemAfter = (index: number) => {
    const item = newChecklistItem();
    focusRequest.current = item.id;
    setItems([...items.slice(0, index + 1), item, ...items.slice(index + 1)]);
  };

  const onItemKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    const item = items[index];
    if (event.key === "Enter") {
      event.preventDefault();
      addItemAfter(index);
    } else if (event.key === "Backspace" && item.text === "" && items.length > 1) {
      event.preventDefault();
      const previous = items[Math.max(0, index - 1)];
      focusRequest.current = previous.id === item.id ? items[1].id : previous.id;
      setItems(items.filter((_, i) => i !== index));
    } else if (event.key === "ArrowDown" && index < items.length - 1) {
      event.preventDefault();
      focusItem(items[index + 1].id);
    } else if (event.key === "ArrowUp" && index > 0) {
      event.preventDefault();
      focusItem(items[index - 1].id);
    } else if (event.key === "Escape") {
      event.preventDefault();
      editor.setEditingShape(null);
    }
  };

  return (
    <HTMLContainer
      id={shape.id}
      className={styles.card}
      style={{ width: w, height: h, pointerEvents: "all" }}
    >
      <div ref={rootRef} className={styles.checklist} style={{ padding: PADDING }}>
        {isEditing ? (
          <input
            className={styles.checklistTitle}
            value={title}
            placeholder="Checklist"
            aria-label="Checklist title"
            onChange={(event) => update({ title: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === "ArrowDown") {
                event.preventDefault();
                if (items[0]) focusItem(items[0].id);
              }
              if (event.key === "Escape") editor.setEditingShape(null);
            }}
            onPointerDown={stopEventPropagation}
            style={{ height: TITLE_HEIGHT }}
          />
        ) : (
          <div className={styles.checklistTitle} style={{ height: TITLE_HEIGHT }}>
            {title || "Checklist"}
          </div>
        )}

        <ul className={styles.checklistItems} role="list">
          {items.map((item, index) => (
            <li key={item.id} className={styles.checklistRow} style={{ height: ROW_HEIGHT }}>
              <button
                type="button"
                role="checkbox"
                aria-checked={item.checked}
                aria-label={item.text || "Item"}
                className={styles.checkbox}
                data-checked={item.checked}
                // Toggling works without entering edit mode.
                onPointerDown={stopEventPropagation}
                onClick={(event) => {
                  event.stopPropagation();
                  setItems(
                    items.map((it) => (it.id === item.id ? { ...it, checked: !it.checked } : it)),
                  );
                }}
              >
                <svg viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M2.5 6.2 4.9 8.5 9.5 3.6" />
                </svg>
              </button>
              {isEditing ? (
                <input
                  data-item={item.id}
                  className={styles.checklistInput}
                  data-checked={item.checked}
                  value={item.text}
                  placeholder="New item"
                  aria-label={`Item ${index + 1}`}
                  onChange={(event) =>
                    setItems(
                      items.map((it) =>
                        it.id === item.id ? { ...it, text: event.target.value } : it,
                      ),
                    )
                  }
                  onKeyDown={(event) => onItemKeyDown(event, index)}
                  onPointerDown={stopEventPropagation}
                />
              ) : (
                <span className={styles.checklistText} data-checked={item.checked}>
                  {item.text || <span className={styles.placeholder}>New item</span>}
                </span>
              )}
            </li>
          ))}
        </ul>

        <div className={styles.checklistFooter} style={{ height: FOOTER_HEIGHT }}>
          {isEditing ? (
            <button
              type="button"
              className={styles.addItem}
              onPointerDown={stopEventPropagation}
              onClick={() => addItemAfter(items.length - 1)}
            >
              + Add item
            </button>
          ) : (
            <span>
              {done} of {items.length} done
            </span>
          )}
        </div>
      </div>
    </HTMLContainer>
  );
}
