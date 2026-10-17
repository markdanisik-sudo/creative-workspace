import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { requireViewer } from "@/features/auth/session";
import { EventDate } from "@/features/hub/EventDate";
import { PlanBoard } from "@/features/hub/PlanBoard";
import {
  getProjectDetails,
  listComments,
  listEvents,
  listRequests,
  listTasks,
} from "@/features/hub/queries";
import { getProject } from "@/features/projects/queries";
import { BriefModule } from "@/features/workspace/modules/BriefModule";
import { LocationsModule } from "@/features/workspace/modules/LocationsModule";
import { MoodboardModule } from "@/features/workspace/modules/MoodboardModule";
import { ShotListModule } from "@/features/workspace/modules/ShotListModule";
import {
  BriefPreview,
  ListPreview,
  LocationsPreview,
  MoodboardPreview,
  ShotsPreview,
  TasksPreview,
} from "@/features/workspace/previews";
import { getWorkspace } from "@/features/workspace/queries";
import { ListModule } from "@/features/workspace/modules/ListModule";
import { LIST_MODULE_IDS, type ListModuleId } from "@/features/workspace/plan";
import { PlanEditor } from "@/features/workspace/PlanEditor";
import { isModuleId, type ModuleId } from "@/features/workspace/types";
import { Workspace, type WorkspaceModule } from "@/features/workspace/Workspace";
import { getI18n } from "@/lib/i18n/server";
import { formatEdited } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("hub.plan") };
}

/** Small boxes that link to the other tabs (no zoom). */
function LinkBox({
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
    <Link
      href={href}
      className="surface-invert group flex min-h-[188px] flex-col gap-4 rounded-[24px] bg-surface p-5 shadow-sm transition-shadow duration-300 hover:shadow-md sm:p-6 lg:col-span-4 lg:min-h-0"
    >
      <div className="flex items-baseline justify-between gap-3 text-caption">
        <span className="font-medium">
          <span aria-hidden="true">/</span>
          {title}
        </span>
        <span className="text-text-secondary group-hover:text-text">{linkLabel}</span>
      </div>
      {children}
    </Link>
  );
}

