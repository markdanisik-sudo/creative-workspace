import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import type { Viewer } from "@/features/auth/session";
import { NewProjectButton } from "@/features/projects/NewProjectDialog";
import { getLatestCoverUrl } from "@/features/projects/queries";
import { cn } from "@/lib/cn";
import { getI18n } from "@/lib/i18n/server";
import { LiveDateTime } from "./LiveDateTime";
import { CompactSearch } from "./SearchField";
import { SiteMenu } from "./SiteMenu";
import { ThemeToggle } from "./ThemeToggle";

/**
 * The bar's own parts step aside while the menu (drawn over it) is open: once
 * the sliding menu has covered them, and back as soon as it starts to leave.
 */
const UNDER_MENU =
  "transition-[opacity,visibility] duration-150 group-has-[[role=dialog]:not([data-closing])]/header:invisible group-has-[[role=dialog]:not([data-closing])]/header:opacity-0 group-has-[[role=dialog]:not([data-closing])]/header:delay-[140ms]";

/**
 * The bar from the studio site: narrow, centred and hanging from the top
 * edge. Logo and local time on the left; links, the main action (a black
 * pill), search, theme and the "+" menu on the right.
 */
export async function AppHeader({ viewer, actions }: { viewer: Viewer; actions?: ReactNode }) {
  const [imageUrl, { t }] = await Promise.all([getLatestCoverUrl(), getI18n()]);
  return (
    <>
      {/* Pinned (fixed, not sticky: on iPhone a sticky bar with frosted glass
          can vanish or jump while the page scrolls or bounces). Below the
          status bar in the iOS app and full-screen web app (the inset is 0 in
          a browser); the glass reaches up behind it. */}
      <header className="group/header fixed inset-x-0 top-0 z-40 px-3 pt-[env(safe-area-inset-top)] sm:px-6">
        <div className="relative mx-auto max-w-[880px]">
          {/* Frosted like the open menu. A layer of its own (not an ancestor of
            the menu, whose glass it would flatten), hidden while the menu is open. */}
          <div
            aria-hidden="true"
            className={cn(
              "absolute inset-x-0 -top-[env(safe-area-inset-top)] bottom-0 rounded-b-[14px] bg-surface/60 shadow-sm backdrop-blur-2xl backdrop-saturate-150",
              UNDER_MENU,
            )}
          />
          <div className="relative flex h-12 items-center justify-between gap-3 pr-1.5 pl-4">
            <div className={cn("flex min-w-0 items-baseline gap-2.5", UNDER_MENU)}>
              <Wordmark size="xs" />
              <LiveDateTime className="hidden text-caption text-text-secondary tabular-nums md:inline" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className={cn("flex items-center gap-1.5", UNDER_MENU)}>
                <nav className="mr-2 hidden items-center gap-4 text-body font-medium lg:flex">
                  <Link href="/projects" className="transition-opacity hover:opacity-60">
                    {t("nav.projects")}
                  </Link>
                </nav>
                <Suspense>
                  <CompactSearch />
                </Suspense>
                {actions ?? <NewProjectButton compact size="sm" askClient={viewer.isStudio} />}
                <ThemeToggle className="size-8" />
              </div>
              <SiteMenu name={viewer.displayName} email={viewer.email} imageUrl={imageUrl} />
            </div>
          </div>
        </div>
      </header>
      {/* Holds the bar's place in the page. */}
      <div aria-hidden="true" className="h-[calc(env(safe-area-inset-top)+3rem)]" />
    </>
  );
}
