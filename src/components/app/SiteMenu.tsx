"use client";

import { Plus, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "@/components/brand/Wordmark";
import { signOut } from "@/features/auth/actions";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { LanguageSwitch } from "./LanguageSwitch";
import { LiveDateTime } from "./LiveDateTime";
import { ThemeToggle } from "./ThemeToggle";

interface SiteMenuProps {
  name: string;
  email: string;
  /** Signed image shown beside the menu, e.g. the latest project's cover. */
  imageUrl: string | null;
}

/**
 * The "+" menu: a frosted panel over the header with large numbered links,
 * a mood image, and account controls — mirroring the studio site's menu.
 */
export function SiteMenu({ name, email, imageUrl }: SiteMenuProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const links = [
    { href: "/projects", label: t("nav.projects") },
    { href: "/settings", label: t("nav.settings") },
  ];

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={t("nav.menu")}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-text transition-[background-color,transform] duration-150 hover:bg-surface-muted active:scale-95"
      >
        <Plus size={20} strokeWidth={1.75} />
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label={t("nav.menu")}
          className={cn(
            "absolute inset-x-0 top-0 z-50 flex flex-col rounded-b-[18px] p-2 pb-6 shadow-lg",
            "bg-surface/75 backdrop-blur-2xl backdrop-saturate-150 animate-pop-in origin-top",
          )}
        >
          {/* Opaque, so the bar's own links don't show through the frosted glass. */}
          <div className="-mx-2 -mt-2 flex h-12 items-center justify-between gap-3 bg-surface pr-1.5 pl-4">
            <div className="flex items-baseline gap-3">
              <Wordmark />
              <LiveDateTime className="hidden text-caption text-text-secondary tabular-nums sm:inline" />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle className="size-8" />
              <button
                type="button"
                aria-label={t("nav.closeMenu")}
                onClick={() => {
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className="flex size-8 items-center justify-center rounded-full bg-surface text-text shadow-sm transition-transform active:scale-95"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <div className="grid gap-6 px-3 pt-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-8">
            <nav aria-label={t("nav.menu")}>
              <ul className="flex flex-col">
                {links.map((link, index) => (
                  <li key={link.href} className="border-b border-border-strong">
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      aria-current={pathname.startsWith(link.href) ? "page" : undefined}
                      className="group flex items-baseline justify-between gap-4 rounded-sm py-3"
                    >
                      <span className="text-headline font-medium transition-transform duration-300 group-hover:translate-x-1.5">
                        {link.label}
                      </span>
                      <span className="text-body text-text-secondary tabular-nums">
                        ({String(index + 1).padStart(2, "0")})
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="relative hidden aspect-[16/9] overflow-hidden rounded-xl bg-[#1d1c1a] md:block">
              {imageUrl ? (
                // Short-lived signed URL; next/image would cache it past expiry.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
              ) : null}
              <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                <p className="text-title font-medium text-white">{t("nav.menuStatement")}</p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 px-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-callout font-medium">{name}</span>
              <span className="truncate text-body text-text-secondary">{email}</span>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitch />
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-body text-text-secondary transition-colors hover:text-text"
                >
                  {t("nav.signOut")}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
