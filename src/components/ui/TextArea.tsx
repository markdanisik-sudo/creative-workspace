import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hideLabel?: boolean;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hideLabel = false, error, id, className, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className={cn("text-caption font-medium text-text-secondary", hideLabel && "sr-only")}>
        {label}
      </label>
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cn(
          "w-full resize-y rounded-lg bg-surface-muted px-4 py-3 text-callout text-text outline-none",
          "placeholder:text-text-tertiary focus-visible:shadow-[0_0_0_2px_var(--text)]",
        )}
        {...props}
      />
      {error ? <p className="text-caption text-danger">{error}</p> : null}
    </div>
  );
});
