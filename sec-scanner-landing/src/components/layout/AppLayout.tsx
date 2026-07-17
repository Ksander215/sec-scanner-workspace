"use client";

import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppTopBar } from "./AppTopBar";
import { SearchModal } from "./SearchModal";
import { AppBreadcrumbs, type BreadcrumbItem } from "./AppBreadcrumbs";
import { usePathname } from "next/navigation";

function pathToBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (!pathname || pathname === "/" || pathname === "/app") return [];

  const segments = pathname.split("/").filter(Boolean);
  const nameMap: Record<string, string> = {
    app: "App",
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
    downloads: "Downloads",
    download: "Downloads",
    cloud: "Cloud",
    legal: "Legal",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
    blog: "Blog",
    changelog: "Changelog",
    examples: "Examples",
    settings: "Settings",
    workspace: "Workspace",
    assets: "Assets",
    pipelines: "Pipelines",
    history: "History",
    jobs: "Jobs",
    monitoring: "Monitoring",
    projects: "Projects",
    scans: "Scans",
    findings: "Findings",
    risks: "Risks",
    reports: "Reports",
  };

  // Skip "app" segment for breadcrumbs (it's always present)
  const filteredSegments = segments.filter((s) => s !== "app");

  return filteredSegments.map((seg, i) => ({
    label: nameMap[seg] || seg.charAt(0).toUpperCase() + seg.slice(1),
    href:
      i === filteredSegments.length - 1
        ? undefined
        : "/app/" + segments.slice(1, segments.indexOf(seg) + 1).join("/"),
  }));
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const breadcrumbs = pathToBreadcrumbs(pathname);

  return (
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
    </div>
  );
}
