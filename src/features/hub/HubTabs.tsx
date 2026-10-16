"use client";

import {
  CalendarDays,
  LayoutGrid,
  ListChecks,
  MessageCircle,
  Wallet,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";

interface Tab {
  segment: string;
  label: string;
  /** Short label for the phone's bottom bar. */
  short: string;
  icon: LucideIcon;
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
    { segment: "", label: t("hub.overview"), short: t("hub.short.overview"), icon: ListChecks },
    { segment: "plan", label: t("hub.plan"), short: t("hub.short.plan"), icon: LayoutGrid },
    {
      segment: "schedule",
      label: t("hub.schedule"),
      short: t("hub.short.schedule"),
      icon: CalendarDays,
    },
    {
      segment: "budget",
      label: t("budget.title"),
      short: t("budget.title"),
      icon: Wallet,
      badge: openRequests,
    },
    {
      segment: "discussion",
      label: t("hub.discussion"),
      short: t("hub.short.discussion"),
      icon: MessageCircle,
    },
    ...(isStudio
      ? [{ segment: "people", label: t("hub.people"), short: t("hub.short.people"), icon: Users }]
      : []),
  ];
  const hrefFor = (tab: Tab) => (tab.segment ? `${base}/${tab.segment}` : base);
  const isActive = (tab: Tab) =>
    tab.segment ? pathname.startsWith(hrefFor(tab)) : pathname === base;

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

      <nav
        aria-label={t("hub.tabs")}
        className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-40 rounded-[22px] bg-surface/85 shadow-md backdrop-blur-xl sm:hidden"
      >
        <ul className="flex">
          {tabs.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.icon;
            return (
              <li key={tab.segment || "overview"} className="min-w-0 flex-1">
                <Link
                  href={hrefFor(tab)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-[60px] flex-col items-center justify-center gap-1 transition-colors duration-200",
                    active ? "text-text" : "text-text-tertiary",
                  )}
                >
                  <Icon size={21} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                  <span className="max-w-full truncate px-0.5 text-[10px] font-semibold">
                    {tab.short}
                  </span>
                  {tab.badge ? (
                    <span className="absolute top-2 left-[calc(50%+6px)] min-w-4 rounded-full bg-ink px-1 text-center text-[10px] leading-4 font-semibold text-text-inverse tabular-nums">
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
