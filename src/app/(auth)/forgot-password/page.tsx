import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/features/auth/PasswordForms";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.forgotLabel") };
}

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  const { email } = await searchParams;
  return <ForgotPasswordForm defaultEmail={typeof email === "string" ? email : undefined} />;
}
