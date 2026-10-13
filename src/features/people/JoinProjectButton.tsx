"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/client";
import { acceptInvitation } from "./actions";

export function JoinProjectButton({ token }: { token: string }) {
  const { t } = useI18n();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="primary"
        size="lg"
        loading={pending}
        className="w-full"
        onClick={() =>
          startTransition(async () => {
            const result = await acceptInvitation(token);
            if (result && !result.ok) setError(result.error);
          })
        }
      >
        {t("invite.joinButton")}
      </Button>
      {error ? (
        <p role="alert" className="text-body text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
