"use client";

import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { ConfirmDialog, RenameDialog } from "@/components/ui/PromptDialogs";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { formatEdited, pluralize } from "@/lib/format";
import type { BoardSummary } from "@/features/projects/types";
import { deleteBoard, renameBoard } from "./actions";
import { NewBoardDialog } from "./NewBoardDialog";

function BoardCard({ board, index }: { board: BoardSummary; index: number }) {
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);

  return (
    <article className="group relative">
      <Link
        href={`/projects/${board.projectId}/boards/${board.id}`}
        className="flex aspect-[16/11] flex-col justify-between rounded-lg bg-surface-muted p-5 transition-colors duration-200 hover:bg-surface-pressed"
      >
        <span aria-hidden="true" className="text-caption text-text-secondary tabular-nums">
          ({String(index + 1).padStart(2, "0")})
        </span>
        <span className="flex items-end justify-between gap-4">
          <span className="min-w-0">
            <h3 className="truncate text-headline font-medium transition-transform duration-300 group-hover:translate-x-1">
              {board.name}
            </h3>
            <span className="text-caption text-text-secondary">
              {pluralize(board.itemCount, "item")}
            </span>
          </span>
          <span className="shrink-0 text-[11px] text-text-secondary">
            {formatEdited(board.updatedAt)}
          </span>
        </span>
      </Link>
      <div className="absolute top-3.5 right-3.5">
        <Menu
          label={`${board.name} options`}
          align="end"
          trigger={(props) => (
            <button
              type="button"
              aria-label={`Options for ${board.name}`}
              className={cn(
                "flex size-8 items-center justify-center rounded-full bg-surface/90 text-text-secondary hover:bg-surface",
                "opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100",
                "[@media(hover:none)]:opacity-100",
              )}
              {...props}
            >
              <MoreHorizontal size={16} />
            </button>
          )}
        >
          <MenuItem icon={<Pencil size={15} />} onSelect={() => setDialog("rename")}>
            Rename
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Trash2 size={15} />} destructive onSelect={() => setDialog("delete")}>
            Delete board
          </MenuItem>
        </Menu>
      </div>
      <RenameDialog
        open={dialog === "rename"}
        onClose={() => setDialog(null)}
        title="Rename board"
        label="Board name"
        initialValue={board.name}
        onSubmit={async (name) => {
          const result = await renameBoard(board.id, name);
          if (!result.ok) return result.error;
          router.refresh();
          return null;
        }}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        title={`Delete “${board.name}”?`}
        description="Everything on this board will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={async () => {
          const result = await deleteBoard(board.id);
          setDialog(null);
          if (!result.ok) toast.show({ title: result.error, tone: "error" });
          else router.refresh();
        }}
      />
    </article>
  );
}

export function BoardGrid({ projectId, boards }: { projectId: string; boards: BoardSummary[] }) {
  const [creating, setCreating] = useState(false);
  return (
    <>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((board, index) => (
          <BoardCard key={board.id} board={board} index={index} />
        ))}
        <button
          type="button"
          onClick={() => setCreating(true)}
          className={cn(
            "group flex aspect-[16/11] flex-col items-start justify-end gap-2 rounded-lg p-5 text-left text-text-secondary",
            "border border-dashed border-border-strong transition-colors duration-150",
            "hover:border-text hover:text-text",
          )}
        >
          <Plus
            size={22}
            aria-hidden="true"
            className="transition-transform duration-300 group-hover:rotate-90"
          />
          <span className="text-headline font-medium">New board</span>
        </button>
      </div>
      <NewBoardDialog projectId={projectId} open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
