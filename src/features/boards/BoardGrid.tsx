"use client";

import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { ConfirmDialog, RenameDialog } from "@/components/ui/PromptDialogs";
import { useToast } from "@/components/ui/Toast";
import type { BoardSummary } from "@/features/projects/types";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { formatEdited } from "@/lib/format";
import { deleteBoard, renameBoard } from "./actions";
import { NewBoardDialog } from "./NewBoardDialog";

function BoardCard({ board, index, canManage }: { board: BoardSummary; index: number; canManage: boolean }) {
  const { t, tp, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);

  return (
    <article className="group relative">
      <Link
        href={`/projects/${board.projectId}/boards/${board.id}`}
        className="flex aspect-[16/11] flex-col justify-between rounded-xl bg-surface p-5 shadow-sm transition-shadow duration-300 hover:shadow-md"
      >
        <span aria-hidden="true" className="text-caption text-text-secondary tabular-nums">
          ({String(index + 1).padStart(2, "0")})
        </span>
        <span className="flex items-end justify-between gap-4">
          <span className="min-w-0">
            <h3 className="truncate text-headline font-medium transition-transform duration-300 group-hover:translate-x-1">
              {board.name}
            </h3>
            <span className="text-caption text-text-secondary">{tp("plural.item", board.itemCount)}</span>
          </span>
          <span className="shrink-0 text-[11px] text-text-tertiary">{formatEdited(board.updatedAt, locale)}</span>
        </span>
      </Link>
      {canManage ? (
        <div className="absolute top-3.5 right-3.5">
          <Menu
            label={t("common.optionsFor", { name: board.name })}
            align="end"
            trigger={(props) => (
              <button
                type="button"
                aria-label={t("common.optionsFor", { name: board.name })}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full bg-surface-muted text-text-secondary hover:text-text",
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
              {t("common.rename")}
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={<Trash2 size={15} />} destructive onSelect={() => setDialog("delete")}>
              {t("board.deleteAction")}
            </MenuItem>
          </Menu>
        </div>
      ) : null}
      <RenameDialog
        open={dialog === "rename"}
        onClose={() => setDialog(null)}
        title={t("board.renameTitle")}
        label={t("board.boardName")}
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
        title={t("board.deleteTitle", { name: board.name })}
        description={t("board.deleteBody")}
        confirmLabel={t("common.delete")}
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

export function BoardGrid({
  projectId,
  boards,
  canManage,
}: {
  projectId: string;
  boards: BoardSummary[];
  canManage: boolean;
}) {
  const { t } = useI18n();
  const [creating, setCreating] = useState(false);
  return (
    <>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {boards.map((board, index) => (
          <BoardCard key={board.id} board={board} index={index} canManage={canManage} />
        ))}
        {canManage ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className={cn(
              "group flex aspect-[16/11] flex-col items-start justify-end gap-2 rounded-xl p-5 text-left text-text-secondary",
              "border border-dashed border-border-strong transition-colors duration-150",
              "hover:border-text hover:text-text",
            )}
          >
            <Plus size={22} aria-hidden="true" className="transition-transform duration-300 group-hover:rotate-90" />
            <span className="text-headline font-medium">{t("board.newBoard")}</span>
          </button>
        ) : null}
      </div>
      {canManage ? (
        <NewBoardDialog projectId={projectId} open={creating} onClose={() => setCreating(false)} />
      ) : null}
    </>
  );
}
