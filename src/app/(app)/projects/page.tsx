import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app/AppHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireViewer } from "@/features/auth/session";
import { NewProjectButton } from "@/features/projects/NewProjectDialog";
import { ProjectIndex } from "@/features/projects/ProjectIndex";
import { listProjects, search } from "@/features/projects/queries";
import { StartChoices } from "@/features/projects/StartChoices";
import { listMyInvitations } from "@/features/people/queries";
import type { ProjectSummary } from "@/features/projects/types";
import { WorkCard } from "@/features/projects/WorkCard";
import type { Translator } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import { cn } from "@/lib/cn";
import { formatEdited } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("dashboard.title") };
}

type SortOrder = "recent" | "name";

const RECENT_COUNT = 4;

function SortSwitch({ current, t }: { current: SortOrder; t: Translator["t"] }) {
  const options: { value: SortOrder; label: string }[] = [
    { value: "recent", label: t("dashboard.sortRecent") },
    { value: "name", label: t("dashboard.sortName") },
  ];
  return (
    <nav aria-label={t("dashboard.sortProjects")} className="flex items-center gap-3">
      {options.map(({ value, label }) => (
        <Link
          key={value}
          href={value === "recent" ? "/projects" : "/projects?sort=name"}
          scroll={false}
          aria-current={current === value ? "true" : undefined}
          className={cn(
            "rounded-sm transition-colors",
            current === value ? "text-text" : "hover:text-text",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Two-tone statement headline, with a quiet summary on the right. */
function Masthead({
  name,
  projects,
  i18n,
}: {
  name: string;
  projects: ProjectSummary[];
  i18n: Translator;
}) {
  const { t, tp } = i18n;
  const boards = projects.reduce((sum, project) => sum + project.boardCount, 0);
  const items = projects.reduce((sum, project) => sum + project.itemCount, 0);
  const firstName = name.split(/\s+/)[0];
  return (
    <header className="flex flex-col justify-between gap-8 pt-14 pb-16 sm:pt-24 sm:pb-24 lg:flex-row lg:items-end animate-rise-in">
      <h1 className="max-w-4xl text-display font-medium text-balance sm:text-hero">
        {t("dashboard.greeting", { name: firstName })}{" "}
        <span className="text-text-secondary">
          {projects.length > 0 ? t("dashboard.greetingActive") : t("dashboard.greetingEmpty")}
        </span>
      </h1>
      {projects.length > 0 ? (
        <p className="shrink-0 text-callout text-text-secondary lg:pb-2 lg:text-right">
          {tp("plural.project", projects.length)} · {tp("plural.board", boards)}
          <br />
          {t("dashboard.onYourBoards", { items: tp("plural.item", items) })}
        </p>
      ) : null}
    </header>
  );
}

async function SearchResultsView({
  query,
  i18n,
  canManage,
}: {
  query: string;
  i18n: Translator;
  canManage: boolean;
}) {
  const { t, tp, locale } = i18n;
  const results = await search(query);
  if (results.projects.length === 0 && results.boards.length === 0) {
    return (
      <EmptyState
        title={t("dashboard.noResultsTitle")}
        body={t("dashboard.noResultsBody", { query })}
      />
    );
  }
  return (
    <div className="flex flex-col gap-16 pt-14">
      <h1 className="text-display font-medium">
        {t("dashboard.resultsFor")} <span className="text-text-secondary">“{query}”</span>
      </h1>
      {results.projects.length > 0 ? (
        <section className="flex flex-col gap-6">
          <SectionLabel label={t("dashboard.projectsSection")} index={1} />
          <ProjectIndex projects={results.projects} i18n={i18n} canManage={canManage} />
        </section>
      ) : null}
      {results.boards.length > 0 ? (
        <section className="flex flex-col gap-6">
          <SectionLabel
            label={t("dashboard.boardsSection")}
            index={results.projects.length > 0 ? 2 : 1}
          />
          <ul className="flex flex-col border-t border-border-strong">
            {results.boards.map((board) => (
              <li key={board.id} className="border-b border-border-strong">
                <Link
                  href={`/projects/${board.projectId}/boards/${board.id}`}
                  className="group flex items-baseline justify-between gap-4 py-4"
                >
                  <span className="flex min-w-0 items-baseline gap-4">
                    <span className="truncate text-title font-medium transition-transform duration-300 group-hover:translate-x-2">
                      {board.name}
                    </span>
                    <span className="truncate text-caption text-text-secondary">
                      {board.projectName}
                    </span>
                  </span>
                  <span className="shrink-0 text-caption text-text-secondary">
                    {formatEdited(board.updatedAt, locale)} · {tp("plural.item", board.itemCount)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

async function ProjectsView({
  viewerName,
  sort,
  i18n,
  isStudio,
}: {
  viewerName: string;
  sort: SortOrder;
  i18n: Translator;
  isStudio: boolean;
}) {
  const { t } = i18n;
  const [projects, invitations] = await Promise.all([listProjects(), listMyInvitations()]);

  if (projects.length === 0) {
    return (
      <>
        <Masthead name={viewerName} projects={projects} i18n={i18n} />
        <StartChoices invitations={invitations} askClient={isStudio} />
      </>
    );
  }

  const recent = projects.slice(0, RECENT_COUNT);
  const indexed =
    sort === "name"
      ? [...projects].sort((a, b) =>
          a.name.localeCompare(b.name, i18n.locale, { sensitivity: "base" }),
        )
      : projects;

  return (
    <>
      <Masthead name={viewerName} projects={projects} i18n={i18n} />
      <div className="flex flex-col gap-24 sm:gap-32">
        <section aria-label={t("dashboard.recentWork")} className="flex flex-col gap-6">
          <SectionLabel
            label={isStudio ? t("dashboard.recentWork") : t("dashboard.yourProjects")}
            index={1}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {recent.map((project) => (
              <WorkCard key={project.id} project={project} i18n={i18n} canManage={isStudio} />
            ))}
          </div>
        </section>

        <section aria-label={t("dashboard.startProject")}>
          <StartChoices invitations={invitations} askClient={isStudio} firstIndex={2} />
        </section>

        {projects.length > RECENT_COUNT || isStudio ? (
          <section aria-label={t("dashboard.allProjects")} className="flex flex-col gap-6">
            <SectionLabel
              label={t("dashboard.allProjects")}
              index={4}
              aside={<SortSwitch current={sort} t={t} />}
            />
            <ProjectIndex projects={indexed} i18n={i18n} canManage={isStudio} />
          </section>
        ) : null}
      </div>
    </>
  );
}

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const [viewer, i18n] = await Promise.all([requireViewer(), getI18n()]);
  const { q, sort } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const order: SortOrder = sort === "name" ? "name" : "recent";

  return (
    <div className="min-h-dvh">
      <AppHeader
        viewer={viewer}
        actions={<NewProjectButton compact askClient={viewer.isStudio} />}
      />
      <main className="mx-auto max-w-[1272px] px-4 pb-32 sm:px-8">
        {query ? (
          <SearchResultsView query={query} i18n={i18n} canManage={viewer.isStudio} />
        ) : (
          <ProjectsView
            viewerName={viewer.displayName}
            sort={order}
            i18n={i18n}
            isStudio={viewer.isStudio}
          />
        )}
      </main>
    </div>
  );
}
