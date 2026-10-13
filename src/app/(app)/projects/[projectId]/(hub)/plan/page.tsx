import type { Metadata } from "next";
import { PlanBoard } from "@/features/hub/PlanBoard";
import { getProjectDetails, listTasks } from "@/features/hub/queries";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("hub.plan") };
}

export default async function PlanPage({ params }: PageProps<"/projects/[projectId]/plan">) {
  const { projectId } = await params;
  const [project, tasks] = await Promise.all([getProjectDetails(projectId), listTasks(projectId)]);
  return <PlanBoard projectId={projectId} tasks={tasks} currentPhase={project?.phase ?? "brief"} />;
}
