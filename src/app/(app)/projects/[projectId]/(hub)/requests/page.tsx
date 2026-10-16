import { redirect } from "next/navigation";

/** Add-ons now live in the budget, next to the price they change. */
export default async function RequestsPage({
  params,
}: PageProps<"/projects/[projectId]/requests">) {
  const { projectId } = await params;
  redirect(`/projects/${projectId}/budget`);
}
