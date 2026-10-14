import { InstallPrompt } from "@/components/app/InstallPrompt";
import { ToastProvider } from "@/components/ui/Toast";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <ToastProvider>
      {children}
      <InstallPrompt />
    </ToastProvider>
  );
}
