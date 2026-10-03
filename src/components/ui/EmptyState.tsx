import type { ReactNode } from "react";

/** Typography-led empty state: no illustrations, just a calm invitation. */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center animate-rise-in">
      <h2 className="text-display font-semibold">{title}</h2>
      <p className="max-w-sm text-callout text-text-secondary">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
