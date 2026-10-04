"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { ConfirmDialog, RenameDialog } from "@/components/ui/PromptDialogs";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { deleteProject, renameProject } from "./actions";

interface ProjectActionsProps {
  projectId: string;
  projectName: string;
  /** Hidden until the surrounding `group` is hovered (always shown on touch). */
  revealOnHover?: boolean;
  className?: string;
  buttonClassName?: string;
}

/** The ⋯ menu for a project: rename and delete. */
export function ProjectActions({
  projectId,
  projectName,
  revealOnHover = true,
  className,
  buttonClassName,
}: ProjectActionsProps) {
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);

  return (
    <div className={className}>
      <Menu
        label={`${projectName} options`}
        align="end"
        trigger={(props) => (
          <button
            type="button"
            aria-label={`Options for ${projectName}`}
            className={cn(
              "flex size-8 items-center justify-center rounded-sm text-text-secondary",
              "transition-opacity duration-150 hover:bg-surface-hover hover:text-text",
              revealOnHover &&
                "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100 [@media(hover:none)]:opacity-100",
              buttonClassName,
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
          Delete project
        </MenuItem>
      </Menu>

      <RenameDialog
        open={dialog === "rename"}
        onClose={() => setDialog(null)}
        title="Rename project"
        label="Project name"
        initialValue={projectName}
        onSubmit={async (name) => {
          const result = await renameProject(projectId, name);
          if (!result.ok) return result.error;
          router.refresh();
          return null;
        }}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        title={`Delete “${projectName}”?`}
        description="All boards and files in this project will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={async () => {
          const result = await deleteProject(projectId);
          setDialog(null);
          if (!result.ok) toast.show({ title: result.error, tone: "error" });
          else router.refresh();
        }}
      />
    </div>
  );
}
