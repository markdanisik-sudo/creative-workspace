import Link from "next/link";
import { formatEdited } from "@/lib/format";
import type { Translator } from "@/lib/i18n";
import { ProjectActions } from "./ProjectActions";
import type { ProjectSummary } from "./types";

/** Every project as a large, numbered line, like the studio site's menu. */
export function ProjectIndex({
  projects,
  i18n,
  canManage,
}: {
  projects: ProjectSummary[];
  i18n: Translator;
  canManage: boolean;
}) {
  const { t, tp, locale } = i18n;
  return (
    <ul className="flex flex-col border-t border-border-strong">
      {projects.map((project, index) => (
        <li
          key={project.id}
          className="group relative grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border-strong py-5 sm:gap-6"
        >
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-5">
            <Link
              href={`/projects/${project.id}`}
              className="block min-w-0 text-headline font-medium after:absolute after:inset-0 sm:text-display"
            >
              <span className="block truncate transition-transform duration-300 ease-out group-hover:translate-x-2">
                {project.name}
              </span>
            </Link>
            <span className="shrink-0 text-caption text-text-secondary">
              {project.clientName ? `${project.clientName} · ` : ""}
              {t(`phases.${project.phase}`)} · {tp("plural.board", project.boardCount)} ·{" "}
              {formatEdited(project.updatedAt, locale)}
            </span>
          </div>
          {canManage ? (
            <ProjectActions projectId={project.id} projectName={project.name} className="relative z-10" />
          ) : (
            <span />
          )}
          <span aria-hidden="true" className="text-callout text-text-secondary tabular-nums">
            ({String(index + 1).padStart(2, "0")})
          </span>
        </li>
      ))}
    </ul>
  );
}
