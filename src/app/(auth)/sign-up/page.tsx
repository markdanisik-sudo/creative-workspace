import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/AuthForm";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.signUpLabel") };
}

/** Open to everyone: each new account gets its own private workspace. */
export default function SignUpPage() {
  return <AuthForm mode="sign-up" />;
}
