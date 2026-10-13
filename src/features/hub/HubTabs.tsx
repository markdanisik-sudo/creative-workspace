"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";

interface Tab {
  segment: string;
  label: string;
  badge?: number;
}

/** Segmented tab bar for the job's sections; each tab is its own URL. */
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
    { segment: "", label: t("hub.overview") },
    { segment: "plan", label: t("hub.plan") },
    { segment: "schedule", label: t("hub.schedule") },
    { segment: "requests", label: t("hub.requests"), badge: openRequests },
    { segment: "discussion", label: t("hub.discussion") },
    ...(isStudio ? [{ segment: "people", label: t("hub.people") }] : []),
  ];

  return (
    <nav aria-label={t("hub.tabs")} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="inline-flex min-w-max gap-1 rounded-full bg-surface p-1 shadow-sm">
        {tabs.map((tab) => {
          const href = tab.segment ? `${base}/${tab.segment}` : base;
          const active = tab.segment ? pathname.startsWith(href) : pathname === base;
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
  );
}
