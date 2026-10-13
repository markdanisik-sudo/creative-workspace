import type { Metadata } from "next";
import Link from "next/link";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { AuthForm } from "@/features/auth/AuthForm";
import { JoinProjectButton } from "@/features/people/JoinProjectButton";
import { getI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("invite.label") };
}

function Message({
  label,
  title,
  body,
  linkLabel,
}: {
  label: string;
  title: string;
  body: string;
  linkLabel: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <SectionLabel label={label} index={1} />
      <h1 className="text-headline font-medium text-balance">
        {title} <span className="text-text-secondary">{body}</span>
      </h1>
      <Link href="/sign-in" className="text-body font-medium underline-offset-4 hover:underline">
        {linkLabel}
      </Link>
    </div>
  );
}

export default async function InvitePage({ params, searchParams }: PageProps<"/invite/[token]">) {
  const { t } = await getI18n();
  const { token } = await params;
  const { mode } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("get_invitation", { invite_token: token });
  const invite = data?.[0];

  if (!invite) {
    return (
      <Message
        label={t("invite.label")}
        title={t("invite.notFoundTitle")}
        body={t("invite.notFoundBody")}
        linkLabel={t("auth.signInLink")}
      />
    );
  }
  if (invite.status === "expired") {
    return (
      <Message
        label={t("invite.label")}
        title={t("invite.expiredTitle")}
        body={t("invite.expiredBody")}
        linkLabel={t("auth.signInLink")}
      />
    );
  }

  const user = await getCurrentUser();
  const context = {
    token,
    email: invite.email,
    projectName: invite.project_name,
    inviterName: invite.invited_by_name,
  };

  if (user) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-6">
          <SectionLabel label={t("invite.label")} index={1} />
          <h1 className="text-headline font-medium text-balance">
            {t("invite.title")}{" "}
            <span className="text-text-secondary">
              {t("invite.subtitle", { inviter: context.inviterName, project: context.projectName })}
            </span>
          </h1>
        </div>
        <JoinProjectButton token={token} />
      </div>
    );
  }

  if (invite.status === "accepted") {
    return <AuthForm mode="sign-in" invite={context} hideSwitch />;
  }

  return <AuthForm mode={mode === "sign-in" ? "sign-in" : "sign-up"} invite={context} />;
}
