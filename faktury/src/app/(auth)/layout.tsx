import { Logo } from "@/components/app/Logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-12">
      <Logo />
      <main className="w-full max-w-[420px] rounded-xl bg-surface p-7 shadow-sm animate-rise-in sm:p-9">
        {children}
      </main>
    </div>
  );
}
