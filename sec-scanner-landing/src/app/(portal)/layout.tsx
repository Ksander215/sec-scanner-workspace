"use client";

import { I18nProvider } from "@/lib/i18n-context";
import { Layout } from "@/components/layout/Layout";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <I18nProvider>
      <Layout>{children}</Layout>
    </I18nProvider>
  );
}
