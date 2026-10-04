import { cn } from "@/lib/cn";
import type { ProjectSummary } from "./types";

/** A project's cover image, or a quiet typographic placeholder. */
export function ProjectCover({
  project,
  className,
  placeholder = "name",
}: {
  project: Pick<ProjectSummary, "name" | "coverUrl">;
  className?: string;
  /** What to show without a cover: the project name, or nothing. */
  placeholder?: "name" | "none";
}) {
  return (
    <div className={cn("relative overflow-hidden bg-surface-muted", className)}>
      {project.coverUrl ? (
        // Signed, short-lived URLs: next/image optimisation would cache them past expiry.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={project.coverUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
        />
      ) : placeholder === "name" ? (
        <div className="absolute inset-0 flex items-end p-6 sm:p-8">
          <span className="line-clamp-3 text-display font-semibold text-text-tertiary/60">
            {project.name}
          </span>
        </div>
      ) : null}
    </div>
  );
}
