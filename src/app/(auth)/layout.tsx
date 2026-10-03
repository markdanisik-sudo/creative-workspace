import { Wordmark } from "@/components/brand/Wordmark";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-6 py-5 sm:px-8">
        <Wordmark href="/" />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-24">
        <div className="w-full max-w-[360px] animate-rise-in">{children}</div>
      </main>
    </div>
  );
}
