import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app/AppHeader";
import { requireViewer } from "@/features/auth/session";
import { HubTabs } from "@/features/hub/HubTabs";
import { PhaseStepper } from "@/features/hub/PhaseStepper";
import { ProjectDetailsButton } from "@/features/hub/ProjectDetailsButton";
import { getProjectDetails } from "@/features/hub/queries";
import { getProject } from "@/features/projects/queries";
import { getI18n } from "@/lib/i18n/server";
import { formatEdited } from "@/lib/format";
import { isUuid } from "@/lib/ids";

/** Shared chrome for every section of a job: title, phase track and tabs. */
export default async function ProjectHubLayout({
  children,
  params,
}: LayoutProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();

  const [viewer, i18n, project, summary] = await Promise.all([
    requireViewer(),
    getI18n(),
    getProjectDetails(projectId),
    getProject(projectId),
  ]);
  if (!project || !summary) notFound();
  const { t, tp, locale } = i18n;

  return (
    <div className="min-h-dvh">
      <AppHeader viewer={viewer} />
      <main className="mx-auto max-w-[1272px] px-4 pt-8 pb-32 sm:px-8">
        <Link
          href="/projects"
          className="-ml-1 inline-flex items-center gap-0.5 rounded-sm py-1 pr-2 text-caption text-text-secondary hover:text-text"
        >
          <ChevronLeft size={14} aria-hidden="true" />
          {t("project.allProjects")}
        </Link>

        <header className="flex flex-col justify-between gap-6 pt-8 pb-10 sm:pt-12 lg:flex-row lg:items-end">
          <div className="flex min-w-0 flex-col gap-3">
            {project.clientName ? (
              <p className="text-callout text-text-secondary">{project.clientName}</p>
            ) : null}
            <h1 className="max-w-4xl text-display font-medium text-balance sm:text-hero">
              {project.name}
            </h1>
          </div>
          <div className="flex shrink-0 flex-col gap-3 lg:items-end lg:pb-2">
            <p className="text-callout text-text-secondary lg:text-right">
              {tp("plural.board", summary.boardCount)} · {tp("plural.item", summary.itemCount)}
              <br />
              {t("project.lastEdit", { when: formatEdited(summary.updatedAt, locale) })}
            </p>
            {viewer.isStudio ? <ProjectDetailsButton project={project} /> : null}
          </div>
        </header>

        {project.description ? (
          <p className="-mt-4 mb-10 max-w-2xl text-callout text-text-secondary">
            {project.description}
          </p>
        ) : null}

        <div className="mb-10 rounded-xl bg-surface px-5 py-4 shadow-sm">
          <PhaseStepper projectId={project.id} phase={project.phase} canEdit={viewer.isStudio} />
        </div>

        <div className="mb-10">
          <HubTabs
            projectId={project.id}
            isStudio={viewer.isStudio}
            openRequests={summary.openRequestCount}
          />
        </div>

        {children}
      </main>
    </div>
  );
}
