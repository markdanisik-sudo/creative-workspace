import type { Metadata } from "next";
import { NewPasswordForm } from "@/features/auth/PasswordForms";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auth.resetLabel") };
}

/** Reached from the reset email (signed in by its link) or from Settings. */
export default function ResetPasswordPage() {
  return <NewPasswordForm minLength={8} />;
}
