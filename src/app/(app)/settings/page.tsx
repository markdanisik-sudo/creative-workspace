import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app/AppHeader";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/features/auth/actions";
import { ProfileForm } from "@/features/auth/ProfileForm";
import { requireViewer } from "@/features/auth/session";

export const metadata: Metadata = { title: "Settings" };

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-t border-border py-8 sm:grid-cols-[200px_1fr]">
      <h2 className="text-callout font-semibold">{title}</h2>
      <div className="max-w-[400px]">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const viewer = await requireViewer();
  return (
    <div className="min-h-dvh">
      <AppHeader viewer={viewer} />
      <main className="mx-auto max-w-[880px] px-4 pt-6 pb-24 sm:px-8">
        <Link
          href="/projects"
          className="-ml-1.5 inline-flex items-center gap-0.5 rounded-sm py-1 pr-2 text-body text-text-secondary hover:text-text"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Projects
        </Link>
        <h1 className="mt-4 mb-8 text-display font-semibold">Settings</h1>
        <SettingsSection title="Profile">
          <ProfileForm displayName={viewer.displayName} email={viewer.email} />
        </SettingsSection>
        <SettingsSection title="Session">
          <form action={signOut}>
            <Button type="submit">Sign out</Button>
          </form>
        </SettingsSection>
      </main>
    </div>
  );
}
