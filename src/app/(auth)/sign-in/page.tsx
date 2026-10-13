import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/AuthForm";
import { getI18n } from "@/lib/i18n/server";
import { devAutoSignInEnabled, lastDevSignInError } from "@/lib/supabase/dev-sign-in";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.signInLabel") };
}

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { t } = await getI18n();
  const params = await searchParams;
  const read = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : undefined;

  let notice: string | undefined;
  if (read("check-email")) notice = t("auth.checkEmail");
  if (read("link-expired")) notice = t("auth.linkExpired");

  // Local development: say why the automatic studio sign-in didn't happen.
  const devError = devAutoSignInEnabled() ? lastDevSignInError() : null;

  return (
    <>
      {devError ? (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-danger-surface p-3 font-mono text-caption text-danger"
        >
          Automatic sign-in failed — {devError}
        </p>
      ) : null}
      <AuthForm mode="sign-in" next={read("next")} defaultEmail={read("email")} notice={notice} />
    </>
  );
}
