import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-headline font-semibold">We couldn&apos;t find that.</h1>
      <p className="max-w-sm text-callout text-text-secondary">
        It may have been moved or deleted, or you may not have access.
      </p>
      <Link
        href="/projects"
        className="mt-4 inline-flex h-9 items-center rounded-md bg-ink px-4 text-body font-medium text-text-inverse hover:bg-ink-hover"
      >
        Back to projects
      </Link>
    </main>
  );
}
