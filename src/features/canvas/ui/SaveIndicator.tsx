import { Check, CloudOff } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";
import type { SaveStatus } from "../persistence/BoardSaver";

const LABELS: Record<Exclude<SaveStatus, "idle">, MessageKey> = {
  saving: "canvas.saving",
  saved: "canvas.saved",
  error: "canvas.saveError",
};

/** Quiet save state: only draws attention when something is wrong. */
export function SaveIndicator({ status }: { status: SaveStatus }) {
  const { t } = useI18n();
  if (status === "idle") return null;
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "flex h-9 items-center gap-1.5 px-2.5 text-caption font-medium whitespace-nowrap transition-colors",
        status === "error" ? "text-danger" : "text-text-tertiary",
      )}
    >
      {status === "saving" ? <Spinner size={12} /> : null}
      {status === "saved" ? <Check size={13} aria-hidden="true" /> : null}
      {status === "error" ? <CloudOff size={13} aria-hidden="true" /> : null}
      <span className={cn(status !== "error" && "hidden sm:inline")}>{t(LABELS[status])}</span>
    </span>
  );
}
