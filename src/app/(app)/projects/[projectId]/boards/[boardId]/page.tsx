import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireViewer } from "@/features/auth/session";
import { BoardCanvasClient } from "@/features/canvas/BoardCanvasClient";
import { getBoard, listBoards } from "@/features/projects/queries";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = PageProps<"/projects/[projectId]/boards/[boardId]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { boardId } = await params;
  if (!UUID_PATTERN.test(boardId)) return {};
  const board = await getBoard(boardId);
  return { title: board ? `${board.name} · ${board.projects?.name ?? ""}` : undefined };
}

export default async function BoardPage({ params }: Props) {
  const viewer = await requireViewer();
  const { projectId, boardId } = await params;
  if (!UUID_PATTERN.test(projectId) || !UUID_PATTERN.test(boardId)) notFound();

  const [board, boards] = await Promise.all([getBoard(boardId), listBoards(projectId)]);
  if (!board || board.project_id !== projectId) notFound();

  return (
    <BoardCanvasClient
      userId={viewer.id}
      projectId={projectId}
      projectName={board.projects?.name ?? ""}
      boardId={board.id}
      boardName={board.name}
      boards={boards.map(({ id, name }) => ({ id, name }))}
    />
  );
}
