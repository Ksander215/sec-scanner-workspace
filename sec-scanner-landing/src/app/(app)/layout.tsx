"use client";

import { I18nProvider } from "@/lib/i18n-context";
import { AppLayout } from "@/components/layout/AppLayout";
import { ToastProvider } from "@/components/ui/Toast";

export default function AppLayoutWrapper({
  children,
}: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ToastProvider>
        <AppLayout>{children}</AppLayout>
      </ToastProvider>
    </I18nProvider>
  );
}
