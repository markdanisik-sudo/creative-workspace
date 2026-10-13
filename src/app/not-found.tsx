import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-headline font-medium">{t("errors.notFoundTitle")}</h1>
      <p className="max-w-sm text-callout text-text-secondary">{t("errors.notFoundBody")}</p>
      <Link
        href="/projects"
        className="mt-4 inline-flex h-10 items-center rounded-full bg-ink px-5 text-body font-semibold text-text-inverse hover:bg-ink-hover"
      >
        {t("errors.backToProjects")}
      </Link>
    </main>
  );
}
