import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/app/AppHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireViewer } from "@/features/auth/session";
import { FeaturedProject } from "@/features/projects/FeaturedProject";
import { NewProjectButton } from "@/features/projects/NewProjectDialog";
import { ProjectIndex } from "@/features/projects/ProjectIndex";
import { listProjects, search } from "@/features/projects/queries";
import { TodayLabel } from "@/features/projects/TodayLabel";
import type { ProjectSummary } from "@/features/projects/types";
import { cn } from "@/lib/cn";
import { formatEdited, pluralize } from "@/lib/format";

export const metadata: Metadata = { title: "Projects" };

type SortOrder = "recent" | "name";

function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6" aria-label={title}>
      <div className="flex items-baseline justify-between gap-4 border-b border-text pb-3">
        <h2 className="text-caption font-semibold tracking-[0.12em] uppercase">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function SortSwitch({ current }: { current: SortOrder }) {
  const options: { value: SortOrder; label: string }[] = [
    { value: "recent", label: "Recent" },
    { value: "name", label: "A–Z" },
  ];
  return (
    <nav aria-label="Sort projects" className="flex items-center gap-4 text-caption">
      {options.map(({ value, label }) => (
        <Link
          key={value}
          href={value === "recent" ? "/projects" : "/projects?sort=name"}
          scroll={false}
          aria-current={current === value ? "true" : undefined}
          className={cn(
            "rounded-sm transition-colors",
            current === value
              ? "font-semibold text-text"
              : "text-text-tertiary hover:text-text-secondary",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

function Masthead({ name, projects }: { name: string; projects: ProjectSummary[] }) {
  const boards = projects.reduce((sum, project) => sum + project.boardCount, 0);
  const items = projects.reduce((sum, project) => sum + project.itemCount, 0);
  const firstName = name.split(/\s+/)[0];
  return (
    <header className="flex flex-col gap-8 pt-6 pb-14 sm:pt-12 sm:pb-20 animate-rise-in">
      <TodayLabel className="text-caption font-semibold tracking-[0.12em] text-text-tertiary uppercase" />
      <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
        <h1 className="max-w-3xl text-display font-semibold text-balance sm:text-hero">
          Good to see you, {firstName}.
        </h1>
        {projects.length > 0 ? (
          <p className="shrink-0 text-callout text-text-secondary tabular-nums lg:pb-2 lg:text-right">
            {pluralize(projects.length, "project")}
            <span className="text-text-tertiary"> · </span>
            {pluralize(boards, "board")}
            <span className="text-text-tertiary"> · </span>
            {pluralize(items, "item")}
          </p>
        ) : null}
      </div>
    </header>
  );
}

async function SearchResultsView({ query }: { query: string }) {
  const results = await search(query);
  if (results.projects.length === 0 && results.boards.length === 0) {
    return <EmptyState title="No results" body={`Nothing matches “${query}”. Try another name.`} />;
  }
  return (
    <div className="flex flex-col gap-16 pt-10">
      <h1 className="text-headline font-semibold">Results for “{query}”</h1>
      {results.projects.length > 0 ? (
        <Section title="Projects">
          <ProjectIndex projects={results.projects} />
        </Section>
      ) : null}
      {results.boards.length > 0 ? (
        <Section title="Boards">
          <ul className="flex flex-col">
            {results.boards.map((board) => (
              <li key={board.id} className="border-b border-border">
                <Link
                  href={`/projects/${board.projectId}/boards/${board.id}`}
                  className="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-surface-hover/50"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-callout font-semibold">{board.name}</span>
                    <span className="truncate text-caption text-text-secondary">
                      {board.projectName}
                    </span>
                  </span>
                  <span className="shrink-0 text-caption text-text-tertiary">
                    {formatEdited(board.updatedAt)} · {pluralize(board.itemCount, "item")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
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
        <section className="flex flex-col items-start gap-4 border-t border-text pt-8 animate-rise-in">
          <h2 className="text-headline font-semibold">No projects yet</h2>
          <p className="max-w-sm text-callout text-text-secondary">Start collecting ideas.</p>
          <div className="mt-4">
            <NewProjectButton label="Create project" />
          </div>
        </section>
      </>
    );
  }

  const [latest] = projects;
  const indexed =
    sort === "name"
      ? [...projects].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        )
      : projects;

  return (
    <>
      <Masthead name={viewerName} projects={projects} />
      <div className="flex flex-col gap-20 sm:gap-28">
        <FeaturedProject project={latest} />
        {projects.length > 1 ? (
          <Section title="Index" aside={<SortSwitch current={sort} />}>
            <ProjectIndex projects={indexed} />
          </Section>
        ) : null}
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
