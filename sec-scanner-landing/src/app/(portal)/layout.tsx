"use client";

import { I18nProvider } from "@/lib/i18n-context";
import { PortalLayout } from "@/components/layout/PortalLayout";

export default function PortalLayoutWrapper({
  children,
}: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <PortalLayout>{children}</PortalLayout>
    </I18nProvider>
  );
}
