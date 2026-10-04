import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-text-inverse hover:bg-ink-hover",
  secondary: "bg-surface-muted text-text hover:bg-surface-pressed",
  ghost: "text-text hover:bg-surface-hover active:bg-surface-pressed",
  danger: "text-danger hover:bg-danger-surface",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-body rounded-full gap-1.5",
  md: "h-9 px-4 text-body rounded-full gap-2",
  lg: "h-11 px-6 text-callout rounded-full gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading = false, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center font-medium whitespace-nowrap",
        "transition-[background-color,color,box-shadow,opacity,transform] duration-150 ease-out",
        "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner size={14} /> : null}
      {children}
    </button>
  );
});

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: "sm" | "md";
  active?: boolean;
}

/** Square, icon-only button. `label` is required for screen readers and the tooltip. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = "md", active = false, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full text-text-secondary",
        "transition-[background-color,color,transform] duration-150 ease-out",
        "hover:bg-surface-hover hover:text-text active:scale-95 active:bg-surface-pressed",
        "disabled:pointer-events-none disabled:opacity-35",
        active && "bg-surface-pressed text-text",
        size === "sm" ? "size-8" : "size-9",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
