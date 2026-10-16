"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

/**
 * A text field for sensitive values (account numbers): masked until shown,
 * not remembered by the browser's autofill.
 */
export function SecretField({
  label,
  name,
  defaultValue,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue: string;
  maxLength?: number;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-caption font-medium text-text-secondary">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          defaultValue={defaultValue}
          maxLength={maxLength}
          autoComplete="off"
          spellCheck={false}
          data-1p-ignore
          className="h-11 w-full rounded-lg bg-surface-muted pr-12 pl-4 font-mono text-callout text-text outline-none focus-visible:shadow-[0_0_0_2px_var(--text)]"
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "Skrýt" : "Zobrazit"}
          title={visible ? "Skrýt" : "Zobrazit"}
          className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-text-secondary hover:text-text"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}
