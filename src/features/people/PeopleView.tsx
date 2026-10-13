"use client";

import { Check, Copy, Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/PromptDialogs";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useToast } from "@/components/ui/Toast";
import type { Invitation, Member } from "@/features/hub/types";
import { useI18n } from "@/lib/i18n/client";
import { formatEdited } from "@/lib/format";
import { createInvitation, removeMember, revokeInvitation } from "./actions";

function InviteForm({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<{ email: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "").trim();
    setPending(true);
    const result = await createInvitation(projectId, email);
    setPending(false);
    if (!result.ok) return toast.show({ title: result.error, tone: "error" });
    form.reset();
    setCopied(false);
    setCreated({ email, link: result.data.link });
    router.refresh();
  };

  const copy = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(created.link);
    setCopied(true);
  };

  return (
    <div className="flex flex-col gap-5 rounded-xl bg-surface p-6 shadow-sm">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-title font-medium">{t("people.inviteTitle")}</h2>
        <p className="text-body text-text-secondary">{t("people.inviteBody")}</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <TextField
            label={t("people.email")}
            name="email"
            type="email"
            required
            autoComplete="off"
          />
        </div>
        <Button type="submit" variant="primary" loading={pending}>
          <Link2 size={16} aria-hidden="true" />
          {t("people.createLink")}
        </Button>
      </form>
      {created ? (
        <div className="flex flex-col gap-2 rounded-lg bg-surface-muted p-4" role="status">
          <span className="text-caption font-medium text-text-secondary">
            {t("people.linkReady", { email: created.email })}
          </span>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={created.link}
              onFocus={(event) => event.currentTarget.select()}
              aria-label={t("people.linkReady", { email: created.email })}
              className="h-10 min-w-0 flex-1 rounded-lg bg-surface px-3 font-mono text-caption outline-none"
            />
            <Button variant="secondary" onClick={copy}>
              {copied ? (
                <Check size={16} aria-hidden="true" />
              ) : (
                <Copy size={16} aria-hidden="true" />
              )}
              {copied ? t("people.copied") : t("people.copy")}
            </Button>
          </div>
          <span className="text-caption text-text-tertiary">{t("people.linkOnce")}</span>
        </div>
      ) : null}
    </div>
  );
}

/** Studio-only: who can see this job, and inviting clients into it. */
export function PeopleView({
  projectId,
  members,
  invitations,
}: {
  projectId: string;
  members: Member[];
  invitations: Invitation[];
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const [removing, setRemoving] = useState<Member | null>(null);
  const [, startTransition] = useTransition();

  const revoke = (id: string) =>
    startTransition(async () => {
      const result = await revokeInvitation(id, projectId);
      if (!result.ok) toast.show({ title: result.error, tone: "error" });
      router.refresh();
    });

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col gap-12">
        <section className="flex flex-col gap-5">
          <SectionLabel label={t("people.clients")} index={1} />
          {members.length === 0 ? (
            <p className="text-callout text-text-secondary">{t("people.noClients")}</p>
          ) : (
            <ul className="flex flex-col border-t border-border-strong">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-3 border-b border-border-strong py-4"
                >
                  <Avatar name={member.name} size={36} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-callout font-medium">{member.name}</span>
                    <span className="truncate text-caption text-text-secondary">
                      {member.email ?? formatEdited(member.joinedAt, locale)}
                    </span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setRemoving(member)}>
                    {t("people.remove")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {invitations.length > 0 ? (
          <section className="flex flex-col gap-5">
            <SectionLabel label={t("people.pending")} index={2} />
            <ul className="flex flex-col border-t border-border-strong">
              {invitations.map((invitation) => (
                <li
                  key={invitation.id}
                  className="flex items-center gap-3 border-b border-border-strong py-4"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-callout">{invitation.email}</span>
                    <span className="text-caption text-text-secondary">
                      {invitation.expired
                        ? t("people.expired")
                        : t("people.invitedWhen", {
                            when: formatEdited(invitation.createdAt, locale),
                          })}
                    </span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => revoke(invitation.id)}>
                    {t("people.revoke")}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <div>
        <InviteForm projectId={projectId} />
      </div>

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={t("people.removeTitle", { name: removing?.name ?? "" })}
        description={t("people.removeBody")}
        confirmLabel={t("people.remove")}
        onConfirm={async () => {
          if (!removing) return;
          const result = await removeMember(projectId, removing.id);
          if (!result.ok) toast.show({ title: result.error, tone: "error" });
          setRemoving(null);
          router.refresh();
        }}
      />
    </div>
  );
}
