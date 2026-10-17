"use client";

import { Plus, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type Ref } from "react";
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
  const glassRef = useRef<HTMLDivElement>(null);
  const monitorRef = useRef<HTMLDivElement>(null);

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
    // The monitor is a window in the menu's frosted glass: cut it out.
    const panel = panelRef.current;
    const cut = () => {
      const glass = glassRef.current;
      const monitor = monitorRef.current;
      if (!panel || !glass) return;
      const mask = monitor ? glassMask(panel, monitor) : "none";
      glass.style.maskImage = mask;
      glass.style.setProperty("-webkit-mask-image", mask);
    };
    cut();
    const observer = new ResizeObserver(cut);
    if (panel) observer.observe(panel);
    panel?.addEventListener("animationend", cut);

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      observer.disconnect();
      panel?.removeEventListener("animationend", cut);
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
            "absolute inset-x-0 top-0 z-50 isolate flex flex-col rounded-b-[18px] p-2 pb-6 shadow-lg",
            // No fill: a transform held after the animation stops Chrome blurring.
            "origin-top animate-[pop-in_var(--duration-base)_var(--ease-out)]",
          )}
        >
          {/* The frosted glass, its own layer so the monitor can be cut out of it. */}
          <div
            ref={glassRef}
            aria-hidden="true"
            className="absolute inset-0 -z-10 rounded-b-[18px] bg-surface/60 backdrop-blur-2xl backdrop-saturate-150 [mask-size:100%_100%]"
          />
          <div className="-mx-2 -mt-2 flex h-12 items-center justify-between gap-3 pr-1.5 pl-4">
            <div className="flex items-baseline gap-3">
              <Wordmark size="xs" />
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

            <MonitorView ref={monitorRef} imageUrl={imageUrl} statement={t("nav.menuStatement")} />
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

/**
 * An SVG mask for the menu's glass with a hole where the monitor sits (a
 * backdrop blur can't be undone by a child, only cut away).
 */
function glassMask(panel: HTMLElement, monitor: HTMLElement): string {
  const box = monitor.getBoundingClientRect();
  if (box.width === 0) return "none";
  const outer = panel.getBoundingClientRect();
  const [w, h] = [panel.offsetWidth, panel.offsetHeight];
  // Undo the pop-in scale, if the panel is still animating.
  const scale = outer.width / w || 1;
  const x = (box.left - outer.left) / scale;
  const y = (box.top - outer.top) / scale;
  const [bw, bh, r] = [
    box.width / scale,
    box.height / scale,
    parseFloat(getComputedStyle(monitor).borderTopLeftRadius) || 0,
  ];
  const hole = `M${x + r} ${y}H${x + bw - r}A${r} ${r} 0 0 1 ${x + bw} ${y + r}V${y + bh - r}A${r} ${r} 0 0 1 ${x + bw - r} ${y + bh}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + bh - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><path fill-rule='evenodd' d='M0 0H${w}V${h}H0Z${hole}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Timecode from the wall clock, HH:MM:SS:FF at 25 fps. */
function useTimecode() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 40);
    return () => window.clearInterval(tick);
  }, []);
  if (now === null) return "00:00:00:00";
  const date = new Date(now);
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    Math.floor(date.getMilliseconds() / 40),
  ]
    .map(pad)
    .join(":");
}

/**
 * Soft edges, as through a lens wide open: sharp in the middle, falling out
 * of focus toward the rim in a few steps (siblings, so none blurs another's view).
 */
const EDGE_BLURS = [
  { blur: "blur(1.5px)", from: 55 },
  { blur: "blur(4px)", from: 72 },
  { blur: "blur(8px)", from: 88 },
];

/** Looking through a lens: clear glass, soft edges, a faint vignette and fringing. */
function LensGlass() {
  return (
    <>
      {EDGE_BLURS.map(({ blur, from }) => {
        const mask = `radial-gradient(ellipse farthest-corner at center, transparent ${from}%, #000 ${from + 25}%)`;
        return (
          <div
            key={blur}
            className="absolute inset-0 rounded-xl"
            style={{
              backdropFilter: blur,
              WebkitBackdropFilter: blur,
              maskImage: mask,
              WebkitMaskImage: mask,
            }}
          />
        );
      })}
      {/* Optical vignette: light falls off toward the corners. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_farthest-corner_at_center,transparent_65%,rgb(0_0_0/0.07)_100%)]" />
      {/* Lateral chromatic aberration: hairline fringes at the rim, red out, blue in. */}
      <div className="absolute inset-0 rounded-xl shadow-[inset_1px_0_0_rgb(255_59_48/0.3),inset_-1px_0_0_rgb(10_132_255/0.3),inset_0_1px_0_rgb(255_59_48/0.18),inset_0_-1px_0_rgb(10_132_255/0.18)]" />
    </>
  );
}

/** One readout on the monitor's bars: a dim label and its value. */
function Readout({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <span className={cn("flex items-baseline gap-1 whitespace-nowrap", className)}>
      <span className="text-text-tertiary">{label}</span>
      <span className="font-semibold text-text">{value}</span>
    </span>
  );
}

/**
 * The menu's picture: a camera monitor's readouts, pared down, laid straight
 * over the latest project cover on a window cut in the menu's frosted glass.
 */
function MonitorView({
  ref,
  imageUrl,
  statement,
}: {
  ref: Ref<HTMLDivElement>;
  imageUrl: string | null;
  statement: string;
}) {
  const timecode = useTimecode();
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="relative hidden aspect-[16/9] overflow-hidden rounded-xl text-[10px] ring-1 ring-text/10 ring-inset tabular-nums md:block"
    >
      <LensGlass />
      {imageUrl ? (
        // Short-lived signed URL; next/image would cache it past expiry.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="absolute inset-0 size-full object-cover opacity-25" />
      ) : null}

      <div className="absolute inset-x-3.5 top-3 flex items-center justify-between">
        <Readout label="Iris" value="T2.8" />
        <Readout label="STR" value="180°" />
        <Readout label="ISO" value="800" />
        <Readout label="WB" value="5600K" />
      </div>

      {/* Centre cross. */}
      <span className="absolute top-1/2 left-1/2 h-3.5 w-px -translate-1/2 bg-text/40" />
      <span className="absolute top-1/2 left-1/2 h-px w-3.5 -translate-1/2 bg-text/40" />

      <div className="absolute inset-x-3.5 bottom-3 flex items-end justify-between gap-3">
        <p className="text-title leading-tight font-medium text-text">{statement}</p>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="size-1.5 animate-pulse rounded-full bg-[#ff3b30]" />
          <span className="font-semibold text-text">{timecode}</span>
        </span>
      </div>
    </div>
  );
}
