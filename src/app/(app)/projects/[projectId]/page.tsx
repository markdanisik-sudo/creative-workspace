import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app/AppHeader";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireViewer } from "@/features/auth/session";
import { BoardGrid } from "@/features/boards/BoardGrid";
import { getProject, listBoards } from "@/features/projects/queries";
import { formatEdited, pluralize } from "@/lib/format";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: PageProps<"/projects/[projectId]">): Promise<Metadata> {
  const { projectId } = await params;
  if (!UUID_PATTERN.test(projectId)) return {};
  const project = await getProject(projectId);
  return { title: project?.name };
}

export default async function ProjectPage({ params }: PageProps<"/projects/[projectId]">) {
  const viewer = await requireViewer();
  const { projectId } = await params;
  if (!UUID_PATTERN.test(projectId)) notFound();

  const [project, boards] = await Promise.all([getProject(projectId), listBoards(projectId)]);
  if (!project) notFound();

  return (
    <div className="min-h-dvh">
      <AppHeader viewer={viewer} />
      <main className="mx-auto max-w-[1280px] px-4 pt-8 pb-32 sm:px-8">
        <Link
          href="/projects"
          className="-ml-1 inline-flex items-center gap-0.5 rounded-sm py-1 pr-2 text-caption text-text-secondary hover:text-text"
        >
          <ChevronLeft size={14} aria-hidden="true" />
          All projects
        </Link>
        <header className="flex flex-col justify-between gap-6 pt-10 pb-16 sm:pt-16 sm:pb-24 lg:flex-row lg:items-end">
          <h1 className="max-w-4xl text-display font-medium text-balance sm:text-hero">
            {project.name}
          </h1>
          <p className="shrink-0 text-body text-text-secondary lg:pb-2 lg:text-right">
            {pluralize(project.boardCount, "board")} · {pluralize(project.itemCount, "item")}
            <br />
            Last edit · {formatEdited(project.updatedAt)}
          </p>
        </header>
        <section className="flex flex-col gap-6" aria-label="Boards">
          <SectionLabel label="Boards" index={1} />
          <BoardGrid projectId={project.id} boards={boards} />
        </section>
      </main>
    </div>
  );
}
