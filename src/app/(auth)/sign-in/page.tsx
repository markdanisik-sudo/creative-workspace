import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/AuthForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const params = await searchParams;
  const read = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : undefined;

  let notice: string | undefined;
  if (read("check-email")) notice = "Check your inbox to confirm your email, then sign in.";
  if (read("link-expired")) notice = "That link has expired. Please sign in again.";

  return (
    <AuthForm mode="sign-in" next={read("next")} defaultEmail={read("email")} notice={notice} />
  );
}
