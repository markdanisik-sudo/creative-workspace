"use client";

import { Dialog } from "@/components/ui/Dialog";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl";

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "Edit",
    items: [
      ["Undo", `${MOD} Z`],
      ["Redo", `${MOD} ⇧ Z`],
      ["Copy", `${MOD} C`],
      ["Paste", `${MOD} V`],
      ["Duplicate", `${MOD} D`],
      ["Delete", "⌫"],
      ["Select all", `${MOD} A`],
      ["Deselect / stop editing", "Esc"],
      ["Bring forward / send backward", "]  ["],
      ["Group / ungroup", `${MOD} G  ${MOD} ⇧ G`],
    ],
  },
  {
    title: "Canvas",
    items: [
      ["Pan", "Space + drag"],
      ["Zoom in / out", `${MOD} +  ${MOD} −`],
      ["Zoom to fit", "⇧ 1"],
      ["Zoom to 100%", "⇧ 0"],
      ["Nudge selection", "Arrow keys"],
    ],
  },
  {
    title: "Tools",
    items: [
      ["Select", "V"],
      ["Hand", "H"],
      ["Text", "T"],
      ["Note", "N"],
      ["Section", "F"],
      ["Draw", "D"],
      ["Shape", "R"],
      ["Arrow", "A"],
    ],
  },
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Keyboard shortcuts" className="max-w-[640px]">
      <div className="grid max-h-[60vh] gap-x-10 gap-y-6 overflow-y-auto sm:grid-cols-2">
        {GROUPS.map((group) => (
          <section key={group.title} className="flex flex-col gap-1">
            <h3 className="mb-1 text-caption font-semibold tracking-[0.06em] text-text-tertiary uppercase">
              {group.title}
            </h3>
            <dl className="flex flex-col">
              {group.items.map(([label, keys]) => (
                <div key={label} className="flex items-center justify-between gap-4 py-1.5">
                  <dt className="text-body">{label}</dt>
                  <dd>
                    <kbd className="rounded-sm bg-surface-muted px-1.5 py-0.5 font-sans text-caption whitespace-nowrap text-text-secondary">
                      {keys}
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
