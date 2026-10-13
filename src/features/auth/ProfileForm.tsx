"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Input";
import { useI18n } from "@/lib/i18n/client";
import { updateProfile, type ProfileFormState } from "./profile-actions";

export function ProfileForm({ displayName, email }: { displayName: string; email: string }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(updateProfile, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <TextField
        label={t("settings.name")}
        name="displayName"
        defaultValue={displayName}
        maxLength={80}
        autoComplete="name"
      />
      <TextField label={t("settings.email")} value={email} readOnly disabled />
      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" loading={pending}>
          {t("common.save")}
        </Button>
        <p aria-live="polite" className="text-caption text-text-secondary">
          {state.saved ? t("common.saved") : null}
          {state.error ? <span className="text-danger">{state.error}</span> : null}
        </p>
      </div>
    </form>
  );
}