export default async function PlanPage({
  params,
  searchParams,
}: PageProps<"/projects/[projectId]/plan">) {
  const { projectId } = await params;
  const { m } = await searchParams;
  const [viewer, i18n, events, requests, comments, summary, workspace, tasks, details] =
    await Promise.all([
      requireViewer(),
      getI18n(),
      listEvents(projectId),
      listRequests(projectId),
      listComments(projectId, 1),
      getProject(projectId),
      getWorkspace(projectId),
      listTasks(projectId),
      getProjectDetails(projectId),
    ]);
  const { t, tp, locale } = i18n;
  const base = `/projects/${projectId}`;
  const currentPhase = details?.phase ?? "brief";

  const startOfToday = new Date(new Date().toDateString()).getTime();
  const next = events.find(
    (event) => new Date(event.endsAt ?? event.startsAt).getTime() >= startOfToday,
  );
  const open = requests.filter((request) => request.status === "requested");
  const latest = comments[0];

  const boxes: Record<ModuleId, Omit<WorkspaceModule, "className">> = {
    brief: {
      id: "brief",
      title: t("workspace.modules.brief"),
      blurb: t("workspace.blurbs.brief"),
      preview: <BriefPreview brief={workspace.brief} t={t} />,
      content: <BriefModule projectId={projectId} brief={workspace.brief} />,
    },
    moodboard: {
      id: "moodboard",
      title: t("workspace.modules.moodboard"),
      blurb: t("workspace.blurbs.moodboard"),
      bleed: workspace.moodboard.length > 0,
      preview: <MoodboardPreview images={workspace.moodboard} t={t} />,
      content: (
        <MoodboardModule
          projectId={projectId}
          images={workspace.moodboard}
          viewerId={viewer.id}
          isStudio={viewer.isStudio}
        />
      ),
    },
    shots: {
      id: "shots",
      title: t("workspace.modules.shots"),
      blurb: t("workspace.blurbs.shots"),
      preview: (
        <ShotsPreview shots={workspace.shots} defaults={workspace.shotDefaults} t={t} tp={tp} />
      ),
      content: (
        <ShotListModule
          projectId={projectId}
          shots={workspace.shots}
          defaults={workspace.shotDefaults}
          locations={workspace.locations}
        />
      ),
    },
    locations: {
      id: "locations",
      title: t("workspace.modules.locations"),
      blurb: t("workspace.blurbs.locations"),
      preview: <LocationsPreview locations={workspace.locations} t={t} />,
      content: (
        <LocationsModule
          projectId={projectId}
          locations={workspace.locations}
          shots={workspace.shots}
          viewerId={viewer.id}
          isStudio={viewer.isStudio}
        />
      ),
    },
    tasks: {
      id: "tasks",
      title: t("workspace.modules.tasks"),
      blurb: t("workspace.blurbs.tasks"),
      preview: <TasksPreview tasks={tasks} currentPhase={currentPhase} t={t} />,
      content: <PlanBoard projectId={projectId} tasks={tasks} currentPhase={currentPhase} />,
    },
    ...(Object.fromEntries(
      LIST_MODULE_IDS.map((id) => {
        const items = workspace.items.filter((item) => item.module === id);
        return [
          id,
          {
            id,
            title: t(`workspace.modules.${id}`),
            blurb: t(`workspace.blurbs.${id}`),
            preview: <ListPreview module={id} items={items} t={t} locale={locale} />,
            content: (
              <ListModule
                projectId={projectId}
                module={id}
                items={items}
                viewerId={viewer.id}
                isStudio={viewer.isStudio}
              />
            ),
          },
        ];
      }),
    ) as Record<ListModuleId, Omit<WorkspaceModule, "className">>),
  };

  // Bento rows of two, alternating wide and narrow; an odd last box spans the row.
  const chosen = workspace.modules;
  const modules: WorkspaceModule[] = chosen.map((id, index) => {
    const pair = Math.floor(index / 2);
    const alone = index === chosen.length - 1 && index % 2 === 0;
    const first = index % 2 === 0;
    const span = alone
      ? "lg:col-span-12"
      : (pair % 2 === 0) === first
        ? "lg:col-span-5"
        : "lg:col-span-7";
    // Tasks on a row of their own only need the phase bars: keep it short.
    const rows = alone && id === "tasks" ? "lg:row-span-1" : "lg:row-span-2";
    return { ...boxes[id], className: `${span} ${rows}` };
  });
  // The studio, or the client who started the project, shapes the plan.
  const canEditPlan = viewer.isStudio || summary?.ownerId === viewer.id;

  return (
    <Workspace
      modules={modules}
      initialOpen={isModuleId(m) && chosen.includes(m) ? m : null}
      toolbar={
        canEditPlan ? (
          <PlanEditor projectId={projectId} medium={workspace.medium} modules={chosen} />
        ) : null
      }
      extras={
        <>
          <LinkBox title={t("hub.nextUp")} href={`${base}/schedule`} linkLabel={t("hub.seeAll")}>
            {next ? (
              <div className="mt-auto flex items-start gap-3">
                <EventDate iso={next.startsAt} locale={locale} />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-callout font-semibold">{next.title}</span>
                  <span className="truncate text-caption text-text-secondary">
                    {t(`schedule.kinds.${next.kind}`)}
                    {next.location ? ` · ${next.location}` : ""}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-auto text-body text-text-tertiary">{t("hub.nothingScheduled")}</p>
            )}
          </LinkBox>
          <LinkBox
            title={t("hub.openRequests")}
            href={`${base}/budget`}
            linkLabel={t("hub.seeAll")}
          >
            <p className="mt-auto flex items-baseline gap-2">
              <span className="text-display font-medium tabular-nums">{open.length}</span>
              <span className="truncate text-body text-text-secondary">
                {open[0] ? open[0].title : t("hub.noOpenRequests")}
              </span>
            </p>
          </LinkBox>
          <LinkBox
            title={t("hub.latestComments")}
            href={`${base}/discussion`}
            linkLabel={t("hub.seeAll")}
          >
            {latest ? (
              <div className="mt-auto flex flex-col gap-1">
                <span className="text-caption text-text-secondary">
                  {latest.author.id === viewer.id ? t("discussion.you") : latest.author.name} ·{" "}
                  {formatEdited(latest.createdAt, locale)}
                </span>
                <p className="line-clamp-2 text-body">{latest.body}</p>
              </div>
            ) : (
              <p className="mt-auto text-body text-text-tertiary">{t("hub.noComments")}</p>
            )}
          </LinkBox>
        </>
      }
    />
  );
}
