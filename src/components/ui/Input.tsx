import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-md bg-surface px-3 text-callout text-text shadow-sm outline-none",
          "placeholder:text-text-tertiary",
          "transition-shadow duration-150 ease-out",
          "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--focus-ring),var(--shadow-sm)]",
          "aria-[invalid=true]:shadow-[0_0_0_1px_var(--danger)]",
          className,
        )}
        {...props}
      />
    );
  },
);

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hideLabel?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hideLabel = false, id, className, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={inputId}
        className={cn("text-caption font-medium text-text-secondary", hideLabel && "sr-only")}
      >
        {label}
      </label>
      <Input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
});
