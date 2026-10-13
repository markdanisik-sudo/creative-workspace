import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/AuthForm";
import { getI18n } from "@/lib/i18n/server";

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

  return (
    <AuthForm mode="sign-in" next={read("next")} defaultEmail={read("email")} notice={notice} />
  );
}
