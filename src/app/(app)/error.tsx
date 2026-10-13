"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/client";
import { logError } from "@/lib/errors";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();
  useEffect(() => {
    logError("app.boundary", error, { digest: error.digest });
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-headline font-medium">{t("errors.title")}</h1>
      <p className="max-w-sm text-callout text-text-secondary">{t("errors.generic")}</p>
      <Button variant="primary" className="mt-4" onClick={reset}>
        {t("common.tryAgain")}
      </Button>
    </main>
  );
}
