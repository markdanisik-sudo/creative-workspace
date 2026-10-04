import Link from "next/link";
import { formatEdited, pluralize } from "@/lib/format";
import { ProjectActions } from "./ProjectActions";
import { ProjectCover } from "./ProjectCover";
import type { ProjectSummary } from "./types";

/** A project framed like a portfolio piece: image in a grey mat, caption beneath. */
export function WorkCard({ project }: { project: ProjectSummary }) {
  return (
    <article className="group relative flex flex-col rounded-lg bg-surface-muted p-1.5">
      <ProjectCover project={project} placeholder="none" className="aspect-[16/11] rounded-md" />
      <div className="flex items-start justify-between gap-4 px-2 pt-3 pb-2">
        <div className="flex min-w-0 flex-col">
          <h3 className="truncate text-body font-semibold">
            <Link href={`/projects/${project.id}`} className="after:absolute after:inset-0">
              {project.name}
            </Link>
          </h3>
          <p className="truncate text-caption text-text-secondary">
            {pluralize(project.boardCount, "board")} · {pluralize(project.itemCount, "item")}
          </p>
        </div>
        <span className="shrink-0 pt-0.5 text-[11px] text-text-secondary">
          {formatEdited(project.updatedAt)}
        </span>
      </div>
      <ProjectActions
        projectId={project.id}
        projectName={project.name}
        className="absolute top-3.5 right-3.5 z-10"
        buttonClassName="bg-surface/90 backdrop-blur hover:bg-surface"
      />
    </article>
  );
}
