import { LiveDateTime } from "@/components/app/LiveDateTime";
import { Wordmark } from "@/components/brand/Wordmark";
import { APP_TAGLINE } from "@/lib/config";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col px-3 pt-3 pb-16 sm:px-6">
      <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center justify-between rounded-xl bg-surface-muted px-5">
        <div className="flex items-baseline gap-3">
          <Wordmark href="/" />
          <LiveDateTime className="text-caption text-text-secondary tabular-nums" />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-16 px-1 sm:px-2">
        <header className="flex flex-col justify-between gap-6 pt-14 sm:pt-20 lg:flex-row lg:items-end">
          <Wordmark href="/" size="lg" />
          <p className="max-w-xs text-body text-text-secondary lg:pb-4 lg:text-right">
            {APP_TAGLINE}
          </p>
        </header>
        <main className="w-full max-w-[400px] animate-rise-in">{children}</main>
      </div>
    </div>
  );
}
