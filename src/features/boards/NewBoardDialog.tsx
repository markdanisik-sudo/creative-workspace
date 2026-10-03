"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { createBoard } from "./actions";
import { BOARD_TEMPLATES, type BoardTemplateId } from "./templates";

interface NewBoardDialogProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export function NewBoardDialog({ projectId, open, onClose }: NewBoardDialogProps) {
  const toast = useToast();
  const [pendingId, setPendingId] = useState<BoardTemplateId | null>(null);
  const [, startTransition] = useTransition();

  const choose = (templateId: BoardTemplateId) => {
    setPendingId(templateId);
    startTransition(async () => {
      // On success the action redirects to the new board.
      const result = await createBoard(projectId, templateId);
      if (result && !result.ok) {
        toast.show({ title: result.error, tone: "error" });
        setPendingId(null);
      }
    });
  };

  return (
    <Dialog open={open} onClose={onClose} title="New board" className="max-w-[520px]">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {BOARD_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            disabled={pendingId !== null}
            onClick={() => choose(template.id)}
            className={cn(
              "flex min-h-24 flex-col items-start justify-between gap-3 rounded-md bg-surface-muted p-3.5 text-left",
              "transition-[background-color,transform,box-shadow] duration-150 ease-out",
              "hover:bg-surface hover:shadow-md active:scale-[0.98] disabled:opacity-60",
            )}
          >
            <span className="text-body font-semibold">{template.name}</span>
            <span className="flex w-full items-end justify-between gap-2 text-caption text-text-secondary">
              {template.description}
              {pendingId === template.id ? <Spinner size={14} /> : null}
            </span>
          </button>
        ))}
      </div>
    </Dialog>
  );
}
