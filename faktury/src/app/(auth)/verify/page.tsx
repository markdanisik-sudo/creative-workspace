import type { Metadata } from "next";
import { TwoFactorChallenge } from "@/features/security/TwoFactorChallenge";

export const metadata: Metadata = { title: "Ověření" };

export default async function VerifyPage({ searchParams }: PageProps<"/verify">) {
  const { next } = await searchParams;
  const target =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return <TwoFactorChallenge next={target} />;
}
