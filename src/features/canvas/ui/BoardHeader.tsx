"use client";

import { Check, ChevronDown, ChevronLeft, Keyboard, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconButton } from "@/components/ui/Button";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/Menu";
import { RenameDialog } from "@/components/ui/PromptDialogs";
import { renameBoard } from "@/features/boards/actions";
import { NewBoardDialog } from "@/features/boards/NewBoardDialog";
import type { SaveStatus } from "../persistence/BoardSaver";
import { Panel } from "./Panel";
import { SaveIndicator } from "./SaveIndicator";

export interface BoardLink {
  id: string;
  name: string;
}

interface BoardHeaderProps {
  projectId: string;
  projectName: string;
  boardId: string;
  boardName: string;
  boards: BoardLink[];
  saveStatus: SaveStatus;
  onShowShortcuts: () => void;
}

export function BoardHeader({
  projectId,
  projectName,
  boardId,
  boardName,
  boards,
  saveStatus,
  onShowShortcuts,
}: BoardHeaderProps) {
  const router = useRouter();
  const [name, setName] = useState(boardName);
  const [dialog, setDialog] = useState<"rename" | "new" | null>(null);

  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-[max(12px,env(safe-area-inset-top))] z-[300] flex items-start justify-between gap-3 px-3 sm:px-4">
        <Panel className="min-w-0 animate-fade-in">
          <Link
            href={`/projects/${projectId}`}
            aria-label={`Back to ${projectName}`}
            title={projectName}
            className="flex h-9 min-w-0 items-center gap-1 rounded-md pr-2 pl-1.5 text-body text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
          >
            <ChevronLeft size={17} className="shrink-0" aria-hidden="true" />
            <span className="hidden max-w-[180px] truncate sm:inline">{projectName}</span>
          </Link>
          <span aria-hidden="true" className="hidden text-text-tertiary sm:inline">
            /
          </span>
          <Menu
            label="Boards"
            trigger={(props) => (
              <button
                type="button"
                className="flex h-9 min-w-0 items-center gap-1.5 rounded-md px-2.5 text-body font-semibold text-text transition-colors hover:bg-surface-hover"
                {...props}
              >
                <span className="max-w-[200px] truncate">{name}</span>
                <ChevronDown size={14} className="shrink-0 text-text-tertiary" aria-hidden="true" />
              </button>
            )}
          >
            <MenuLabel>Boards in {projectName}</MenuLabel>
            {boards.map((board) => (
              <MenuItem
                key={board.id}
                icon={board.id === boardId ? <Check size={15} /> : <span />}
                onSelect={() =>
                  board.id !== boardId && router.push(`/projects/${projectId}/boards/${board.id}`)
                }
              >
                {board.id === boardId ? name : board.name}
              </MenuItem>
            ))}
            <MenuSeparator />
            <MenuItem icon={<Plus size={15} />} onSelect={() => setDialog("new")}>
              New board…
            </MenuItem>
            <MenuItem icon={<Pencil size={15} />} onSelect={() => setDialog("rename")}>
              Rename board…
            </MenuItem>
          </Menu>
        </Panel>

        <Panel className="animate-fade-in">
          <SaveIndicator status={saveStatus} />
          <IconButton label="Keyboard shortcuts (?)" onClick={onShowShortcuts}>
            <Keyboard size={17} />
          </IconButton>
        </Panel>
      </header>

      <RenameDialog
        open={dialog === "rename"}
        onClose={() => setDialog(null)}
        title="Rename board"
        label="Board name"
        initialValue={name}
        onSubmit={async (value) => {
          const result = await renameBoard(boardId, value);
          if (!result.ok) return result.error;
          setName(value.trim());
          return null;
        }}
      />
      <NewBoardDialog
        projectId={projectId}
        open={dialog === "new"}
        onClose={() => setDialog(null)}
      />
    </>
  );
}
