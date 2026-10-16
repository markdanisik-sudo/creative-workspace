"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { signOut } from "@/features/auth/actions";

/** After the password: the 6-digit code from the authenticator app. */
export function TwoFactorChallenge({ next }: { next: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp.find((item) => item.status === "verified");
    if (!factor) {
      setPending(false);
      return setError("Něco se nepovedlo. Zkus to znovu.");
    }
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: factor.id,
      code: code.replace(/\s/g, ""),
    });
    setPending(false);
    if (verifyError) {
      setCode("");
      return setError("Kód nesedí. Zkus to znovu.");
    }
    router.replace(next);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-headline font-medium">{"Zadej kód"}</h1>
        <p className="text-callout text-text-secondary">
          {
            "Otevři aplikaci pro ověřování (Hesla na iPhonu/Macu, Google Authenticator…) a opiš šestimístný kód."
          }
        </p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/[^\d\s]/g, "").slice(0, 7))}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          aria-label={"Kód"}
          placeholder="000 000"
          className="h-14 rounded-[14px] bg-surface-muted text-center font-mono text-[28px] tracking-[0.3em] outline-none focus-visible:shadow-[0_0_0_2px_var(--text)]"
        />
        {error ? (
          <p role="alert" className="text-body text-danger">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={pending}
          disabled={code.replace(/\s/g, "").length !== 6}
        >
          {"Ověřit"}
        </Button>
      </form>
      <form action={signOut}>
        <button type="submit" className="text-caption text-text-secondary hover:text-text">
          {"Odhlásit se"}
        </button>
      </form>
    </div>
  );
}
