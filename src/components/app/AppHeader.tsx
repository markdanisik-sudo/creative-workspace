import { Suspense, type ReactNode } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import type { Viewer } from "@/features/auth/session";
import { getLatestCoverUrl } from "@/features/projects/queries";
import { LiveDateTime } from "./LiveDateTime";
import { SearchField } from "./SearchField";
import { SiteMenu } from "./SiteMenu";
import { ThemeToggle } from "./ThemeToggle";

/**
 * The floating white bar from the studio site: logo and local time on the
 * left; search, the page's main action, theme and the "+" menu on the right.
 */
export async function AppHeader({ viewer, actions }: { viewer: Viewer; actions?: ReactNode }) {
  const imageUrl = await getLatestCoverUrl();
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
      <div className="relative mx-auto max-w-[1272px]">
        <div className="flex h-14 items-center justify-between gap-3 rounded-[14px] bg-surface pr-2 pl-4 shadow-sm sm:pl-5">
          <div className="flex min-w-0 items-baseline gap-3">
            <Wordmark />
            <LiveDateTime className="hidden text-caption text-text-secondary tabular-nums md:inline" />
          </div>
          <div className="flex items-center gap-2">
            <Suspense>
              <SearchField className="hidden w-56 md:block" />
            </Suspense>
            {actions}
            <ThemeToggle />
            <SiteMenu name={viewer.displayName} email={viewer.email} imageUrl={imageUrl} />
          </div>
        </div>
      </div>
    </header>
  );
}
