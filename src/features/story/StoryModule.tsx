"use client";

import {
  ArrowDown,
  ArrowUp,
  Clapperboard,
  MessageSquareQuote,
  Pilcrow,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";
import { formatEdited } from "@/lib/format";
import { saveScript } from "./actions";
import { scriptCharacters, type BlockType, type ScriptBlock, type Story } from "./types";

const TYPE_ICON = { scene: Clapperboard, action: Pilcrow, dialogue: MessageSquareQuote } as const;

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/** A textarea that grows with its text. */
function Grow({
  value,
  onChange,
  className,
  ...props
}: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${node.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "block w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-text-tertiary",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A classic script, edited in place: scene headings, action, and lines of
 * dialogue with who speaks and how.
 */
export function StoryModule({ projectId, story }: { projectId: string; story: Story }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [blocks, setBlocks] = useState(story.blocks);
  const [synced, setSynced] = useState(story.blocks);
  const [dirty, setDirty] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const focusNext = useRef<string | null>(null);

  // A newer script from the server (someone else edited).
  if (story.blocks !== synced && !dirty) {
    setSynced(story.blocks);
    setBlocks(story.blocks);
  }

  // Saves a moment after editing stops.
  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(async () => {
      const result = await saveScript(projectId, blocks);
      if (!result.ok) return toast.show({ title: result.error, tone: "error" });
      setDirty(false);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [blocks, dirty, projectId, toast]);

  // Puts the cursor in a block just added.
  useEffect(() => {
    const id = focusNext.current;
    if (!id) return;
    focusNext.current = null;
    document.querySelector<HTMLElement>(`[data-block="${id}"] [data-first]`)?.focus();
  }, [blocks]);

  const change = (next: ScriptBlock[]) => {
    setBlocks(next);
    setDirty(true);
  };
  const update = (id: string, patch: Partial<ScriptBlock>) =>
    change(blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)));

  const characters = scriptCharacters(blocks);

  /** A new block after `afterId` (or at the end); dialogue answers the last speaker but one. */
  const insert = (type: BlockType, afterId?: string, character?: string) => {
    const index = afterId ? blocks.findIndex((block) => block.id === afterId) + 1 : blocks.length;
    const before = blocks.slice(0, index);
    let speaker = character;
    if (type === "dialogue" && speaker === undefined) {
      const speakers = before.filter((block) => block.type === "dialogue" && block.character);
      const last = speakers.at(-1)?.character;
      speaker = speakers.reverse().find((block) => block.character !== last)?.character ?? "";
    }
    const block: ScriptBlock = {
      id: newId(),
      type,
      text: "",
      ...(type === "dialogue" ? { character: speaker ?? "" } : {}),
    };
    focusNext.current = block.id;
    change([...before, block, ...blocks.slice(index)]);
  };

  const remove = (id: string) => change(blocks.filter((block) => block.id !== id));
  const move = (id: string, delta: number) => {
    const index = blocks.findIndex((block) => block.id === id);
    const target = index + delta;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    change(next);
  };
  const retype = (block: ScriptBlock, type: BlockType) =>
    update(block.id, {
      type,
      character: type === "dialogue" ? (block.character ?? "") : undefined,
      parenthetical: type === "dialogue" ? block.parenthetical : undefined,
    });

  // ⌘/Ctrl+Enter: a new block of the same kind below.
  const onKeyDown = (block: ScriptBlock) => (event: KeyboardEvent) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      insert(block.type === "scene" ? "action" : block.type, block.id);
    }
  };

  // Scene numbers, in order.
  const sceneNumbers = new Map<string, number>();
  for (const block of blocks) {
    if (block.type === "scene") sceneNumbers.set(block.id, sceneNumbers.size + 1);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(["scene", "action", "dialogue"] as const).map((type) => {
            const Icon = TYPE_ICON[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => insert(type)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface-muted px-3.5 text-body font-medium transition-colors hover:bg-surface-pressed"
              >
                <Plus size={14} aria-hidden="true" />
                <Icon size={15} aria-hidden="true" />
                {t(`story.add.${type}`)}
              </button>
            );
          })}
        </div>
        <span className="text-caption text-text-tertiary">
          {dirty
            ? t("story.saving")
            : story.updatedAt
              ? t("story.saved", { when: formatEdited(story.updatedAt, locale) })
              : ""}
        </span>
      </div>

      {characters.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 text-caption">
          <span className="mr-1 font-semibold tracking-wide text-text-secondary uppercase">
            {t("story.characters")}
          </span>
          {characters.map((name) => (
            <button
              key={name}
              type="button"
              title={t("story.lineFor", { name })}
              onClick={() => insert("dialogue", focusId ?? undefined, name)}
              className="rounded-full bg-surface-muted px-2.5 py-1 font-semibold tracking-wide uppercase transition-colors hover:bg-surface-pressed"
            >
              {name}
            </button>
          ))}
        </div>
      ) : null}

      <datalist id={`characters-${projectId}`}>
        {characters.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {/* The page: a script in the classic layout. */}
      <div className="rounded-[22px] bg-surface-muted/50 px-4 py-6 ring-1 ring-border ring-inset sm:px-10 sm:py-10">
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="max-w-md text-callout text-text-secondary">{t("story.empty")}</p>
            <button
              type="button"
              onClick={() => insert("scene")}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-body font-semibold text-text-inverse"
            >
              <Clapperboard size={16} aria-hidden="true" />
              {t("story.start")}
            </button>
          </div>
        ) : (
          <div className="mx-auto flex max-w-[640px] flex-col font-mono text-[15px] leading-relaxed">
            {blocks.map((block, index) => {
              const focused = focusId === block.id;
              return (
                <div
                  key={block.id}
                  data-block={block.id}
                  onFocus={() => setFocusId(block.id)}
                  className={cn(
                    "group relative -mx-3 flex flex-col rounded-[12px] px-3 py-1.5 transition-colors",
                    focused ? "bg-surface/60" : "hover:bg-surface/30",
                    block.type === "scene" && index > 0 && "mt-6",
                    block.type === "dialogue" && "my-2",
                  )}
                >
                  {block.type === "scene" ? (
                    <div className="flex gap-3">
                      <span className="pt-px font-bold text-text-tertiary tabular-nums">
                        {sceneNumbers.get(block.id)}.
                      </span>
                      <Grow
                        data-first
                        value={block.text}
                        onChange={(text) => update(block.id, { text })}
                        onKeyDown={onKeyDown(block)}
                        placeholder={t("story.scenePlaceholder")}
                        aria-label={t("story.types.scene")}
                        className="font-bold uppercase"
                      />
                    </div>
                  ) : block.type === "action" ? (
                    <Grow
                      data-first
                      value={block.text}
                      onChange={(text) => update(block.id, { text })}
                      onKeyDown={onKeyDown(block)}
                      placeholder={t("story.actionPlaceholder")}
                      aria-label={t("story.types.action")}
                    />
                  ) : (
                    <div className="mx-auto flex w-full max-w-[400px] flex-col">
                      <input
                        data-first
                        value={block.character ?? ""}
                        onChange={(event) => update(block.id, { character: event.target.value })}
                        list={`characters-${projectId}`}
                        placeholder={t("story.characterPlaceholder")}
                        aria-label={t("story.character")}
                        maxLength={80}
                        className="w-full bg-transparent text-center font-bold tracking-wide uppercase outline-none placeholder:text-text-tertiary placeholder:normal-case"
                      />
                      {focused || block.parenthetical ? (
                        <input
                          value={block.parenthetical ?? ""}
                          onChange={(event) =>
                            update(block.id, { parenthetical: event.target.value || undefined })
                          }
                          placeholder={t("story.parentheticalPlaceholder")}
                          aria-label={t("story.parenthetical")}
                          maxLength={200}
                          className="mx-auto w-3/4 bg-transparent text-center text-text-secondary italic outline-none placeholder:text-text-tertiary"
                        />
                      ) : null}
                      <Grow
                        value={block.text}
                        onChange={(text) => update(block.id, { text })}
                        onKeyDown={onKeyDown(block)}
                        placeholder={t("story.linePlaceholder")}
                        aria-label={t("story.line")}
                      />
                    </div>
                  )}

                  {/* Block tools: kind, order, add below, remove. */}
                  <div
                    className={cn(
                      "flex w-fit items-center gap-0.5 self-end rounded-full bg-surface p-0.5 font-sans shadow-sm transition-opacity",
                      "sm:absolute sm:top-1 sm:right-1 sm:mt-0",
                      focused
                        ? "mt-1.5 opacity-100"
                        : "hidden sm:pointer-events-none sm:flex sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100",
                    )}
                  >
                    {(["scene", "action", "dialogue"] as const).map((type) => {
                      const Icon = TYPE_ICON[type];
                      return (
                        <button
                          key={type}
                          type="button"
                          title={t(`story.to.${type}`)}
                          aria-label={t(`story.to.${type}`)}
                          aria-pressed={block.type === type}
                          onClick={() => retype(block, type)}
                          className={cn(
                            "flex size-7 items-center justify-center rounded-full transition-colors",
                            block.type === type
                              ? "bg-ink text-text-inverse"
                              : "text-text-secondary hover:bg-surface-muted",
                          )}
                        >
                          <Icon size={14} aria-hidden="true" />
                        </button>
                      );
                    })}
                    <span className="mx-0.5 h-4 w-px bg-border-strong" aria-hidden="true" />
                    <button
                      type="button"
                      title={t("story.moveUp")}
                      aria-label={t("story.moveUp")}
                      onClick={() => move(block.id, -1)}
                      disabled={index === 0}
                      className="flex size-7 items-center justify-center rounded-full text-text-secondary hover:bg-surface-muted disabled:opacity-30"
                    >
                      <ArrowUp size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      title={t("story.moveDown")}
                      aria-label={t("story.moveDown")}
                      onClick={() => move(block.id, 1)}
                      disabled={index === blocks.length - 1}
                      className="flex size-7 items-center justify-center rounded-full text-text-secondary hover:bg-surface-muted disabled:opacity-30"
                    >
                      <ArrowDown size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      title={t("story.addBelow")}
                      aria-label={t("story.addBelow")}
                      onClick={() =>
                        insert(block.type === "scene" ? "action" : block.type, block.id)
                      }
                      className="flex size-7 items-center justify-center rounded-full text-text-secondary hover:bg-surface-muted"
                    >
                      <Plus size={14} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      title={t("story.remove")}
                      aria-label={t("story.remove")}
                      onClick={() => remove(block.id)}
                      className="flex size-7 items-center justify-center rounded-full text-text-secondary hover:bg-surface-muted hover:text-danger"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {blocks.length > 0 ? (
        <p className="text-caption text-text-tertiary">{t("story.hint")}</p>
      ) : null}
    </div>
  );
}

/** The script on the Plan's overview: where it starts and who's in it. */
export function StoryPreview({ story, empty }: { story: Story; empty: string }) {
  const { t } = useI18n();
  const scenes = story.blocks.filter((block) => block.type === "scene");
  const lines = story.blocks.filter((block) => block.type === "dialogue");
  const characters = scriptCharacters(story.blocks);
  const first = scenes[0]?.text || story.blocks.find((block) => block.text.trim())?.text;
  if (!first) return <p className="mt-auto text-headline text-text-secondary">{empty}</p>;
  return (
    <div className="mt-auto flex flex-col gap-2">
      <p className="line-clamp-3 font-mono text-callout font-bold uppercase">{first}</p>
      <p className="text-caption text-text-secondary">
        {t("story.previewCounts", { scenes: scenes.length, lines: lines.length })}
        {characters.length > 0 ? ` · ${characters.join(", ")}` : ""}
      </p>
    </div>
  );
}
