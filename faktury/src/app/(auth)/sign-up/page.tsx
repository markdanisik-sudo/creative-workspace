import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/features/auth/AuthForm";
import { isSignUpOpen } from "@/lib/auth";

export const metadata: Metadata = { title: "Založit účet" };

export default async function SignUpPage() {
  if (!(await isSignUpOpen())) redirect("/sign-in");
  return <AuthForm mode="sign-up" signUpOpen />;
}
