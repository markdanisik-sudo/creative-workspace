import { cn } from "@/lib/cn";

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={cn("animate-spin", className)}
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="8"
        r="6.5"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="1.5"
      />
      <path
        d="M14.5 8A6.5 6.5 0 0 0 8 1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
