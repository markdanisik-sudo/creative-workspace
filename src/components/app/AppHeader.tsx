import { Suspense, type ReactNode } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import type { Viewer } from "@/features/auth/session";
import { LiveDateTime } from "./LiveDateTime";
import { SearchField } from "./SearchField";
import { UserMenu } from "./UserMenu";

/** A floating grey bar: logo and local time, search, then actions. */
export function AppHeader({ viewer, actions }: { viewer: Viewer; actions?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
      <div className="mx-auto grid h-14 max-w-[1280px] grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl bg-surface-muted/90 pr-2 pl-4 backdrop-blur-xl sm:grid-cols-[1fr_minmax(0,360px)_1fr] sm:pl-5">
        <div className="flex items-baseline gap-3 justify-self-start">
          <Wordmark />
          <LiveDateTime className="hidden text-caption text-text-secondary tabular-nums md:inline" />
        </div>
        <div className="flex justify-center">
          <Suspense>
            <SearchField className="w-full" />
          </Suspense>
        </div>
        <div className="flex items-center justify-self-end gap-2">
          {actions}
          <UserMenu name={viewer.displayName} email={viewer.email} />
        </div>
      </div>
    </header>
  );
}
