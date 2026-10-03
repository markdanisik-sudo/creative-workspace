import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app/AppHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireViewer } from "@/features/auth/session";
import { NewProjectButton } from "@/features/projects/NewProjectDialog";
import { ProjectCard } from "@/features/projects/ProjectCard";
import { listProjects, search } from "@/features/projects/queries";
import { formatEdited, pluralize } from "@/lib/format";

export const metadata: Metadata = { title: "Projects" };

const RECENT_COUNT = 4;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5" aria-label={title}>
      <h2 className="text-caption font-semibold tracking-[0.06em] text-text-secondary uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

async function SearchResultsView({ query }: { query: string }) {
  const results = await search(query);
  const empty = results.projects.length === 0 && results.boards.length === 0;
  if (empty) {
    return <EmptyState title="No results" body={`Nothing matches “${query}”. Try another name.`} />;
  }
  return (
    <div className="flex flex-col gap-14">
      {results.projects.length > 0 ? (
        <Section title="Projects">
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </Section>
      ) : null}
      {results.boards.length > 0 ? (
        <Section title="Boards">
          <ul className="flex flex-col">
            {results.boards.map((board) => (
              <li key={board.id}>
                <Link
                  href={`/projects/${board.projectId}/boards/${board.id}`}
                  className="flex items-center justify-between gap-4 rounded-md px-3 py-3 transition-colors hover:bg-surface-hover"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-callout font-medium">{board.name}</span>
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

async function ProjectsView() {
  const projects = await listProjects();
  if (projects.length === 0) {
    return (
      <EmptyState
        title="No projects yet"
        body="Start collecting ideas."
        action={<NewProjectButton label="Create project" />}
      />
    );
  }

  const recent = projects.slice(0, RECENT_COUNT);
  const all = [...projects].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );

  return (
    <div className="flex flex-col gap-16">
      <Section title="Recent">
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {recent.map((project) => (
            <ProjectCard key={project.id} project={project} large />
          ))}
        </div>
      </Section>
      {projects.length > RECENT_COUNT ? (
        <Section title="All projects">
          <div className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 lg:grid-cols-5">
            {all.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const viewer = await requireViewer();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  return (
    <div className="min-h-dvh">
      <AppHeader viewer={viewer} actions={<NewProjectButton />} />
      <main className="mx-auto max-w-[1280px] px-4 pt-10 pb-24 sm:px-8">
        <h1 className="mb-10 text-headline font-semibold">
          {query ? `Results for “${query}”` : "Projects"}
        </h1>
        {query ? <SearchResultsView query={query} /> : <ProjectsView />}
      </main>
    </div>
  );
}
