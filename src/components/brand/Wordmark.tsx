import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { cn } from "@/lib/cn";

/** Logo mark: two offset rounded tiles, like cards on a table. */
export function LogoMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <rect x="2" y="5" width="10" height="13" rx="2.5" fill="currentColor" opacity="0.35" />
      <rect x="8" y="2" width="10" height="13" rx="2.5" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ href = "/projects", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 rounded-sm text-text", className)}
      aria-label={`${APP_NAME} home`}
    >
      <LogoMark />
      <span className="text-callout font-semibold tracking-[-0.01em] max-sm:sr-only">
        {APP_NAME}
      </span>
    </Link>
  );
}
