import type { Metadata } from "next";
import { requireViewer } from "@/features/auth/session";
import { Discussion } from "@/features/hub/Discussion";
import { listComments } from "@/features/hub/queries";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("hub.discussion") };
}

export default async function DiscussionPage({ params }: PageProps<"/projects/[projectId]/discussion">) {
  const { projectId } = await params;
  const [viewer, comments] = await Promise.all([requireViewer(), listComments(projectId)]);
  return (
    <Discussion
      projectId={projectId}
      comments={comments}
      viewer={{ id: viewer.id, name: viewer.displayName, isStudio: viewer.isStudio }}
      isStudio={viewer.isStudio}
    />
  );
}
