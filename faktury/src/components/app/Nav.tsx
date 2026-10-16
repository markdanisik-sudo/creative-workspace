"use client";

import { FileText, LayoutDashboard, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/", label: "Přehled", icon: LayoutDashboard },
  { href: "/faktury", label: "Faktury", icon: FileText },
  { href: "/kontakty", label: "Kontakty", icon: Users },
  { href: "/nastaveni", label: "Nastavení", icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Tabs in the header on wide screens. */
export function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Hlavní">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-body font-medium text-text-secondary transition-colors hover:text-text",
            "aria-[current=page]:bg-surface-muted aria-[current=page]:text-text",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** Tab bar at the bottom on phones, as in a native app. */
export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Hlavní"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden print:hidden"
    >
      <div className="grid grid-cols-4">
        {ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(pathname, href) ? "page" : undefined}
            className="flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[10px] font-medium text-text-tertiary aria-[current=page]:text-text"
          >
            <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
