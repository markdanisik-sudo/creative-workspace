"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { friendlyErrors, logError } from "@/lib/errors";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError("app.boundary", error, { digest: error.digest });
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-headline font-medium">Something went wrong.</h1>
      <p className="max-w-sm text-callout text-text-secondary">{friendlyErrors.generic}</p>
      <Button variant="primary" className="mt-4" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
