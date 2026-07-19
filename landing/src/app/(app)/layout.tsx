"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { ToastProvider } from "@/components/ui/Toast";

export default function AppLayoutWrapper({
  children,
}: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppLayout>{children}</AppLayout>
    </ToastProvider>
  );
}
