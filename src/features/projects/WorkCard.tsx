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

  // No picture yet: a slim pill instead of an empty frame waiting for one.
  if (!project.coverUrl) {
    return (
      <article className="group relative flex min-h-[68px] items-center self-start gap-3 rounded-full bg-surface py-2 pr-2 pl-6 shadow-sm transition-shadow duration-300 hover:shadow-md">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="truncate text-callout font-semibold">
            <Link href={`/projects/${project.id}`} className="after:absolute after:inset-0">
              {project.name}
            </Link>
          </h3>
          <p className="truncate text-caption text-text-secondary">
            {project.clientName ? `${project.clientName} · ` : ""}
            {tp("plural.board", project.boardCount)} · {formatEdited(project.updatedAt, locale)}
          </p>
        </div>
        {canManage && project.createdByClient ? (
          <span className="shrink-0 rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-text-inverse max-sm:hidden">
            {t("dashboard.fromClient")}
          </span>
        ) : null}
        <PhaseBadge phase={project.phase} t={t} className="shrink-0" />
        {canManage ? (
          <ProjectActions
            projectId={project.id}
            projectName={project.name}
            className="relative z-10 shrink-0"
            buttonClassName="rounded-full"
          />
        ) : null}
      </article>
    );
  }

  return (
    <article className="group relative flex flex-col rounded-xl bg-surface p-1.5 shadow-sm transition-shadow duration-300 hover:shadow-md">
      <ProjectCover
        project={project}
        placeholder="none"
        className="aspect-[16/11] rounded-[10px]"
      />
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
          <div className="flex items-center gap-1.5">
            {canManage && project.createdByClient ? (
              <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-text-inverse">
                {t("dashboard.fromClient")}
              </span>
            ) : null}
            <PhaseBadge phase={project.phase} t={t} />
          </div>
          <span className="text-[11px] text-text-tertiary">
            {formatEdited(project.updatedAt, locale)}
          </span>
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
