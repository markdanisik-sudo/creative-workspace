import Link from "next/link";
import { formatEdited } from "@/lib/format";
import type { Translator } from "@/lib/i18n";
import { PhaseBadge } from "./PhaseBadge";
import { ProjectActions } from "./ProjectActions";
import { ProjectCover } from "./ProjectCover";
import type { ProjectSummary } from "./types";

/** A project framed like a portfolio piece: image on a white card, caption beneath. */
export function WorkCard({
  project,
  i18n,
  canManage,
}: {
  project: ProjectSummary;
  i18n: Translator;
  canManage: boolean;
}) {
  const { t, tp, locale } = i18n;
  return (
    <article className="group relative flex flex-col rounded-xl bg-surface p-1.5 shadow-sm transition-shadow duration-300 hover:shadow-md">
      <ProjectCover project={project} placeholder="none" className="aspect-[16/11] rounded-[10px]" />
      <div className="flex items-start justify-between gap-4 px-2.5 pt-3 pb-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="truncate text-callout font-semibold">
            <Link href={`/projects/${project.id}`} className="after:absolute after:inset-0">
              {project.name}
            </Link>
          </h3>
          <p className="truncate text-caption text-text-secondary">
            {project.clientName ? `${project.clientName} · ` : ""}
            {tp("plural.board", project.boardCount)} · {tp("plural.item", project.itemCount)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <PhaseBadge phase={project.phase} t={t} />
          <span className="text-[11px] text-text-tertiary">{formatEdited(project.updatedAt, locale)}</span>
        </div>
      </div>
      {canManage ? (
        <ProjectActions
          projectId={project.id}
          projectName={project.name}
          className="absolute top-3.5 right-3.5 z-10"
          buttonClassName="bg-surface/90 backdrop-blur hover:bg-surface"
        />
      ) : null}
    </article>
  );
}
