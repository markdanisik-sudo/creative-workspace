"use client";

import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface Enrollment {
  factorId: string;
  qr: string;
  secret: string;
}

/** Turn the authenticator-app second factor on or off. */
export function TwoFactorSettings({ enabledFactorId }: { enabledFactorId: string | null }) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const supabase = getSupabaseBrowserClient();

  const start = async () => {
    setPending(true);
    // Clear any half-finished setup first.
    const { data: factors } = await supabase.auth.mfa.listFactors();
    for (const factor of factors?.all ?? []) {
      if (factor.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `m.studio.lab ${new Date().toISOString().slice(0, 10)}`,
    });
    setPending(false);
    if (error || !data) return toast.show({ title: t("errors.generic"), tone: "error" });
    setEnrollment({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const confirm = async (event: FormEvent) => {
    event.preventDefault();
    if (!enrollment) return;
    setPending(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollment.factorId,
      code: code.replace(/\s/g, ""),
    });
    setPending(false);
    if (error) {
      setCode("");
      return toast.show({ title: t("security.wrongCode"), tone: "error" });
    }
    setEnrollment(null);
    toast.show({ title: t("security.enabled") });
    router.refresh();
  };

  const disable = async () => {
    if (!enabledFactorId) return;
    setPending(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: enabledFactorId });
    setPending(false);
    if (error) return toast.show({ title: t("security.needsCode"), tone: "error" });
    await supabase.auth.refreshSession();
    toast.show({ title: t("security.disabled") });
    router.refresh();
  };

  if (enabledFactorId) {
    return (
      <div className="flex flex-col gap-3">
        <p className="flex items-center gap-2 text-callout font-semibold text-[#30a46c]">
          <ShieldCheck size={18} aria-hidden="true" />
          {t("security.on")}
        </p>
        <p className="text-body text-text-secondary">{t("security.onBody")}</p>
        <div>
          <Button variant="secondary" onClick={disable} loading={pending}>
            {t("security.turnOff")}
          </Button>
        </div>
      </div>
    );
  }

  if (enrollment) {
    return (
      <form onSubmit={confirm} className="flex flex-col gap-4">
        <p className="text-body text-text-secondary">{t("security.scan")}</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- QR as a data URI from Supabase */}
        <img
          src={enrollment.qr}
          alt=""
          width={180}
          height={180}
          className="size-[180px] rounded-[14px] bg-white p-2"
        />
        <p className="text-caption text-text-tertiary">
          {t("security.manual")}{" "}
          <span className="font-mono text-text select-all">{enrollment.secret}</span>
        </p>
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/[^\d\s]/g, "").slice(0, 7))}
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label={t("security.code")}
          placeholder="000 000"
          className="h-12 w-48 rounded-[12px] bg-surface-muted text-center font-mono text-[22px] tracking-[0.25em] outline-none focus-visible:shadow-[0_0_0_2px_var(--text)]"
        />
        <div className="flex gap-2">
          <Button
            type="submit"
            variant="primary"
            loading={pending}
            disabled={code.replace(/\s/g, "").length !== 6}
          >
            {t("security.confirm")}
          </Button>
          <Button variant="ghost" onClick={() => setEnrollment(null)}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-body text-text-secondary">{t("security.offBody")}</p>
      <div>
        <Button variant="primary" onClick={start} loading={pending}>
          <ShieldCheck size={16} aria-hidden="true" />
          {t("security.turnOn")}
        </Button>
      </div>
    </div>
  );
}
