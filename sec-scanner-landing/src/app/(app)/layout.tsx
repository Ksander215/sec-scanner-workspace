"use client";

import { I18nProvider } from "@/lib/i18n-context";
import { AppLayout } from "@/components/layout/AppLayout";

export default function AppLayoutWrapper({
  children,
}: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AppLayout>{children}</AppLayout>
    </I18nProvider>
  );
}
