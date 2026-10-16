import { Plus } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/app/Logo";
import { TabBar, TopNav } from "@/components/app/Nav";
import { ToastProvider } from "@/components/ui/Toast";
import { requireUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireUser();
  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-col pb-24 md:pb-12">
        <header className="sticky top-0 z-30 px-3 pt-[max(12px,env(safe-area-inset-top))] sm:px-6 print:hidden">
          <div className="mx-auto flex h-14 w-full max-w-[1180px] items-center justify-between gap-4 rounded-[14px] bg-surface/90 pr-2 pl-4 shadow-sm backdrop-blur-xl">
            <Logo />
            <TopNav />
            <Link
              href="/faktury/nova"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-body font-medium text-text-inverse transition-colors hover:bg-ink-hover"
            >
              <Plus size={16} aria-hidden="true" />
              <span>Nová faktura</span>
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 pt-8 sm:px-8">{children}</main>
        <TabBar />
      </div>
    </ToastProvider>
  );
}
