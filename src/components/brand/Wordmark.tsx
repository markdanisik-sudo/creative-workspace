import Link from "next/link";
import { APP_NAME, BRAND_INITIAL, BRAND_WORD } from "@/lib/config";
import { cn } from "@/lib/cn";

/** The logo's mark alone: the slab initial and its dot. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("font-slab font-black tracking-[-0.06em]", className)}>
      {BRAND_INITIAL}.
    </span>
  );
}

/** "a.ATELIER": a heavy slab initial followed by the name in tight capitals. */
export function Wordmark({
  href = "/projects",
  size = "sm",
  className,
}: {
  href?: string;
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`${APP_NAME} home`}
      className={cn(
        "inline-flex items-baseline rounded-sm leading-none text-text",
        size === "sm" ? "text-[17px]" : "text-[clamp(56px,11vw,148px)]",
        className,
      )}
    >
      <LogoMark />
      <span className="font-sans font-bold tracking-[-0.04em]">{BRAND_WORD}</span>
    </Link>
  );
}
