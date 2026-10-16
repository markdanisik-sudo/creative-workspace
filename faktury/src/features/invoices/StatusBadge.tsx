import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import type { InvoiceStatus } from "@/lib/invoice/types";
import { cn } from "@/lib/cn";

const LABELS: Record<InvoiceStatus, string> = {
  paid: "Zaplaceno",
  unpaid: "Čeká",
  overdue: "Po splatnosti",
};

/** Status with an icon and a word, never colour alone. */
export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const Icon = status === "paid" ? CheckCircle2 : status === "overdue" ? AlertCircle : Clock;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        status === "paid" && "bg-[rgba(36,138,61,0.12)] text-[var(--success)]",
        status === "unpaid" && "bg-surface-muted text-text-secondary",
        status === "overdue" && "bg-danger-surface text-danger",
      )}
    >
      <Icon size={12} aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}
