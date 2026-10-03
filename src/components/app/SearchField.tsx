"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";

const SEARCH_DEBOUNCE_MS = 200;

const subscribeNever = () => () => {};

/** "⌘K" on Mac, "Ctrl K" elsewhere, nothing on touch devices or during SSR. */
function useShortcutHint(): string | null {
  return useSyncExternalStore(
    subscribeNever,
    () => {
      if (window.matchMedia("(pointer: coarse)").matches) return null;
      return /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl K";
    },
    () => null,
  );
}

/** Search projects and boards. ⌘K / Ctrl+K focuses it from anywhere on the page. */
export function SearchField({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const shortcutHint = useShortcutHint();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const query = value.trim();
    if (query === (params.get("q") ?? "")) return;
    const timer = window.setTimeout(() => {
      startTransition(() => {
        const target = pathname === "/projects" ? pathname : "/projects";
        router.replace(query ? `${target}?q=${encodeURIComponent(query)}` : target, {
          scroll: false,
        });
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [value, params, pathname, router]);

  return (
    <div role="search" className={cn("relative", className)}>
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-tertiary">
        {pending ? <Spinner size={14} /> : <Search size={15} strokeWidth={2} />}
      </span>
      <input
        ref={inputRef}
        type="search"
        aria-label="Search projects and boards"
        placeholder="Search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setValue("");
            inputRef.current?.blur();
          }
        }}
        className={cn(
          "h-9 w-full rounded-md bg-surface-muted pr-14 pl-9 text-body text-text outline-none",
          "placeholder:text-text-tertiary [&::-webkit-search-cancel-button]:hidden",
          "transition-[background-color,box-shadow] duration-150",
          "focus:bg-surface focus:shadow-[0_0_0_3px_var(--focus-ring),var(--shadow-sm)]",
        )}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setValue("");
            inputRef.current?.focus();
          }}
          className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-text-tertiary hover:text-text"
        >
          <X size={14} />
        </button>
      ) : shortcutHint ? (
        <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-sans text-caption text-text-tertiary">
          {shortcutHint}
        </kbd>
      ) : null}
    </div>
  );
}
