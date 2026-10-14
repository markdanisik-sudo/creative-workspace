"use client";

import { Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { APP_NAME } from "@/lib/config";
import { useI18n } from "@/lib/i18n/client";

const DISMISS_KEY = "lab-install-dismissed";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

/** Chrome's install event (not in the TS DOM lib). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    // iPadOS reports itself as a Mac.
    (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1)
  );
}

function snoozed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

/**
 * On a phone in the browser, a bottom sheet that shows how to put the app on
 * the home screen, where it opens full screen like a native app. iPhone gets
 * the Share → Add to Home Screen steps; Android gets a one-tap install button.
 */
export function InstallPrompt() {
  const { t } = useI18n();
  const [mode, setMode] = useState<"ios" | "android" | null>(null);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || snoozed() || !window.matchMedia("(pointer: coarse)").matches) return;

    if (isIos()) {
      const timer = setTimeout(() => setMode("ios"), 1200);
      return () => clearTimeout(timer);
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!mode) return null;

  const close = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Private mode: it just shows again next time.
    }
    setMode(null);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setMode(null);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      <section
        role="dialog"
        aria-labelledby="install-title"
        className="mx-auto max-w-md animate-sheet-in rounded-[26px] bg-surface p-5 shadow-lg"
      >
        <div className="flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- tiny static icon */}
          <img
            src="/icons/icon-192.png"
            alt=""
            width={56}
            height={56}
            className="size-14 shrink-0 rounded-[14px] shadow-sm"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
            <h2 id="install-title" className="text-callout font-semibold">
              {t("install.title", { name: APP_NAME })}
            </h2>
            <p className="text-body text-text-secondary">{t("install.body")}</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={t("install.notNow")}
            className="-mt-1 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text-secondary"
          >
            <X size={15} />
          </button>
        </div>

        {mode === "ios" ? (
          <ol className="mt-5 flex flex-col gap-2.5 rounded-[18px] bg-surface-muted p-4 text-body">
            <li className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-surface text-[#0a84ff] shadow-sm">
                <Share size={16} aria-hidden="true" />
              </span>
              <span>{t("install.stepShare")}</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-surface shadow-sm">
                <SquarePlus size={16} aria-hidden="true" />
              </span>
              <span>{t("install.stepAdd")}</span>
            </li>
          </ol>
        ) : (
          <button
            type="button"
            onClick={install}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-ink text-callout font-semibold text-text-inverse active:scale-[0.98]"
          >
            {t("install.install")}
          </button>
        )}

        <p className="mt-3 text-caption text-text-tertiary">{t("install.signInNote")}</p>
      </section>
    </div>
  );
}
