"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Input";
import { signIn, signUp, type AuthFormState } from "./actions";

interface AuthFormProps {
  mode: "sign-in" | "sign-up";
  next?: string;
  defaultEmail?: string;
  notice?: string;
}

export function AuthForm({ mode, next, defaultEmail, notice }: AuthFormProps) {
  const isSignUp = mode === "sign-up";
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    isSignUp ? signUp : signIn,
    { email: defaultEmail },
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-headline font-semibold">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="text-callout text-text-secondary">
          {isSignUp
            ? "Start collecting ideas in seconds."
            : "Sign in to continue to your projects."}
        </p>
      </div>

      {notice ? (
        <p
          role="status"
          className="rounded-md bg-surface-muted px-4 py-3 text-body text-text-secondary"
        >
          {notice}
        </p>
      ) : null}

      <form action={action} className="flex flex-col gap-4" noValidate>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {isSignUp ? (
          <TextField
            label="Name"
            name="name"
            autoComplete="name"
            placeholder="Optional"
            defaultValue={state.name}
            error={state.fieldErrors?.name}
          />
        ) : null}
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          defaultValue={state.email}
          error={state.fieldErrors?.email}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          minLength={isSignUp ? 8 : undefined}
          error={state.fieldErrors?.password}
        />

        {state.error ? (
          <p role="alert" className="text-body text-danger">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" variant="primary" size="lg" loading={pending} className="mt-2 w-full">
          {isSignUp ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-body text-text-secondary">
        {isSignUp ? "Already have an account? " : "New here? "}
        <Link
          href={isSignUp ? "/sign-in" : "/sign-up"}
          className="font-medium text-text underline-offset-4 hover:underline"
        >
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
