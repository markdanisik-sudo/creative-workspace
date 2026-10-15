import { redirect } from "next/navigation";

/** The plan now lives in the project's overview, as the "Plan" box. */
export default async function PlanPage({ params }: PageProps<"/projects/[projectId]/plan">) {
  const { projectId } = await params;
  redirect(`/projects/${projectId}?m=tasks`);
}
