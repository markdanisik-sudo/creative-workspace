"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { ConfirmDialog, RenameDialog } from "@/components/ui/PromptDialogs";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/client";
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
  const { t } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);

  return (
    <div className={className}>
      <Menu
        label={t("common.optionsFor", { name: projectName })}
        align="end"
        trigger={(props) => (
          <button
            type="button"
            aria-label={t("common.optionsFor", { name: projectName })}
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
          {t("common.rename")}
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<Trash2 size={15} />} destructive onSelect={() => setDialog("delete")}>
          {t("project.deleteAction")}
        </MenuItem>
      </Menu>

      <RenameDialog
        open={dialog === "rename"}
        onClose={() => setDialog(null)}
        title={t("project.renameTitle")}
        label={t("project.projectName")}
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
        title={t("project.deleteTitle", { name: projectName })}
        description={t("project.deleteBody")}
        confirmLabel={t("common.delete")}
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
