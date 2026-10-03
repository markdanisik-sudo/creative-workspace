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

function BoardCard({ board }: { board: BoardSummary }) {
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);

  return (
    <article className="group relative">
      <Link
        href={`/projects/${board.projectId}/boards/${board.id}`}
        className={cn(
          "flex aspect-[16/10] flex-col justify-end gap-1 rounded-lg bg-surface p-5 shadow-sm",
          "transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md",
        )}
      >
        <h3 className="truncate pr-8 text-title font-semibold">{board.name}</h3>
        <p className="text-caption text-text-secondary">
          {formatEdited(board.updatedAt)} · {pluralize(board.itemCount, "item")}
        </p>
      </Link>
      <div className="absolute top-3 right-3">
        <Menu
          label={`${board.name} options`}
          align="end"
          trigger={(props) => (
            <button
              type="button"
              aria-label={`Options for ${board.name}`}
              className={cn(
                "flex size-7 items-center justify-center rounded-sm text-text-secondary hover:bg-surface-hover",
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
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((board) => (
          <BoardCard key={board.id} board={board} />
        ))}
        <button
          type="button"
          onClick={() => setCreating(true)}
          className={cn(
            "flex aspect-[16/10] flex-col items-center justify-center gap-2 rounded-lg text-text-secondary",
            "border border-dashed border-border-strong transition-colors duration-150",
            "hover:bg-surface-hover hover:text-text",
          )}
        >
          <Plus size={20} aria-hidden="true" />
          <span className="text-body font-medium">New board</span>
        </button>
      </div>
      <NewBoardDialog projectId={projectId} open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
