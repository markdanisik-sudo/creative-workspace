"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Input";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useI18n } from "@/lib/i18n/client";
import { signIn, signUp, type AuthFormState } from "./actions";

export interface InviteContext {
  token: string;
  email: string;
  projectName: string;
  inviterName: string;
}

interface AuthFormProps {
  mode: "sign-in" | "sign-up";
  next?: string;
  defaultEmail?: string;
  notice?: string;
  invite?: InviteContext;
  /** Hide the link to the other mode (e.g. sign-up is invite-only). */
  hideSwitch?: boolean;
}

export function AuthForm({ mode, next, defaultEmail, notice, invite, hideSwitch }: AuthFormProps) {
  const { t } = useI18n();
  const isSignUp = mode === "sign-up";
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    isSignUp ? signUp : signIn,
    { email: invite?.email ?? defaultEmail },
  );

  const inviteQuery = invite ? `/invite/${invite.token}?mode=` : null;
  const switchHref = inviteQuery
    ? `${inviteQuery}${isSignUp ? "sign-in" : "sign-up"}`
    : isSignUp
      ? "/sign-in"
      : "/sign-up";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        <SectionLabel
          label={
            invite ? t("invite.label") : isSignUp ? t("auth.signUpLabel") : t("auth.signInLabel")
          }
          index={1}
        />
        <h1 className="text-headline font-medium text-balance">
          {invite ? (
            <>
              {t("invite.title")}{" "}
              <span className="text-text-secondary">
                {t("invite.subtitle", { inviter: invite.inviterName, project: invite.projectName })}
              </span>
            </>
          ) : (
            <>
              {isSignUp ? t("auth.signUpTitle") : t("auth.signInTitle")}{" "}
              <span className="text-text-secondary">
                {isSignUp ? t("auth.signUpSubtitle") : t("auth.signInSubtitle")}
              </span>
            </>
          )}
        </h1>
      </div>

      {notice ? (
        <p
          role="status"
          className="rounded-lg bg-surface-muted px-4 py-3 text-body text-text-secondary"
        >
          {notice}
        </p>
      ) : null}

      <form action={action} className="flex flex-col gap-4" noValidate>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {invite ? <input type="hidden" name="invite" value={invite.token} /> : null}
        {isSignUp ? (
          <TextField
            label={t("auth.name")}
            name="name"
            autoComplete="name"
            placeholder={t("auth.optional")}
            defaultValue={state.name}
            error={state.fieldErrors?.name}
          />
        ) : null}
        <TextField
          label={t("auth.email")}
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus={!invite}
          readOnly={Boolean(invite)}
          defaultValue={state.email}
          error={state.fieldErrors?.email}
        />
        <TextField
          label={invite && isSignUp ? t("invite.createPassword") : t("auth.password")}
          name="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          autoFocus={Boolean(invite)}
          minLength={isSignUp ? 8 : undefined}
          error={state.fieldErrors?.password}
        />
        {!isSignUp ? (
          <Link
            href="/forgot-password"
            className="-mt-1 self-end text-caption text-text-secondary underline-offset-4 hover:text-text hover:underline"
          >
            {t("auth.forgotLink")}
          </Link>
        ) : null}

        {state.error ? (
          <p role="alert" className="text-body text-danger">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" variant="primary" size="lg" loading={pending} className="mt-2 w-full">
          {invite
            ? t("invite.joinButton")
            : isSignUp
              ? t("auth.signUpButton")
              : t("auth.signInButton")}
        </Button>
      </form>

      {hideSwitch ? null : (
        <p className="text-center text-body text-text-secondary">
          {invite
            ? isSignUp
              ? t("invite.haveAccount")
              : t("invite.newAccount")
            : isSignUp
              ? t("auth.haveAccount")
              : t("auth.newHere")}{" "}
          <Link
            href={switchHref}
            className="font-medium text-text underline-offset-4 hover:underline"
          >
            {invite
              ? isSignUp
                ? t("invite.signInToJoin")
                : t("invite.createAccountToJoin")
              : isSignUp
                ? t("auth.signInLink")
                : t("auth.createAccountLink")}
          </Link>
        </p>
      )}
    </div>
  );
}
