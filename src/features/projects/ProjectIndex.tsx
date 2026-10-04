import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatEdited, pluralize } from "@/lib/format";
import { ProjectActions } from "./ProjectActions";
import { ProjectCover } from "./ProjectCover";
import type { ProjectSummary } from "./types";

const COLUMNS =
  "grid-cols-[2.5rem_minmax(0,1fr)_2rem] sm:grid-cols-[3rem_minmax(0,1fr)_5.5rem_2rem] lg:grid-cols-[3.5rem_minmax(0,1fr)_7rem_7rem_9rem_5.5rem_2rem]";

/** A numbered, editorial index of projects separated by hairlines. */
export function ProjectIndex({ projects }: { projects: ProjectSummary[] }) {
  return (
    <div role="table" aria-label="Projects" className="flex flex-col">
      <div
        role="row"
        className={cn(
          "hidden items-end gap-4 pb-3 text-caption text-text-tertiary lg:grid",
          COLUMNS,
        )}
      >
        <span role="columnheader">No.</span>
        <span role="columnheader">Project</span>
        <span role="columnheader">Boards</span>
        <span role="columnheader">Items</span>
        <span role="columnheader">Edited</span>
        <span role="columnheader" className="sr-only">
          Cover
        </span>
        <span role="columnheader" className="sr-only">
          Actions
        </span>
      </div>

      {projects.map((project, index) => (
        <div
          key={project.id}
          role="row"
          className={cn(
            "group relative grid items-center gap-4 border-t border-border py-5 last:border-b",
            "transition-colors duration-150 hover:bg-surface-hover/50",
            COLUMNS,
          )}
        >
          <span role="cell" className="text-body text-text-tertiary tabular-nums">
            {String(index + 1).padStart(2, "0")}
          </span>

          <div role="cell" className="flex min-w-0 flex-col gap-1">
            {/* The whole row is the link target via the stretched pseudo-element. */}
            <Link
              href={`/projects/${project.id}`}
              className="block rounded-sm text-title font-semibold after:absolute after:inset-0"
            >
              <span className="block truncate transition-transform duration-200 ease-out group-hover:translate-x-1">
                {project.name}
              </span>
            </Link>
            <span className="truncate text-caption text-text-secondary lg:hidden">
              {formatEdited(project.updatedAt)} · {pluralize(project.boardCount, "board")} ·{" "}
              {pluralize(project.itemCount, "item")}
            </span>
          </div>

          <span role="cell" className="hidden text-body text-text-secondary tabular-nums lg:block">
            {project.boardCount}
          </span>
          <span role="cell" className="hidden text-body text-text-secondary tabular-nums lg:block">
            {project.itemCount}
          </span>
          <span role="cell" className="hidden text-body text-text-secondary lg:block">
            {formatEdited(project.updatedAt)}
          </span>

          <div role="cell" className="hidden sm:block">
            <ProjectCover
              project={project}
              placeholder="none"
              className="aspect-[4/3] w-[5.5rem] rounded-sm"
            />
          </div>

          <div role="cell" className="relative z-10">
            <ProjectActions projectId={project.id} projectName={project.name} />
          </div>
        </div>
      ))}
    </div>
  );
}
