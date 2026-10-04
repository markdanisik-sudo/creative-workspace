import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatEdited, pluralize } from "@/lib/format";
import { ProjectActions } from "./ProjectActions";
import { ProjectCover } from "./ProjectCover";
import type { ProjectSummary } from "./types";

/** The most recently edited project, presented like a magazine feature. */
export function FeaturedProject({ project }: { project: ProjectSummary }) {
  const href = `/projects/${project.id}`;
  return (
    <section
      aria-labelledby="featured-project"
      className="group grid items-end gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-14"
    >
      <Link href={href} tabIndex={-1} aria-hidden="true" className="block">
        <ProjectCover project={project} className="aspect-[3/2] rounded-xl shadow-sm" />
      </Link>

      <div className="flex flex-col gap-5 lg:pb-2">
        <p className="text-caption font-semibold tracking-[0.12em] text-text-tertiary uppercase">
          Continue where you left off
        </p>
        <h2 id="featured-project" className="text-display font-semibold text-balance">
          <Link
            href={href}
            className="rounded-sm hover:underline hover:decoration-1 hover:underline-offset-8"
          >
            {project.name}
          </Link>
        </h2>
        {project.description ? (
          <p className="max-w-prose text-callout text-text-secondary">{project.description}</p>
        ) : null}
        <dl className="flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-5">
          {[
            ["Edited", formatEdited(project.updatedAt)],
            ["Boards", String(project.boardCount)],
            ["Items", String(project.itemCount)],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="text-caption text-text-tertiary">{label}</dt>
              <dd className="text-callout font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex items-center gap-2">
          <Link
            href={href}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-5 text-body font-medium text-text-inverse transition-colors hover:bg-ink-hover"
          >
            Open project
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <ProjectActions projectId={project.id} projectName={project.name} revealOnHover={false} />
        </div>
        <p className="sr-only">
          {pluralize(project.boardCount, "board")}, {pluralize(project.itemCount, "item")}
        </p>
      </div>
    </section>
  );
}
