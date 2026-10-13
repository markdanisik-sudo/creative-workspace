import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireViewer } from "@/features/auth/session";
import { listMembers, listPendingInvitations } from "@/features/hub/queries";
import { PeopleView } from "@/features/people/PeopleView";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("people.title") };
}

export default async function PeoplePage({ params }: PageProps<"/projects/[projectId]/people">) {
  const { projectId } = await params;
  const viewer = await requireViewer();
  if (!viewer.isStudio) notFound();
  const [members, invitations] = await Promise.all([
    listMembers(projectId),
    listPendingInvitations(projectId),
  ]);
  return <PeopleView projectId={projectId} members={members} invitations={invitations} />;
}
