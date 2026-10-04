"use client";

import { ArrowUpRight } from "lucide-react";
import { useActionState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { BOARD_TEMPLATES } from "@/features/boards/templates";
import { createProject, type CreateProjectState } from "./actions";

const STARTERS = BOARD_TEMPLATES.filter((template) => template.id !== "blank");

/** A dark panel of numbered starting points; one click creates and opens a project. */
export function StartPanel({ index }: { index: number }) {
  const [state, action, pending] = useActionState<CreateProjectState, FormData>(createProject, {});

  return (
    <section
      aria-labelledby="start-panel"
      className="dark-panel rounded-xl bg-[#0b0b0b] px-6 pt-6 pb-4 text-[#f4f4f4] sm:px-10 sm:pt-9 sm:pb-6"
    >
      <div className="mb-8 flex items-baseline justify-between text-caption text-white/55">
        <h2 id="start-panel" className="font-medium text-white">
          <span aria-hidden="true">/</span>Start a project
        </h2>
        <span aria-hidden="true" className="tabular-nums">
          ({String(index).padStart(2, "0")})
        </span>
      </div>
      <form action={action}>
        <ul className="flex flex-col">
          {STARTERS.map((template, i) => (
            <li key={template.id}>
              <button
                type="submit"
                name="template"
                value={template.id}
                disabled={pending}
                className="group flex w-full items-baseline justify-between gap-6 rounded-sm py-1.5 text-left outline-offset-4 disabled:opacity-60"
              >
                <span className="flex items-baseline gap-3 text-headline font-medium transition-transform duration-300 ease-out group-hover:translate-x-2 sm:text-display">
                  {template.name}
                  <ArrowUpRight
                    size={22}
                    aria-hidden="true"
                    className="self-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                  />
                </span>
                <span className="flex items-center gap-3 text-headline text-white/35 tabular-nums">
                  {pending ? <Spinner size={16} /> : null}
                  {i + 1}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {state.error ? (
          <p role="alert" className="mt-4 text-body text-[#ff6b6b]">
            {state.error}
          </p>
        ) : null}
      </form>
      <p className="mt-8 text-caption text-white/45">
        Each starter opens a new project with a ready-made board. Rename it any time.
      </p>
    </section>
  );
}
