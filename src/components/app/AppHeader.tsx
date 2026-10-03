import { Suspense, type ReactNode } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import type { Viewer } from "@/features/auth/session";
import { SearchField } from "./SearchField";
import { UserMenu } from "./UserMenu";

export function AppHeader({ viewer, actions }: { viewer: Viewer; actions?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto grid h-16 max-w-[1280px] grid-cols-[auto_1fr_auto] items-center gap-4 px-4 sm:grid-cols-[1fr_minmax(0,360px)_1fr] sm:px-8">
        <Wordmark className="justify-self-start" />
        <div className="flex justify-center">
          <Suspense>
            <SearchField className="w-full" />
          </Suspense>
        </div>
        <div className="flex items-center justify-self-end gap-3">
          {actions}
          <UserMenu name={viewer.displayName} email={viewer.email} />
        </div>
      </div>
    </header>
  );
}
