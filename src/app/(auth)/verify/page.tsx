import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TwoFactorChallenge } from "@/features/security/TwoFactorChallenge";
import { getI18n } from "@/lib/i18n/server";
import { getCurrentUser } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("security.verifyTitle") };
}

/** Only same-origin relative paths. */
function safeNext(value: string | string[] | undefined) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/projects";
}

export default async function VerifyPage({ searchParams }: PageProps<"/verify">) {
  if (!(await getCurrentUser())) redirect("/sign-in");
  const { next } = await searchParams;
  return <TwoFactorChallenge next={safeNext(next)} />;
}
