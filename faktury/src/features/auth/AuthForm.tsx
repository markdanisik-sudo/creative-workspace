"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Input";
import { signIn, signUp, type AuthFormState } from "./actions";

export function AuthForm({
  mode,
  next,
  signUpOpen,
}: {
  mode: "sign-in" | "sign-up";
  next?: string;
  signUpOpen: boolean;
}) {
  const isSignUp = mode === "sign-up";
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    isSignUp ? signUp : signIn,
    {},
  );

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <h1 className="text-headline font-medium">{isSignUp ? "Založ si účet" : "Přihlášení"}</h1>
        <p className="text-callout text-text-secondary">
          {isSignUp
            ? "Účet je jen jeden — tvůj. Po založení se už nikdo další zaregistrovat nemůže."
            : "Tvoje faktury, přehled příjmů a ISDOC."}
        </p>
      </div>
      <form action={action} className="flex flex-col gap-4" noValidate>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <TextField
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          defaultValue={state.email}
        />
        <TextField
          label="Heslo"
          name="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          minLength={isSignUp ? 10 : undefined}
        />
        {state.error ? (
          <p role="alert" className="text-body text-danger">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" variant="primary" size="lg" loading={pending} className="mt-2">
          {isSignUp ? "Založit účet" : "Přihlásit se"}
        </Button>
      </form>
      {signUpOpen ? (
        <p className="text-body text-text-secondary">
          {isSignUp ? "Účet už máš? " : "Ještě nemáš účet? "}
          <Link
            href={isSignUp ? "/sign-in" : "/sign-up"}
            className="font-medium text-text underline-offset-4 hover:underline"
          >
            {isSignUp ? "Přihlas se" : "Založ si ho"}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
