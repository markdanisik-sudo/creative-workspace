"use client";

import {
  CheckSquare,
  File,
  Film,
  Frame,
  Image as ImageIcon,
  Link2,
  Plus,
  StickyNote,
  Type,
} from "lucide-react";
import { useRef, useState } from "react";
import { useEditor } from "tldraw";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/Menu";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/client";
import { DOCUMENT_MIME_TYPES, IMAGE_MIME_TYPES, VIDEO_MIME_TYPES } from "../assets/files";
import { addChecklist, addFiles, addNote, addSection, addText } from "./actions";
import { LinkDialog } from "./LinkDialog";

const ICON_SIZE = 16;

type PickerKind = "image" | "video" | "file";

const ACCEPT: Record<PickerKind, string> = {
  image: IMAGE_MIME_TYPES.join(","),
  video: VIDEO_MIME_TYPES.join(","),
  file: DOCUMENT_MIME_TYPES.join(","),
};

export function AddMenu() {
  const editor = useEditor();
  const { t } = useI18n();
  const [linkOpen, setLinkOpen] = useState(false);
  const inputs = useRef<Partial<Record<PickerKind, HTMLInputElement | null>>>({});

  const pick = (kind: PickerKind) => inputs.current[kind]?.click();

  return (
    <>
      <Menu
        label={t("canvas.addToBoard")}
        side="top"
        trigger={(props) => (
          <button
            type="button"
            aria-label={t("canvas.add")}
            title={t("canvas.add")}
            className={cn(
              "flex size-9 items-center justify-center rounded-full bg-ink text-text-inverse",
              "transition-[transform,background-color] duration-150 ease-out hover:bg-ink-hover active:scale-95",
              "aria-expanded:rotate-45",
            )}
            {...props}
          >
            <Plus size={18} strokeWidth={2.25} />
          </button>
        )}
      >
        <MenuItem icon={<Type size={ICON_SIZE} />} shortcut="T" onSelect={() => addText(editor)}>
          {t("canvas.text")}
        </MenuItem>
        <MenuItem
          icon={<StickyNote size={ICON_SIZE} />}
          shortcut="N"
          onSelect={() => addNote(editor)}
        >
          {t("canvas.note")}
        </MenuItem>
        <MenuItem
          icon={<CheckSquare size={ICON_SIZE} />}
          onSelect={() => addChecklist(editor, t("canvas.checklistTitle"))}
        >
          {t("canvas.checklist")}
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<ImageIcon size={ICON_SIZE} />} onSelect={() => pick("image")}>
          {t("canvas.image")}
        </MenuItem>
        <MenuItem icon={<Film size={ICON_SIZE} />} onSelect={() => pick("video")}>
          {t("canvas.video")}
        </MenuItem>
        <MenuItem icon={<Link2 size={ICON_SIZE} />} onSelect={() => setLinkOpen(true)}>
          {t("canvas.link")}
        </MenuItem>
        <MenuItem icon={<File size={ICON_SIZE} />} onSelect={() => pick("file")}>
          {t("canvas.file")}
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          icon={<Frame size={ICON_SIZE} />}
          shortcut="F"
          onSelect={() => addSection(editor, t("canvas.sectionName"))}
        >
          {t("canvas.section")}
        </MenuItem>
      </Menu>

      {(Object.keys(ACCEPT) as PickerKind[]).map((kind) => (
        <input
          key={kind}
          ref={(element) => {
            inputs.current[kind] = element;
          }}
          type="file"
          accept={ACCEPT[kind]}
          multiple
          hidden
          aria-hidden="true"
          tabIndex={-1}
          onChange={(event) => {
            addFiles(editor, Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      ))}

      <LinkDialog open={linkOpen} onClose={() => setLinkOpen(false)} />
    </>
  );
}
