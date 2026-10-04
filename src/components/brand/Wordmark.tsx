import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { cn } from "@/lib/cn";

/**
 * Temporary text wordmark until the final logo arrives; swap the contents of
 * this component for the logo SVG and every page picks it up.
 */
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
        "inline-flex items-baseline rounded-sm leading-none font-semibold text-text",
        size === "sm"
          ? "text-[16px] tracking-[-0.02em]"
          : "text-[clamp(48px,9vw,120px)] tracking-[-0.05em]",
        className,
      )}
    >
      {APP_NAME}
    </Link>
  );
}
