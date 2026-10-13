"use client";

import { Dialog } from "@/components/ui/Dialog";
import type { MessageKey } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl";

/** Labels are message keys; keys are symbols, or a message key where they're words. */
const GROUPS: { title: MessageKey; items: [MessageKey, string | MessageKey][] }[] = [
  {
    title: "shortcuts.edit",
    items: [
      ["shortcuts.undo", `${MOD} Z`],
      ["shortcuts.redo", `${MOD} ⇧ Z`],
      ["shortcuts.copy", `${MOD} C`],
      ["shortcuts.paste", `${MOD} V`],
      ["shortcuts.duplicate", `${MOD} D`],
      ["shortcuts.delete", "⌫"],
      ["shortcuts.selectAll", `${MOD} A`],
      ["shortcuts.deselect", "Esc"],
      ["shortcuts.layering", "]  ["],
      ["shortcuts.group", `${MOD} G  ${MOD} ⇧ G`],
    ],
  },
  {
    title: "shortcuts.canvas",
    items: [
      ["shortcuts.pan", "shortcuts.panKeys"],
      ["shortcuts.zoom", `${MOD} +  ${MOD} −`],
      ["shortcuts.zoomToFit", "⇧ 1"],
      ["shortcuts.zoomTo100", "⇧ 0"],
      ["shortcuts.nudge", "shortcuts.nudgeKeys"],
    ],
  },
  {
    title: "shortcuts.tools",
    items: [
      ["shortcuts.select", "V"],
      ["shortcuts.hand", "H"],
      ["shortcuts.text", "T"],
      ["shortcuts.note", "N"],
      ["shortcuts.section", "F"],
      ["shortcuts.draw", "D"],
      ["shortcuts.shape", "R"],
      ["shortcuts.arrow", "A"],
    ],
  },
];

const isMessageKey = (keys: string): keys is MessageKey => keys.startsWith("shortcuts.");

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onClose={onClose} title={t("canvas.shortcuts")} className="max-w-[640px]">
      <div className="grid max-h-[60vh] gap-x-10 gap-y-6 overflow-y-auto sm:grid-cols-2">
        {GROUPS.map((group) => (
          <section key={group.title} className="flex flex-col gap-1">
            <h3 className="mb-1 text-caption font-semibold tracking-[0.06em] text-text-tertiary uppercase">
              {t(group.title)}
            </h3>
            <dl className="flex flex-col">
              {group.items.map(([label, keys]) => (
                <div key={label} className="flex items-center justify-between gap-4 py-1.5">
                  <dt className="text-body">{t(label)}</dt>
                  <dd>
                    <kbd className="rounded-sm bg-surface-muted px-1.5 py-0.5 font-sans text-caption whitespace-nowrap text-text-secondary">
                      {isMessageKey(keys) ? t(keys) : keys}
                    </kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
