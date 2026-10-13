"use client";

import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/Spinner";
import { useI18n } from "@/lib/i18n/client";
import type { BoardCanvasProps } from "./BoardCanvas";

function LoadingBoard() {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-bg text-text-tertiary">
      <Spinner size={20} />
      <span className="sr-only">{t("canvas.loadingBoard")}</span>
    </div>
  );
}

// The canvas is browser-only; it loads after the page shell.
const BoardCanvas = dynamic(() => import("./BoardCanvas").then((mod) => mod.BoardCanvas), {
  ssr: false,
  loading: () => <LoadingBoard />,
});

export function BoardCanvasClient(props: BoardCanvasProps) {
  return <BoardCanvas {...props} />;
}
