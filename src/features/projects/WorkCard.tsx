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

  // No picture yet: a compact box like the Plan's, not an empty frame.
  if (!project.coverUrl) {
    return (
      <article className="surface-invert group relative flex min-h-[176px] flex-col justify-between gap-6 rounded-[24px] bg-surface p-5 shadow-sm transition-[box-shadow,transform] duration-300 ease-out hover:shadow-md active:scale-[0.995] sm:p-6">
        <div className="flex items-center justify-between gap-3 text-caption">
          <span className="min-w-0 truncate font-medium">
            <span aria-hidden="true">/</span>
            {project.clientName ?? t("dashboard.projectLabel")}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {canManage && project.createdByClient ? (
              <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-text-inverse">
                {t("dashboard.fromClient")}
              </span>
            ) : null}
            {canManage ? (
              <ProjectActions
                projectId={project.id}
                projectName={project.name}
                className="relative z-10 -my-1.5 -mr-2"
              />
            ) : null}
          </span>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="line-clamp-2 text-title leading-tight font-semibold">
              <Link href={`/projects/${project.id}`} className="after:absolute after:inset-0">
                {project.name}
              </Link>
            </h3>
            <p className="truncate text-caption text-text-secondary">
              {tp("plural.board", project.boardCount)} · {formatEdited(project.updatedAt, locale)}
            </p>
          </div>
          <PhaseBadge phase={project.phase} t={t} className="shrink-0" />
        </div>
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
