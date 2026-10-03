"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

interface MenuContextValue {
  close: () => void;
}

const MenuContext = createContext<MenuContextValue | null>(null);

interface MenuProps {
  /** Renders the trigger. Spread `props` onto a button. */
  trigger: (props: {
    "aria-haspopup": "menu";
    "aria-expanded": boolean;
    "aria-controls": string;
    onClick: () => void;
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  }) => ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  side?: "bottom" | "top";
  className?: string;
  label: string;
}

/** Accessible dropdown menu: arrow keys, Home/End, Escape and outside clicks. */
export function Menu({
  trigger,
  children,
  align = "start",
  side = "bottom",
  className,
  label,
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const focusFirstOnOpen = useRef(false);
  const id = useId();

  const items = () =>
    Array.from(
      listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? [],
    );

  const close = useCallback(() => {
    setOpen(false);
    rootRef.current?.querySelector<HTMLElement>("[aria-haspopup]")?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    if (focusFirstOnOpen.current) items()[0]?.focus();
    else listRef.current?.focus();

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    const focusAt = (next: number) => list[(next + list.length) % list.length]?.focus();
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusAt(index + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusAt(index <= 0 ? list.length - 1 : index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAt(0);
        break;
      case "End":
        event.preventDefault();
        focusAt(list.length - 1);
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        close();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  return (
    <MenuContext.Provider value={{ close }}>
      <div ref={rootRef} className="relative inline-flex">
        {trigger({
          "aria-haspopup": "menu",
          "aria-expanded": open,
          "aria-controls": id,
          onClick: () => {
            focusFirstOnOpen.current = false;
            setOpen((value) => !value);
          },
          onKeyDown: (event) => {
            if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              focusFirstOnOpen.current = true;
              setOpen(true);
            }
          },
        })}
        {open ? (
          <div
            ref={listRef}
            id={id}
            role="menu"
            aria-label={label}
            tabIndex={-1}
            onKeyDown={onListKeyDown}
            className={cn(
              "absolute z-50 min-w-[200px] rounded-lg bg-surface p-1.5 shadow-lg outline-none animate-pop-in",
              side === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5",
              align === "start" ? "left-0" : "right-0",
              side === "bottom"
                ? align === "start"
                  ? "origin-top-left"
                  : "origin-top-right"
                : align === "start"
                  ? "origin-bottom-left"
                  : "origin-bottom-right",
              className,
            )}
          >
            {children}
          </div>
        ) : null}
      </div>
    </MenuContext.Provider>
  );
}

interface MenuItemProps {
  onSelect: () => void;
  icon?: ReactNode;
  shortcut?: string;
  destructive?: boolean;
  disabled?: boolean;
  children: ReactNode;
}

export function MenuItem({
  onSelect,
  icon,
  shortcut,
  destructive,
  disabled,
  children,
}: MenuItemProps) {
  const menu = useContext(MenuContext);
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      disabled={disabled}
      onClick={() => {
        menu?.close();
        onSelect();
      }}
      className={cn(
        "flex h-9 w-full items-center gap-2.5 rounded-sm px-2.5 text-left text-body outline-none",
        "transition-colors duration-100 hover:bg-surface-hover focus-visible:bg-surface-hover",
        "disabled:opacity-40",
        destructive ? "text-danger" : "text-text",
      )}
    >
      {icon ? (
        <span
          className={cn(
            "flex size-4 items-center justify-center",
            !destructive && "text-text-secondary",
          )}
        >
          {icon}
        </span>
      ) : null}
      <span className="flex-1 truncate">{children}</span>
      {shortcut ? (
        <kbd className="font-sans text-caption text-text-tertiary">{shortcut}</kbd>
      ) : null}
    </button>
  );
}

export function MenuSeparator() {
  return <div role="separator" className="mx-2 my-1 h-px bg-border" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2.5 pt-1.5 pb-1 text-caption font-medium text-text-tertiary">{children}</div>
  );
}
