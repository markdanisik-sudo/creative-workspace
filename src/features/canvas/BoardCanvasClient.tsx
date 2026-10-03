"use client";

import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/Spinner";
import type { BoardCanvasProps } from "./BoardCanvas";

// The canvas is browser-only; it loads after the page shell.
const BoardCanvas = dynamic(() => import("./BoardCanvas").then((mod) => mod.BoardCanvas), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-bg text-text-tertiary">
      <Spinner size={20} />
      <span className="sr-only">Loading board</span>
    </div>
  ),
});

export function BoardCanvasClient(props: BoardCanvasProps) {
  return <BoardCanvas {...props} />;
}
