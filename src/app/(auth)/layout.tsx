import { LanguageSwitch } from "@/components/app/LanguageSwitch";
import { LiveDateTime } from "@/components/app/LiveDateTime";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { Wordmark } from "@/components/brand/Wordmark";
import { getI18n } from "@/lib/i18n/server";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const { t } = await getI18n();
  return (
    <div className="flex min-h-dvh flex-col px-3 pt-3 pb-16 sm:px-6">
      <div className="mx-auto flex h-14 w-full max-w-[1272px] items-center justify-between rounded-[14px] bg-surface pr-2 pl-5 shadow-sm">
        <div className="flex items-baseline gap-3">
          <Wordmark href="/" />
          <LiveDateTime className="hidden text-caption text-text-secondary tabular-nums sm:inline" />
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1272px] flex-col gap-14 px-1 sm:px-2">
        <header className="flex flex-col justify-between gap-6 pt-14 sm:pt-20 lg:flex-row lg:items-end">
          <Wordmark href="/" size="lg" />
          <p className="max-w-xs text-callout text-text-secondary lg:pb-4 lg:text-right">
            {t("brand.tagline")}
          </p>
        </header>
        <main className="w-full max-w-[460px] rounded-xl bg-surface p-7 shadow-sm animate-rise-in sm:p-9">
          {children}
        </main>
      </div>
    </div>
  );
}
