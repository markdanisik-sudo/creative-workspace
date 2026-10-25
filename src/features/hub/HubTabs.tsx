"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType, type SVGProps } from "react";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import {
  BudgetIcon,
  DiscussionIcon,
  OverviewIcon,
  PeopleIcon,
  PlanIcon,
  ScheduleIcon,
} from "./HubIcons";

interface Tab {
  segment: string;
  label: string;
  /** Short label for the phone's bottom bar. */
  short: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  badge?: number;
}

/**
 * The job's sections; each tab is its own URL. A segmented pill bar on larger
 * screens, an iOS-style floating tab bar at the bottom on phones.
 */
export function HubTabs({
  projectId,
  isStudio,
  openRequests,
}: {
  projectId: string;
  isStudio: boolean;
  openRequests: number;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const tabs: Tab[] = [
    { segment: "", label: t("hub.overview"), short: t("hub.short.overview"), icon: OverviewIcon },
    { segment: "plan", label: t("hub.plan"), short: t("hub.short.plan"), icon: PlanIcon },
    {
      segment: "schedule",
      label: t("hub.schedule"),
      short: t("hub.short.schedule"),
      icon: ScheduleIcon,
    },
    {
      segment: "budget",
      label: t("budget.title"),
      short: t("budget.title"),
      icon: BudgetIcon,
      badge: openRequests,
    },
    {
      segment: "discussion",
      label: t("hub.discussion"),
      short: t("hub.short.discussion"),
      icon: DiscussionIcon,
    },
    ...(isStudio
      ? [
          {
            segment: "people",
            label: t("hub.people"),
            short: t("hub.short.people"),
            icon: PeopleIcon,
          },
        ]
      : []),
  ];
  const hrefFor = (tab: Tab) => (tab.segment ? `${base}/${tab.segment}` : base);
  const isActive = (tab: Tab) =>
    tab.segment ? pathname.startsWith(hrefFor(tab)) : pathname === base;
  const current = Math.max(0, tabs.findIndex(isActive));
  // The tab just tapped, highlighted at once while its page loads.
  const [tapped, setTapped] = useState<{ index: number; from: string } | null>(null);
  const highlighted = tapped && tapped.from === pathname ? tapped.index : current;

  return (
    <>
      <nav aria-label={t("hub.tabs")} className="hidden sm:block">
        <ul className="inline-flex min-w-max gap-1 rounded-full bg-surface p-1 shadow-sm">
          {tabs.map((tab) => {
            const href = hrefFor(tab);
            const active = isActive(tab);
            return (
              <li key={tab.segment || "overview"}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-full px-4 text-body font-medium whitespace-nowrap transition-colors duration-200",
                    active ? "bg-ink text-text-inverse" : "text-text-secondary hover:text-text",
                  )}
                >
                  {tab.label}
                  {tab.badge ? (
                    <span
                      className={cn(
                        "min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5 font-semibold tabular-nums",
                        active ? "bg-text-inverse/20" : "bg-surface-muted text-text",
                      )}
                    >
                      {tab.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Phones: a floating glass bar in the shape of the studio's boxes, with
          a lit tile under the current tab that glides between them. */}
      <nav
        aria-label={t("hub.tabs")}
        className="fixed inset-x-0 bottom-[max(14px,env(safe-area-inset-bottom))] z-40 flex justify-center px-6 sm:hidden"
      >
        <ul className="relative flex w-full max-w-[400px] rounded-[24px] bg-surface/70 p-1 shadow-[0_8px_30px_rgb(0_0_0/0.18),inset_0_0_0_0.5px_rgb(255_255_255/0.25)] backdrop-blur-2xl backdrop-saturate-150">
          <li
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-1 left-1 rounded-[20px] bg-text/10 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
            style={{
              width: `calc((100% - 0.5rem) / ${tabs.length})`,
              transform: `translateX(${highlighted * 100}%)`,
            }}
          />
          {tabs.map((tab, index) => {
            const lit = index === highlighted;
            const Icon = tab.icon;
            return (
              <li key={tab.segment || "overview"} className="relative min-w-0 flex-1">
                <Link
                  href={hrefFor(tab)}
                  aria-current={isActive(tab) ? "page" : undefined}
                  onClick={() => setTapped({ index, from: pathname })}
                  className={cn(
                    "flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-[20px] transition-[color,transform] duration-200 active:scale-95",
                    lit ? "text-text" : "text-text-secondary",
                  )}
                >
                  <Icon className="size-[22px]" />
                  <span className="max-w-full truncate text-[10px] font-semibold tracking-[-0.02em]">
                    {tab.short}
                  </span>
                  {tab.badge ? (
                    <span className="absolute top-1 left-[calc(50%+5px)] min-w-4 rounded-full bg-ink px-1 text-center text-[10px] leading-4 font-semibold text-text-inverse tabular-nums">
                      {tab.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
