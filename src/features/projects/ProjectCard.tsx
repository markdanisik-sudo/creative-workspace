"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { ConfirmDialog, RenameDialog } from "@/components/ui/PromptDialogs";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { formatEdited, pluralize } from "@/lib/format";
import { deleteProject, renameProject } from "./actions";
import type { ProjectSummary } from "./types";

export function ProjectCover({
  project,
  className,
}: {
  project: ProjectSummary;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-surface-muted shadow-sm",
        "transition-[box-shadow,transform] duration-200 ease-out",
        "group-hover:shadow-md group-hover:-translate-y-0.5",
        className,
      )}
    >
      {project.coverUrl ? (
        // Signed, short-lived URLs: next/image optimisation would cache them past expiry.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={project.coverUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-end p-5">
          <span className="line-clamp-2 text-headline font-semibold text-text-tertiary/70">
            {project.name}
          </span>
        </div>
      )}
    </div>
  );
}

export function ProjectCard({
  project,
  large = false,
}: {
  project: ProjectSummary;
  large?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);

  return (
    <article className="group relative flex flex-col gap-3">
      <Link
        href={`/projects/${project.id}`}
        className="flex flex-col gap-3 rounded-lg outline-offset-4"
        aria-label={`Open ${project.name}`}
      >
        <ProjectCover project={project} className={large ? "aspect-[4/3]" : "aspect-[16/10]"} />
        <div className="flex flex-col gap-0.5 pr-8">
          <h3 className="truncate text-callout font-semibold">{project.name}</h3>
          <p className="truncate text-caption text-text-secondary">
            {formatEdited(project.updatedAt)} · {pluralize(project.itemCount, "item")}
          </p>
        </div>
      </Link>

      <div className="absolute right-0 bottom-1">
        <Menu
          label={`${project.name} options`}
          align="end"
          side="top"
          trigger={(props) => (
            <button
              type="button"
              aria-label={`Options for ${project.name}`}
              className={cn(
                "flex size-7 items-center justify-center rounded-sm text-text-secondary",
                "opacity-0 transition-opacity duration-150 hover:bg-surface-hover hover:text-text",
                "group-hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100",
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
            Delete project
          </MenuItem>
        </Menu>
      </div>

      <RenameDialog
        open={dialog === "rename"}
        onClose={() => setDialog(null)}
        title="Rename project"
        label="Project name"
        initialValue={project.name}
        onSubmit={async (name) => {
          const result = await renameProject(project.id, name);
          if (!result.ok) return result.error;
          router.refresh();
          return null;
        }}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        title={`Delete “${project.name}”?`}
        description="All boards and files in this project will be permanently deleted."
        confirmLabel="Delete"
        onConfirm={async () => {
          const result = await deleteProject(project.id);
          setDialog(null);
          if (!result.ok) toast.show({ title: result.error, tone: "error" });
          else router.refresh();
        }}
      />
    </article>
  );
}
