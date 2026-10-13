import type { Metadata } from "next";
import Link from "next/link";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { AuthForm } from "@/features/auth/AuthForm";
import { getI18n } from "@/lib/i18n/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.signUpLabel") };
}

/** Open only until the studio account exists; afterwards accounts come via invitations. */
export default async function SignUpPage() {
  const { t } = await getI18n();
  const supabase = await createSupabaseServerClient();
  const { data: studioExists } = await supabase.rpc("studio_is_set_up");

  if (studioExists) {
    return (
      <div className="flex flex-col gap-6">
        <SectionLabel label={t("auth.signUpLabel")} index={1} />
        <h1 className="text-headline font-medium text-balance">
          {t("auth.inviteOnlyTitle")}{" "}
          <span className="text-text-secondary">{t("auth.inviteOnlyBody")}</span>
        </h1>
        <Link href="/sign-in" className="text-body font-medium underline-offset-4 hover:underline">
          {t("auth.signInLink")}
        </Link>
      </div>
    );
  }

  return <AuthForm mode="sign-up" />;
}
