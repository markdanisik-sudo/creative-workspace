import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/features/auth/AuthForm";
import { isSignUpOpen } from "@/lib/auth";

export const metadata: Metadata = { title: "Přihlášení" };

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams;
  const open = await isSignUpOpen();
  // The very first visit: there is no account to sign in to yet.
  if (open) redirect("/sign-up");
  return (
    <AuthForm
      mode="sign-in"
      next={typeof next === "string" ? next : undefined}
      signUpOpen={false}
    />
  );
}
