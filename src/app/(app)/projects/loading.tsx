/** Quiet placeholder while projects load: the page's shape, no spinners. */
export default function ProjectsLoading() {
  return (
    <div className="min-h-dvh" aria-busy="true" aria-label="Loading projects">
      <div className="h-[68px]" />
      <main className="mx-auto max-w-[1280px] px-4 sm:px-8">
        <div className="flex flex-col gap-4 pt-14 pb-16 sm:pt-24 sm:pb-24">
          <div className="h-14 w-full max-w-2xl rounded-md bg-surface-muted" />
          <div className="h-14 w-full max-w-md rounded-md bg-surface-muted" />
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-lg bg-surface-muted" />
          ))}
        </div>
      </main>
    </div>
  );
}
