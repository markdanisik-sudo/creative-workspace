import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { cn } from "@/lib/cn";
import { MARK, WORDMARK } from "./logo-paths";

/** The logo as vector paths; it takes the text colour, so it follows the theme. */
export function LogoSvg({
  variant = "wordmark",
  className,
}: {
  variant?: "wordmark" | "mark";
  className?: string;
}) {
  const logo = variant === "mark" ? MARK : WORDMARK;
  return (
    <svg
      viewBox={logo.viewBox}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={cn("block h-auto", className)}
    >
      <path fillRule="evenodd" d={logo.d} />
    </svg>
  );
}

export function Wordmark({
  href = "/projects",
  size = "sm",
  className,
}: {
  href?: string;
  /** xs sits beside caption text (the bar's clock). */
  size?: "xs" | "sm" | "lg";
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`${APP_NAME} home`}
      className={cn("inline-flex items-center rounded-sm text-text", className)}
    >
      <LogoSvg
        className={
          size === "xs" ? "w-[96px]" : size === "sm" ? "w-[132px]" : "w-[clamp(280px,64vw,860px)]"
        }
      />
    </Link>
  );
}
