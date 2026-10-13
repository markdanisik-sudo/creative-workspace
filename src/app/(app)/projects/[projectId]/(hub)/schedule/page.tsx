import type { Metadata } from "next";
import { requireViewer } from "@/features/auth/session";
import { listEvents } from "@/features/hub/queries";
import { ScheduleView } from "@/features/hub/ScheduleView";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("hub.schedule") };
}

export default async function SchedulePage({
  params,
}: PageProps<"/projects/[projectId]/schedule">) {
  const { projectId } = await params;
  const [viewer, events] = await Promise.all([requireViewer(), listEvents(projectId)]);
  return <ScheduleView projectId={projectId} events={events} canEdit={viewer.isStudio} />;
}
