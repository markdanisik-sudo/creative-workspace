import type { Metadata } from "next";
import { requireViewer } from "@/features/auth/session";
import { Discussion } from "@/features/hub/Discussion";
import { listComments } from "@/features/hub/queries";
import { getWorkspace } from "@/features/workspace/queries";
import { itemTitle } from "@/features/workspace/plan-format";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("hub.discussion") };
}

export default async function DiscussionPage({
  params,
  searchParams,
}: PageProps<"/projects/[projectId]/discussion">) {
  const { projectId } = await params;
  const { o, t: target } = await searchParams;
  const [viewer, comments, workspace] = await Promise.all([
    requireViewer(),
    listComments(projectId),
    getWorkspace(projectId),
  ]);
  return (
    <Discussion
      projectId={projectId}
      comments={comments}
      viewer={{ id: viewer.id, name: viewer.displayName, isStudio: viewer.isStudio }}
      isStudio={viewer.isStudio}
      subjects={{
        modules: workspace.modules,
        images: workspace.moodboard.map((image) => ({ id: image.id, url: image.url })),
        items: workspace.items.map((item) => ({
          id: item.id,
          module: item.module,
          title: itemTitle(item),
        })),
      }}
      initialTopic={typeof o === "string" ? o : null}
      initialTarget={typeof target === "string" ? target : null}
    />
  );
}
