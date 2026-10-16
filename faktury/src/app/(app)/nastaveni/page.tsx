import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BusinessForm } from "@/features/business/BusinessForm";
import { getBusiness } from "@/features/business/queries";
import { signOut, signOutEverywhere } from "@/features/auth/actions";
import { TwoFactorSettings } from "@/features/security/TwoFactorSettings";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Nastavení" };

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-5 rounded-xl bg-surface p-5 shadow-sm sm:p-7 lg:grid-cols-[260px_1fr]">
      <div className="flex flex-col gap-1">
        <h2 className="text-callout font-semibold">{title}</h2>
        {description ? <p className="text-body text-text-secondary">{description}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default async function SettingsPage({ searchParams }: PageProps<"/nastaveni">) {
  const { vitej } = await searchParams;
  const [user, business] = await Promise.all([requireUser(), getBusiness()]);
  const supabase = await createSupabaseServerClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp.find((item) => item.status === "verified") ?? null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-headline font-medium">Nastavení</h1>
      {vitej ? (
        <p className="rounded-xl bg-surface p-5 text-callout shadow-sm">
          Vítej! Začni svými fakturačními údaji (stačí IČO a „Načíst z ARES“), pak zapni dvoufázové
          ověření a nahraj faktury z iDokladu.
        </p>
      ) : null}
      <Section
        title="Fakturační údaje"
        description="Objeví se na každé nové faktuře. Starší faktury se nemění."
      >
        <BusinessForm business={business} />
      </Section>
      <Section title="Zabezpečení" description={`Přihlášen jako ${user.email ?? ""}`}>
        <div className="flex flex-col gap-6">
          <TwoFactorSettings enabledFactorId={factor?.id ?? null} />
          <div className="flex flex-wrap gap-2 border-t border-border pt-5">
            <form action={signOut}>
              <button
                type="submit"
                className="h-9 rounded-full bg-surface-muted px-4 text-body font-medium hover:bg-surface-pressed"
              >
                Odhlásit se
              </button>
            </form>
            <form action={signOutEverywhere}>
              <button
                type="submit"
                className="h-9 rounded-full px-4 text-body font-medium text-danger hover:bg-danger-surface"
              >
                Odhlásit na všech zařízeních
              </button>
            </form>
          </div>
        </div>
      </Section>
      <Section
        title="Aplikace"
        description="Faktury se instalují jako samostatná aplikace — bez App Storu."
      >
        <ul className="flex flex-col gap-3 text-body text-text-secondary">
          <li>
            <b className="text-text">Mac (Safari):</b> Soubor → Přidat do Docku. Aplikace se otevře
            ve vlastním okně a najdeš ji v Launchpadu.
          </li>
          <li>
            <b className="text-text">Mac / Windows (Chrome):</b> ikona instalace vpravo v adresním
            řádku → Instalovat.
          </li>
          <li>
            <b className="text-text">iPhone:</b> v Safari Sdílet → Přidat na plochu.
          </li>
        </ul>
      </Section>
      <Section title="Data" description="Pro účetní nebo zálohu.">
        {/* A file download (ZIP), not a page. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/faktury/export"
          className="inline-flex h-9 items-center rounded-full bg-surface-muted px-4 text-body font-medium hover:bg-surface-pressed"
        >
          Stáhnout všechny faktury (ISDOC v ZIPu)
        </a>
      </Section>
    </div>
  );
}
