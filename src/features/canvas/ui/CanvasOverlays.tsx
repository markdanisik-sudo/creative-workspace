"use client";

import { useEffect, useState, type RefObject } from "react";
import { useEditor, useValue } from "tldraw";
import { cn } from "@/lib/cn";

/** A quiet frame that appears while files are dragged over the board. */
export function DropOverlay({ targetRef }: { targetRef: RefObject<HTMLElement | null> }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    let depth = 0;
    const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes("Files") ?? false;

    const onEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth++;
      setActive(true);
    };
    const onLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setActive(false);
    };
    const onDrop = () => {
      depth = 0;
      setActive(false);
    };

    // Capture phase: observe without interfering with the canvas's own drop handling.
    target.addEventListener("dragenter", onEnter, true);
    target.addEventListener("dragleave", onLeave, true);
    target.addEventListener("drop", onDrop, true);
    window.addEventListener("dragend", onDrop);
    return () => {
      target.removeEventListener("dragenter", onEnter, true);
      target.removeEventListener("dragleave", onLeave, true);
      target.removeEventListener("drop", onDrop, true);
      window.removeEventListener("dragend", onDrop);
    };
  }, [targetRef]);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-3 z-[400] flex items-end justify-center rounded-[20px] pb-24",
        "border-2 border-dashed border-focus/50 bg-focus/[0.03] transition-opacity duration-200 ease-out",
        active ? "opacity-100" : "opacity-0",
      )}
    >
      <span className="rounded-full bg-surface px-4 py-2 text-body font-medium shadow-md">
        Drop to add to board
      </span>
    </div>
  );
}

/** Typography-only hint on an empty board. */
export function EmptyBoardHint() {
  const editor = useEditor();
  const isEmpty = useValue("empty board", () => editor.getCurrentPageShapeIds().size === 0, [
    editor,
  ]);
  if (!isEmpty) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[200] flex items-center justify-center px-6">
      <div className="flex max-w-sm flex-col items-center gap-2 text-center animate-fade-in">
        <p className="text-title font-semibold text-text-secondary">Start with anything.</p>
        <p className="text-callout text-text-tertiary">
          Drop images or files here, paste a link, or press + to add text, notes and checklists.
        </p>
      </div>
    </div>
  );
}
