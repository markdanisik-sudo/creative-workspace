"use client";

import { Briefcase, Sparkles } from "lucide-react";
import type { ProjectKind } from "@/features/hub/types";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/cn";

const KINDS = [
  { id: "client", icon: Briefcase },
  { id: "personal", icon: Sparkles },
] as const;

/** For a client, or a personal project of your own. */
export function ProjectKindPicker({
  value,
  onChange,
}: {
  value: ProjectKind;
  onChange: (kind: ProjectKind) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-2">
      <span className="text-caption font-medium text-text-secondary">{t("project.kindLabel")}</span>
      <div className="grid grid-cols-2 gap-2" role="radiogroup">
        {KINDS.map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={value === id}
            onClick={() => onChange(id)}
            className={cn(
              "flex flex-col gap-1 rounded-[16px] p-3.5 text-left transition-colors",
              value === id
                ? "bg-ink text-text-inverse"
                : "bg-surface-muted text-text hover:bg-surface-pressed",
            )}
          >
            <span className="flex items-center gap-2 text-body font-semibold">
              <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
              {t(`project.kinds.${id}.name`)}
            </span>
            <span
              className={cn("text-caption", value === id ? "opacity-70" : "text-text-secondary")}
            >
              {t(`project.kinds.${id}.body`)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
