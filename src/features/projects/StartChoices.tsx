"use client";

import { ArrowRight, Plus } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { joinProject } from "@/features/people/actions";
import type { OpenInvitation } from "@/features/people/queries";
import { useI18n } from "@/lib/i18n/client";
import { formatEdited } from "@/lib/format";
import { NewProjectDialog } from "./NewProjectDialog";

function Label({ text, index, dark }: { text: string; index: number; dark?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between text-caption ${dark ? "text-white/55" : "text-text-secondary"}`}
    >
      <span className={`font-medium ${dark ? "text-white" : "text-text"}`}>
        <span aria-hidden="true">/</span>
        {text}
      </span>
      <span aria-hidden="true" className="tabular-nums">
        ({String(index).padStart(2, "0")})
      </span>
    </div>
  );
}

/** Two ways in: start a new project, or join one the studio invited you to. */
export function StartChoices({
  invitations,
  askClient,
  firstIndex = 1,
}: {
  invitations: OpenInvitation[];
  askClient: boolean;
  firstIndex?: number;
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();

  const join = (choice: { invitationId: string } | { code: string }) =>
    startTransition(async () => {
      const result = await joinProject(choice);
      // Success redirects into the project; only errors come back.
      if (result && !result.ok) toast.show({ title: result.error, tone: "error" });
    });

  const submitCode = (event: FormEvent) => {
    event.preventDefault();
    if (code.trim()) join({ code });
  };

  return (
    <div className="grid gap-2 lg:grid-cols-2">
      {/* Start */}
      <button
        type="button"
        onClick={() => setCreating(true)}
        className="group flex min-h-[340px] flex-col justify-between gap-10 rounded-xl bg-[#0e0e0d] p-6 text-left text-[#f4f4f4] shadow-md transition-transform duration-300 ease-out active:scale-[0.99] sm:p-9"
      >
        <Label text={t("dashboard.startProject")} index={firstIndex} dark />
        <div className="flex flex-col gap-4">
          <h2 className="text-display font-medium tracking-tight sm:text-hero">
            {t("dashboard.startTitle")}
          </h2>
          <p className="max-w-md text-callout text-white/60">{t("dashboard.startBody")}</p>
          <span className="mt-2 inline-flex h-11 w-fit items-center gap-2 rounded-full bg-white px-5 text-callout font-semibold text-[#0e0e0d] transition-transform duration-300 group-hover:translate-x-1">
            <Plus size={16} strokeWidth={2.25} aria-hidden="true" />
            {t("dashboard.startCta")}
          </span>
        </div>
      </button>

      {/* Join */}
      <section
        aria-labelledby="join-title"
        className="flex min-h-[340px] flex-col justify-between gap-8 rounded-xl bg-surface p-6 shadow-sm sm:p-9"
      >
        <Label text={t("dashboard.joinLabel")} index={firstIndex + 1} />
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h2 id="join-title" className="text-display font-medium tracking-tight sm:text-hero">
              {t("dashboard.joinTitle")}
            </h2>
            <p className="max-w-md text-callout text-text-secondary">{t("dashboard.joinBody")}</p>
          </div>

          {invitations.length > 0 ? (
            <ul className="flex flex-col border-t border-border-strong">
              {invitations.map((invitation) => (
                <li
                  key={invitation.id}
                  className="flex items-center justify-between gap-4 border-b border-border-strong py-3"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-callout font-semibold">
                      {invitation.projectName}
                    </span>
                    <span className="text-caption text-text-secondary">
                      {t("dashboard.joinInvitedBy", { name: invitation.invitedByName })} ·{" "}
                      {formatEdited(invitation.createdAt, locale)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={pending}
                    onClick={() => join({ invitationId: invitation.id })}
                  >
                    {t("dashboard.joinAction")}
                    <ArrowRight size={14} aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-text-tertiary">{t("dashboard.joinEmpty")}</p>
          )}

          <form onSubmit={submitCode} className="flex flex-col gap-2">
            <label htmlFor="join-code" className="text-caption font-medium text-text-secondary">
              {t("dashboard.joinCodeLabel")}
            </label>
            <div className="flex gap-2">
              <input
                id="join-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder={t("dashboard.joinCodePlaceholder")}
                autoComplete="off"
                className="h-11 min-w-0 flex-1 rounded-full bg-surface-muted px-4 text-callout outline-none focus-visible:shadow-[0_0_0_2px_var(--text)]"
              />
              <Button type="submit" variant="secondary" loading={pending} disabled={!code.trim()}>
                {t("dashboard.joinAction")}
              </Button>
            </div>
          </form>
        </div>
      </section>

      <NewProjectDialog open={creating} onClose={() => setCreating(false)} askClient={askClient} />
    </div>
  );
}
