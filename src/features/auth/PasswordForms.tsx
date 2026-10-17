"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Input";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useI18n } from "@/lib/i18n/client";
import { requestPasswordReset, updatePassword, type PasswordFormState } from "./actions";

function Header({ label, title, subtitle }: { label: string; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-6">
      <SectionLabel label={label} index={1} />
      <h1 className="text-headline font-medium text-balance">
        {title} <span className="text-text-secondary">{subtitle}</span>
      </h1>
    </div>
  );
}

/** "Forgot your password?": asks for the email and sends a reset link. */
export function ForgotPasswordForm({ defaultEmail }: { defaultEmail?: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<PasswordFormState, FormData>(
    requestPasswordReset,
    { email: defaultEmail },
  );

  return (
    <div className="flex flex-col gap-8">
      <Header
        label={t("auth.forgotLabel")}
        title={t("auth.forgotTitle")}
        subtitle={t("auth.forgotSubtitle")}
      />
      {state.sentTo ? (
        <p
          role="status"
          className="rounded-lg bg-surface-muted px-4 py-3 text-body text-text-secondary"
        >
          {t("auth.forgotSent", { email: state.sentTo })}
        </p>
      ) : (
        <form action={action} className="flex flex-col gap-4" noValidate>
          <TextField
            label={t("auth.email")}
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            defaultValue={state.email}
            error={state.error}
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={pending}
            className="mt-2 w-full"
          >
            {t("auth.forgotButton")}
          </Button>
        </form>
      )}
      <p className="text-center text-body">
        <Link href="/sign-in" className="font-medium text-text underline-offset-4 hover:underline">
          {t("auth.backToSignIn")}
        </Link>
      </p>
    </div>
  );
}

/** Sets a new password (after the email link, or from Settings). */
export function NewPasswordForm({ minLength }: { minLength: number }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<PasswordFormState, FormData>(updatePassword, {});

  return (
    <div className="flex flex-col gap-8">
      <Header
        label={t("auth.resetLabel")}
        title={t("auth.resetTitle")}
        subtitle={t("auth.resetSubtitle", { min: minLength })}
      />
      <form action={action} className="flex flex-col gap-4" noValidate>
        <TextField
          label={t("auth.newPassword")}
          name="password"
          type="password"
          autoComplete="new-password"
          required
          autoFocus
          minLength={minLength}
        />
        <TextField
          label={t("auth.confirmPassword")}
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={minLength}
        />
        {state.error ? (
          <p role="alert" className="text-body text-danger">
            {state.error}
          </p>
        ) : null}
        <Button type="submit" variant="primary" size="lg" loading={pending} className="mt-2 w-full">
          {t("auth.resetButton")}
        </Button>
      </form>
    </div>
  );
}
