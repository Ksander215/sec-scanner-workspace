"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppTopBar } from "./AppTopBar";
import { SearchModal } from "./SearchModal";
import { AppBreadcrumbs, type BreadcrumbItem } from "./AppBreadcrumbs";
import { AISAssistant } from "@/components/ui/AISAssistant";
import { SoloNotificationProvider } from "@/components/ui/SoloNotification";
import { SmartScrollNavigator } from "@/components/ui/SmartScrollNavigator";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n-context";

// Map URL segments to i18n keys for translatable breadcrumbs
const SEGMENT_I18N_KEYS: Record<string, string> = {
  app: "sidebar.dashboard",
  dashboard: "sidebar.dashboard",
  demo: "nav.demo",
  "knowledge-graph": "sidebar.infrastructure",
  "attack-paths": "sidebar.attackPaths",
  playground: "sidebar.playground",
  marketplace: "sidebar.catalog",
  plugins: "sidebar.catalog",
  integrations: "sidebar.integrations",
  repositories: "sidebar.integrations.repositories",
  ssh: "sidebar.integrations.ssh",
  "api-keys": "sidebar.integrations.apiKeys",
  notifications: "sidebar.integrations.notifications",
  docs: "sidebar.documentation",
  community: "sidebar.community",
  contributing: "sidebar.community",
  platform: "nav.platform",
  "platform-status": "sidebar.platformStatus",
  pricing: "nav.pricing",
  settings: "sidebar.settings",
  workspace: "sidebar.workspace",
  assets: "sidebar.workspace.assets",
  pipelines: "sidebar.workspace.pipelines",
  history: "sidebar.workspace.history",
  jobs: "sidebar.workspace.jobs",
  monitoring: "sidebar.workspace.monitoring",
  projects: "sidebar.projects",
  scans: "sidebar.scan",
  findings: "sidebar.findings",
  risks: "sidebar.risks",
  reports: "sidebar.reports",
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useI18n();

  const breadcrumbs = useMemo<BreadcrumbItem[]>(() => {
    if (!pathname || pathname === "/" || pathname === "/app") return [];

    const segments = pathname.split("/").filter(Boolean);
    // Skip "app" segment for breadcrumbs (it's always present)
    const filteredSegments = segments.filter((s) => s !== "app");

    return filteredSegments.map((seg, i) => {
      const i18nKey = SEGMENT_I18N_KEYS[seg];
      const label = i18nKey ? t(i18nKey) : seg.charAt(0).toUpperCase() + seg.slice(1);
      return {
        label,
        href:
          i === filteredSegments.length - 1
            ? undefined
            : "/app/" + segments.slice(1, segments.indexOf(seg) + 1).join("/"),
      };
    });
  }, [pathname, t]);

  const handleOpenAssistant = useCallback(() => {
    setAssistantOpen(true);
  }, []);

  // Keyboard shortcut: Ctrl+Shift+A to open AIS
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "A") {
        e.preventDefault();
        setAssistantOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <SoloNotificationProvider>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />

        {/* Main area */}
        <div
          className={`flex-1 flex flex-col transition-all duration-300 ${
            sidebarCollapsed ? "md:ml-16" : "md:ml-60"
          }`}
        >
          {/* Top bar */}
          <AppTopBar
            sidebarCollapsed={sidebarCollapsed}
            onSearchOpen={() => setSearchOpen(true)}
            onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          />

          {/* Content */}
          <main className="flex-1 mt-14">
            {/* Breadcrumbs */}
            {breadcrumbs.length > 0 && (
              <div className="px-6 py-3 border-b border-border bg-surface/30">
                <AppBreadcrumbs items={breadcrumbs} />
              </div>
            )}

            {/* Page content */}
            <div className="flex-1 p-6">{children}</div>
          </main>
        </div>

        {/* Search modal */}
        <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

        {/* AIS — Intelligent Assistant (INT-036) */}
        <AISAssistant externalOpen={assistantOpen} onExternalClose={() => setAssistantOpen(false)} />

        {/* Smart Scroll Navigator — INT-033 */}
        <SmartScrollNavigator onOpenAssistant={handleOpenAssistant} />
      </div>
    </SoloNotificationProvider>
  );
}
