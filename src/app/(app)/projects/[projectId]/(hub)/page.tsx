import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { requireViewer } from "@/features/auth/session";
import { BoardGrid } from "@/features/boards/BoardGrid";
import { EventDate } from "@/features/hub/EventDate";
import { getProjectDetails, listComments, listEvents, listRequests } from "@/features/hub/queries";
import { getProject, listBoards } from "@/features/projects/queries";
import { getI18n } from "@/lib/i18n/server";
import { formatEdited } from "@/lib/format";

export async function generateMetadata({
  params,
}: PageProps<"/projects/[projectId]">): Promise<Metadata> {
  const { projectId } = await params;
  const project = await getProjectDetails(projectId);
  return { title: project?.name };
}

function SideCard({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl bg-surface p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-caption font-medium">
          <span aria-hidden="true">/</span>
          {title}
        </h2>
        <Link href={href} className="text-caption text-text-secondary hover:text-text">
          {linkLabel}
        </Link>
      </div>
      {children}
    </section>
  );
}

export default async function ProjectOverviewPage({ params }: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  const [viewer, i18n, boards, events, requests, comments, summary] = await Promise.all([
    requireViewer(),
    getI18n(),
    listBoards(projectId),
    listEvents(projectId),
    listRequests(projectId),
    listComments(projectId, 3),
    getProject(projectId),
  ]);
  // The studio, or the client who started this project, manages its boards.
  const canManageBoards = viewer.isStudio || summary?.ownerId === viewer.id;
  const { t, locale } = i18n;
  const base = `/projects/${projectId}`;
  const startOfToday = new Date(new Date().toDateString()).getTime();
  const upcoming = events
    .filter((event) => new Date(event.endsAt ?? event.startsAt).getTime() >= startOfToday)
    .slice(0, 3);
  const open = requests.filter((request) => request.status === "requested").slice(0, 3);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
      <section className="flex flex-col gap-6" aria-label={t("project.boards")}>
        <SectionLabel label={t("project.boards")} index={1} />
        <BoardGrid projectId={projectId} boards={boards} canManage={canManageBoards} />
      </section>

      <aside className="flex flex-col gap-3 lg:pt-10">
        <SideCard title={t("hub.nextUp")} href={`${base}/schedule`} linkLabel={t("hub.seeAll")}>
          {upcoming.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {upcoming.map((event) => (
                <li key={event.id} className="flex items-start gap-3">
                  <EventDate iso={event.startsAt} locale={locale} />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-body font-medium">{event.title}</span>
                    <span className="truncate text-caption text-text-secondary">
                      {t(`schedule.kinds.${event.kind}`)}
                      {event.location ? ` · ${event.location}` : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-text-secondary">{t("hub.nothingScheduled")}</p>
          )}
        </SideCard>

        <SideCard
          title={t("hub.openRequests")}
          href={`${base}/requests`}
          linkLabel={t("hub.seeAll")}
        >
          {open.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {open.map((request) => (
                <li key={request.id} className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-body font-medium">
                    {request.quantity > 1 ? `${request.quantity}× ` : ""}
                    {request.title}
                  </span>
                  <span className="shrink-0 text-caption text-text-secondary">
                    {formatEdited(request.createdAt, locale)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-text-secondary">{t("hub.noOpenRequests")}</p>
          )}
        </SideCard>

        <SideCard
          title={t("hub.latestComments")}
          href={`${base}/discussion`}
          linkLabel={t("hub.seeAll")}
        >
          {comments.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {comments.map((comment) => (
                <li key={comment.id} className="flex flex-col gap-0.5">
                  <span className="text-caption text-text-secondary">
                    {comment.author.id === viewer.id ? t("discussion.you") : comment.author.name} ·{" "}
                    {formatEdited(comment.createdAt, locale)}
                  </span>
                  <p className="line-clamp-2 text-body">{comment.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-text-secondary">{t("hub.noComments")}</p>
          )}
        </SideCard>
      </aside>
    </div>
  );
}
