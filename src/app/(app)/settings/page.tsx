import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app/AppHeader";
import { LanguageSwitch } from "@/components/app/LanguageSwitch";
import { Button } from "@/components/ui/Button";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { signOut } from "@/features/auth/actions";
import { ProfileForm } from "@/features/auth/ProfileForm";
import { requireViewer } from "@/features/auth/session";
import { listServices } from "@/features/hub/queries";
import { getStudioBilling } from "@/features/budget/queries";
import { StudioBillingForm } from "@/features/settings/StudioBillingForm";
import { AppearancePicker } from "@/features/settings/AppearancePicker";
import { ServicesManager } from "@/features/settings/ServicesManager";
import { getI18n } from "@/lib/i18n/server";
import { getThemePreference } from "@/lib/preferences/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("settings.title") };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 border-t border-border-strong py-6 sm:grid-cols-[200px_1fr] sm:gap-6">
      <h3 className="text-callout font-semibold">{label}</h3>
      <div className="max-w-[480px]">{children}</div>
    </div>
  );
}

export default async function SettingsPage() {
  const [viewer, { t }, theme] = await Promise.all([
    requireViewer(),
    getI18n(),
    getThemePreference(),
  ]);
  const [services, billing] = viewer.isStudio
    ? await Promise.all([listServices({ activeOnly: false }), getStudioBilling()])
    : [[], null];
  let index = 0;

  return (
    <div className="min-h-dvh">
      <AppHeader viewer={viewer} />
      <main className="mx-auto max-w-[960px] px-4 pt-6 pb-24 sm:px-8">
        <Link
          href="/projects"
          className="-ml-1.5 inline-flex items-center gap-0.5 rounded-sm py-1 pr-2 text-body text-text-secondary hover:text-text"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          {t("nav.projects")}
        </Link>
        <h1 className="mt-4 mb-12 text-display font-medium tracking-tight sm:text-hero">
          {t("settings.title")}
        </h1>

        <section className="mb-14 flex flex-col gap-4">
          <SectionLabel label={t("settings.profile")} index={++index} />
          <Row label={t("nav.account")}>
            <ProfileForm displayName={viewer.displayName} email={viewer.email} />
          </Row>
        </section>

        <section className="mb-14 flex flex-col gap-4">
          <SectionLabel label={t("settings.preferences")} index={++index} />
          <Row label={t("settings.language")}>
            <LanguageSwitch />
          </Row>
          <Row label={t("settings.appearance")}>
            <AppearancePicker initial={theme} />
          </Row>
        </section>

        {billing ? (
          <section className="mb-14 flex flex-col gap-4">
            <SectionLabel label={t("billing.title")} index={++index} />
            <Row label={t("billing.title")}>
              <StudioBillingForm billing={billing} />
            </Row>
          </section>
        ) : null}

        {viewer.isStudio ? (
          <section className="mb-14 flex flex-col gap-4">
            <SectionLabel label={t("services.title")} index={++index} />
            <Row label={t("services.title")}>
              <ServicesManager services={services} />
            </Row>
          </section>
        ) : null}

        <section className="flex flex-col gap-4">
          <SectionLabel label={t("settings.session")} index={++index} />
          <Row label={viewer.email}>
            <form action={signOut}>
              <Button type="submit">{t("nav.signOut")}</Button>
            </form>
          </Row>
        </section>
      </main>
    </div>
  );
}
