/** Quiet placeholder while projects load: shapes only, no spinners. */
export default function ProjectsLoading() {
  return (
    <div className="min-h-dvh" aria-busy="true" aria-label="Loading projects">
      <div className="h-16" />
      <main className="mx-auto max-w-[1280px] px-4 pt-10 sm:px-8">
        <div className="mb-10 h-8 w-40 rounded-md bg-surface-muted" />
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="aspect-[4/3] animate-pulse rounded-lg bg-surface-muted" />
              <div className="h-4 w-2/3 rounded-sm bg-surface-muted" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
