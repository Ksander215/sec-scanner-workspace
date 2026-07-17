"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { SearchModal } from "./SearchModal";
import { Breadcrumbs, type BreadcrumbItem } from "./Breadcrumbs";
import { usePathname } from "next/navigation";

// Generate breadcrumbs from pathname
function pathToBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (!pathname || pathname === "/") return [];

  const segments = pathname.split("/").filter(Boolean);
  const nameMap: Record<string, string> = {
    dashboard: "Dashboard",
    demo: "Demo",
    "knowledge-graph": "Knowledge Graph",
    "attack-paths": "Attack Paths",
    playground: "Playground",
    marketplace: "Marketplace",
    plugins: "Plugins",
    rules: "Rules",
    connectors: "Connectors",
    templates: "Templates",
    dashboards: "Dashboards",
    integrations: "Integrations",
    themes: "Themes",
    "ai-prompts": "AI Prompts",
    docs: "Documentation",
    api: "API Reference",
    cli: "CLI",
    sdk: "SDK",
    architecture: "Architecture",
    deployment: "Deployment",
    security: "Security",
    compliance: "Compliance",
    "getting-started": "Getting Started",
    guides: "Guides",
    community: "Community",
    contributing: "Contributing",
    roadmap: "Roadmap",
    "feature-requests": "Feature Requests",
    platform: "Platform",
    capabilities: "Capabilities",
    pricing: "Pricing",
    download: "Downloads",
    cloud: "Cloud",
    legal: "Legal",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    blog: "Blog",
    changelog: "Changelog",
    examples: "Examples",
    settings: "Settings",
    app: "App",
  };

  return segments.map((seg, i) => ({
    label: nameMap[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
    href: i === segments.length - 1 ? undefined : "/" + segments.slice(0, i + 1).join("/"),
  }));
}

export function PortalLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const breadcrumbs = pathToBreadcrumbs(pathname);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? "ml-16" : "ml-56"
        }`}
      >
        {/* Top bar */}
        <TopBar
          sidebarCollapsed={sidebarCollapsed}
          onSearchOpen={() => setSearchOpen(true)}
        />

        {/* Content */}
        <main className="flex-1 mt-14">
          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div className="px-6 py-3 border-b border-border bg-surface/30">
              <Breadcrumbs items={breadcrumbs} />
            </div>
          )}

          {/* Page content */}
          <div className="flex-1">
            {children}
          </div>
        </main>
      </div>

      {/* Search modal */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
