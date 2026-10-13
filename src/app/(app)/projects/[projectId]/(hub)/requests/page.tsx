import type { Metadata } from "next";
import { requireViewer } from "@/features/auth/session";
import { listRequests, listServices } from "@/features/hub/queries";
import { RequestsView } from "@/features/hub/RequestsView";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("hub.requests") };
}

export default async function RequestsPage({ params }: PageProps<"/projects/[projectId]/requests">) {
  const { projectId } = await params;
  const [viewer, services, requests] = await Promise.all([
    requireViewer(),
    listServices({ activeOnly: true }),
    listRequests(projectId),
  ]);
  return (
    <RequestsView
      projectId={projectId}
      services={services}
      requests={requests}
      viewerId={viewer.id}
      isStudio={viewer.isStudio}
    />
  );
}
