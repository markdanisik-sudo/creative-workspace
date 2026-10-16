import type { Metadata } from "next";
import { getProjectDetails, listTasks } from "@/features/hub/queries";
import { PhaseChecklist } from "@/features/hub/PhaseChecklist";
import { listShotChecks } from "@/features/workspace/queries";

export async function generateMetadata({
  params,
}: PageProps<"/projects/[projectId]">): Promise<Metadata> {
  const { projectId } = await params;
  const project = await getProjectDetails(projectId);
  return { title: project?.name };
}

/** The project at a glance: every phase as a checklist to tick off on the day. */
export default async function ProjectOverviewPage({ params }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const [details, tasks, shots] = await Promise.all([
    getProjectDetails(projectId),
    listTasks(projectId),
    listShotChecks(projectId),
  ]);
  return (
    <PhaseChecklist
      projectId={projectId}
      tasks={tasks}
      shots={shots}
      currentPhase={details?.phase ?? "brief"}
    />
  );
}
