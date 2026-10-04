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
  const [linkOpen, setLinkOpen] = useState(false);
  const inputs = useRef<Partial<Record<PickerKind, HTMLInputElement | null>>>({});

  const pick = (kind: PickerKind) => inputs.current[kind]?.click();

  return (
    <>
      <Menu
        label="Add to board"
        side="top"
        trigger={(props) => (
          <button
            type="button"
            aria-label="Add"
            title="Add"
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
          Text
        </MenuItem>
        <MenuItem
          icon={<StickyNote size={ICON_SIZE} />}
          shortcut="N"
          onSelect={() => addNote(editor)}
        >
          Note
        </MenuItem>
        <MenuItem icon={<CheckSquare size={ICON_SIZE} />} onSelect={() => addChecklist(editor)}>
          Checklist
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<ImageIcon size={ICON_SIZE} />} onSelect={() => pick("image")}>
          Image
        </MenuItem>
        <MenuItem icon={<Film size={ICON_SIZE} />} onSelect={() => pick("video")}>
          Video
        </MenuItem>
        <MenuItem icon={<Link2 size={ICON_SIZE} />} onSelect={() => setLinkOpen(true)}>
          Link
        </MenuItem>
        <MenuItem icon={<File size={ICON_SIZE} />} onSelect={() => pick("file")}>
          File
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          icon={<Frame size={ICON_SIZE} />}
          shortcut="F"
          onSelect={() => addSection(editor)}
        >
          Section
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
