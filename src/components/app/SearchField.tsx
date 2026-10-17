"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/client";

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
export function SearchField({
  className,
  autoFocus,
  onDone,
}: {
  className?: string;
  autoFocus?: boolean;
  /** Called when the field is cleared and left (for the compact search to fold up). */
  onDone?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const shortcutHint = useShortcutHint();
  const { t } = useI18n();

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
        aria-label={t("nav.searchLabel")}
        placeholder={t("nav.search")}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        autoFocus={autoFocus}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setValue("");
            inputRef.current?.blur();
            onDone?.();
          }
        }}
        onBlur={() => {
          if (!value.trim()) onDone?.();
        }}
        className={cn(
          "h-9 w-full rounded-full bg-surface-muted pr-14 pl-9 text-body text-text outline-none",
          "placeholder:text-text-tertiary [&::-webkit-search-cancel-button]:hidden",
          "transition-[background-color,box-shadow] duration-150",
          "focus:shadow-[0_0_0_1.5px_var(--text)]",
        )}
      />
      {value ? (
        <button
          type="button"
          aria-label={t("nav.clearSearch")}
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

/**
 * Search as a small round button, as on the studio site; it opens into the
 * field on click or ⌘K / Ctrl+K, and stays open while there's a query.
 */
export function CompactSearch() {
  const params = useSearchParams();
  const { t } = useI18n();
  const [open, setOpen] = useState(Boolean(params.get("q")));

  useEffect(() => {
    if (open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (open) {
    return (
      <SearchField
        className="w-44 animate-fade-in sm:w-52"
        autoFocus
        onDone={() => setOpen(false)}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={t("nav.searchLabel")}
      title={t("nav.searchLabel")}
      className="flex size-8 shrink-0 items-center justify-center rounded-full text-text transition-[background-color,transform] duration-150 hover:bg-surface-muted active:scale-95"
    >
      <Search size={16} strokeWidth={1.9} />
    </button>
  );
}
