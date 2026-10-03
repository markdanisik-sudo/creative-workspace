import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app/AppHeader";
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
      <main className="mx-auto max-w-[1280px] px-4 pt-6 pb-24 sm:px-8">
        <Link
          href="/projects"
          className="-ml-1.5 inline-flex items-center gap-0.5 rounded-sm py-1 pr-2 text-body text-text-secondary hover:text-text"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Projects
        </Link>
        <div className="mt-4 mb-10 flex flex-col gap-1">
          <h1 className="text-display font-semibold">{project.name}</h1>
          <p className="text-callout text-text-secondary">
            {pluralize(project.boardCount, "board")} · {pluralize(project.itemCount, "item")} ·{" "}
            {formatEdited(project.updatedAt)}
          </p>
        </div>
        <BoardGrid projectId={project.id} boards={boards} />
      </main>
    </div>
  );
}
