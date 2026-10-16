import Link from "next/link";
import { cn } from "@/lib/cn";

/** The app's mark: a small invoice glyph and the name. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2.5 text-text", className)}
      aria-label="Faktury — přehled"
    >
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <rect width="26" height="26" rx="7" fill="var(--ink)" />
        <path d="M8 5.5h7l3.5 3.5V20.5H8z" fill="var(--bg)" />
        <path d="M15 5.5v3.5h3.5z" fill="var(--text-tertiary)" />
        <rect x="10" y="10.5" width="5" height="1.6" rx=".8" fill="var(--ink)" />
        <rect x="10" y="17" width="6.5" height="1.6" rx=".8" fill="var(--ink)" />
      </svg>
      <span className="text-[17px] font-semibold tracking-[-0.03em]">Faktury</span>
    </Link>
  );
}
