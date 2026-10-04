/** Quiet placeholder while projects load: the page's shape, no spinners. */
export default function ProjectsLoading() {
  return (
    <div className="min-h-dvh" aria-busy="true" aria-label="Loading projects">
      <div className="h-16" />
      <main className="mx-auto max-w-[1280px] px-4 sm:px-8">
        <div className="flex flex-col gap-8 pt-6 pb-14 sm:pt-12 sm:pb-20">
          <div className="h-3 w-40 rounded-sm bg-surface-muted" />
          <div className="h-14 w-full max-w-xl rounded-md bg-surface-muted" />
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-14">
          <div className="aspect-[3/2] animate-pulse rounded-xl bg-surface-muted" />
          <div className="flex flex-col justify-end gap-4">
            <div className="h-3 w-48 rounded-sm bg-surface-muted" />
            <div className="h-10 w-3/4 rounded-md bg-surface-muted" />
            <div className="h-10 w-40 rounded-md bg-surface-muted" />
          </div>
        </div>
      </main>
    </div>
  );
}
