import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app/AppHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireViewer } from "@/features/auth/session";
import { NewProjectButton } from "@/features/projects/NewProjectDialog";
import { ProjectIndex } from "@/features/projects/ProjectIndex";
import { listProjects, search } from "@/features/projects/queries";
import { StartPanel } from "@/features/projects/StartPanel";
import type { ProjectSummary } from "@/features/projects/types";
import { WorkCard } from "@/features/projects/WorkCard";
import { cn } from "@/lib/cn";
import { formatEdited, pluralize } from "@/lib/format";

export const metadata: Metadata = { title: "Projects" };

type SortOrder = "recent" | "name";

const RECENT_COUNT = 4;

function SortSwitch({ current }: { current: SortOrder }) {
  const options: { value: SortOrder; label: string }[] = [
    { value: "recent", label: "Recent" },
    { value: "name", label: "A–Z" },
  ];
  return (
    <nav aria-label="Sort projects" className="flex items-center gap-3">
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
function Masthead({ name, projects }: { name: string; projects: ProjectSummary[] }) {
  const boards = projects.reduce((sum, project) => sum + project.boardCount, 0);
  const items = projects.reduce((sum, project) => sum + project.itemCount, 0);
  const firstName = name.split(/\s+/)[0];
  return (
    <header className="flex flex-col justify-between gap-8 pt-14 pb-16 sm:pt-24 sm:pb-24 lg:flex-row lg:items-end animate-rise-in">
      <h1 className="max-w-4xl text-display font-medium text-balance sm:text-hero">
        Good to see you, {firstName}.{" "}
        <span className="text-text-secondary">
          {projects.length > 0 ? "Pick up where you left off." : "Let's start something."}
        </span>
      </h1>
      {projects.length > 0 ? (
        <p className="shrink-0 text-body text-text-secondary lg:pb-2 lg:text-right">
          {pluralize(projects.length, "project")} · {pluralize(boards, "board")}
          <br />
          {pluralize(items, "item")} on your boards.
        </p>
      ) : null}
    </header>
  );
}

async function SearchResultsView({ query }: { query: string }) {
  const results = await search(query);
  if (results.projects.length === 0 && results.boards.length === 0) {
    return <EmptyState title="No results" body={`Nothing matches “${query}”. Try another name.`} />;
  }
  return (
    <div className="flex flex-col gap-16 pt-14">
      <h1 className="text-display font-medium">
        Results for <span className="text-text-secondary">“{query}”</span>
      </h1>
      {results.projects.length > 0 ? (
        <section className="flex flex-col gap-6">
          <SectionLabel label="Projects" index={1} />
          <ProjectIndex projects={results.projects} />
        </section>
      ) : null}
      {results.boards.length > 0 ? (
        <section className="flex flex-col gap-6">
          <SectionLabel label="Boards" index={results.projects.length > 0 ? 2 : 1} />
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
                    {formatEdited(board.updatedAt)} · {pluralize(board.itemCount, "item")}
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

async function ProjectsView({ viewerName, sort }: { viewerName: string; sort: SortOrder }) {
  const projects = await listProjects();

  if (projects.length === 0) {
    return (
      <>
        <Masthead name={viewerName} projects={projects} />
        <StartPanel index={1} />
        <div className="mt-6 flex items-center gap-3 text-body text-text-secondary">
          Or begin with a
          <NewProjectButton variant="secondary" label="Blank project" />
        </div>
      </>
    );
  }

  const recent = projects.slice(0, RECENT_COUNT);
  const indexed =
    sort === "name"
      ? [...projects].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        )
      : projects;

  return (
    <>
      <Masthead name={viewerName} projects={projects} />
      <div className="flex flex-col gap-24 sm:gap-32">
        <section aria-label="Recent work" className="flex flex-col gap-6">
          <SectionLabel label="Recent work" index={1} />
          <div className="grid gap-1.5 sm:grid-cols-2">
            {recent.map((project) => (
              <WorkCard key={project.id} project={project} />
            ))}
          </div>
        </section>

        <StartPanel index={2} />

        <section aria-label="All projects" className="flex flex-col gap-6">
          <SectionLabel label="All projects" index={3} aside={<SortSwitch current={sort} />} />
          <ProjectIndex projects={indexed} />
        </section>
      </div>
    </>
  );
}

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const viewer = await requireViewer();
  const { q, sort } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const order: SortOrder = sort === "name" ? "name" : "recent";

  return (
    <div className="min-h-dvh">
      <AppHeader viewer={viewer} actions={<NewProjectButton compact />} />
      <main className="mx-auto max-w-[1280px] px-4 pb-32 sm:px-8">
        {query ? (
          <SearchResultsView query={query} />
        ) : (
          <ProjectsView viewerName={viewer.displayName} sort={order} />
        )}
      </main>
    </div>
  );
}
