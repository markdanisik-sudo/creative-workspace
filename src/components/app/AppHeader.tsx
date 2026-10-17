import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import type { Viewer } from "@/features/auth/session";
import { NewProjectButton } from "@/features/projects/NewProjectDialog";
import { getLatestCoverUrl } from "@/features/projects/queries";
import { getI18n } from "@/lib/i18n/server";
import { LiveDateTime } from "./LiveDateTime";
import { CompactSearch } from "./SearchField";
import { SiteMenu } from "./SiteMenu";
import { ThemeToggle } from "./ThemeToggle";

/**
 * The bar from the studio site: narrow, centred and hanging from the top
 * edge. Logo and local time on the left; links, the main action (a black
 * pill), search, theme and the "+" menu on the right.
 */
export async function AppHeader({ viewer, actions }: { viewer: Viewer; actions?: ReactNode }) {
  const [imageUrl, { t }] = await Promise.all([getLatestCoverUrl(), getI18n()]);
  return (
    <header className="sticky top-0 z-40 px-3 sm:px-6">
      <div className="relative mx-auto max-w-[880px]">
        <div className="flex h-12 items-center justify-between gap-3 rounded-b-[14px] bg-surface pr-1.5 pl-4 shadow-sm">
          <div className="flex min-w-0 items-baseline gap-2.5">
            <Wordmark />
            <LiveDateTime className="hidden text-caption text-text-secondary tabular-nums md:inline" />
          </div>
          <div className="flex items-center gap-1.5">
            <nav className="mr-2 hidden items-center gap-4 text-body font-medium lg:flex">
              <Link href="/projects" className="transition-opacity hover:opacity-60">
                {t("nav.projects")}
              </Link>
              <Link href="/settings" className="transition-opacity hover:opacity-60">
                {t("nav.settings")}
              </Link>
            </nav>
            <Suspense>
              <CompactSearch />
            </Suspense>
            {actions ?? <NewProjectButton compact size="sm" askClient={viewer.isStudio} />}
            <ThemeToggle className="size-8" />
            <SiteMenu name={viewer.displayName} email={viewer.email} imageUrl={imageUrl} />
          </div>
        </div>
      </div>
    </header>
  );
}
