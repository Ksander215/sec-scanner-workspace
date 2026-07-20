"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Briefcase,
  FolderKanban,
  Radar,
  Bug,
  ShieldAlert,
  Network,
  Route,
  FileBarChart,
  Store,
  FlaskConical,
  BookOpen,
  Users,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Shield,
  Activity,
  Database,
  GitBranch,
  Clock,
  Cpu,
  BarChart3,
  Cable,
  Key,
  Bell,
  Terminal,
  Server,
  Gauge,
} from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

interface SidebarSection {
  id: string;
  labelKey: string;
  icon: React.ElementType;
  href?: string;
  badge?: string;
  children?: { labelKey: string; href: string; icon: React.ElementType }[];
}

const sidebarSections: SidebarSection[] = [
  {
    id: "dashboard",
    labelKey: "sidebar.dashboard",
    icon: LayoutDashboard,
    href: "/app/dashboard",
  },
  {
    id: "projects",
    labelKey: "sidebar.projects",
    icon: FolderKanban,
    href: "/app/projects",
  },
  {
    id: "scans",
    labelKey: "sidebar.scan",
    icon: Radar,
    href: "/app/scans",
    badge: "5",
  },
  {
    id: "findings",
    labelKey: "sidebar.findings",
    icon: Bug,
    href: "/app/findings",
    badge: "12",
  },
  {
    id: "reports",
    labelKey: "sidebar.reports",
    icon: FileBarChart,
    href: "/app/reports",
  },
  {
    id: "marketplace",
    labelKey: "sidebar.catalog",
    icon: Store,
    href: "/app/marketplace",
  },
  {
    id: "integrations",
    labelKey: "sidebar.integrations",
    icon: Cable,
    href: "/app/integrations",
    children: [
      { labelKey: "sidebar.integrations.hub", href: "/app/integrations", icon: Cable },
      { labelKey: "sidebar.integrations.repositories", href: "/app/repositories", icon: GitBranch },
      { labelKey: "sidebar.integrations.ssh", href: "/app/integrations/ssh", icon: Terminal },
      { labelKey: "sidebar.integrations.apiKeys", href: "/app/api-keys", icon: Key },
      { labelKey: "sidebar.integrations.notifications", href: "/app/notifications", icon: Bell },
    ],
  },
  {
    id: "knowledge-graph",
    labelKey: "sidebar.infrastructure",
    icon: Network,
    href: "/app/demo/knowledge-graph",
  },
  {
    id: "attack-paths",
    labelKey: "sidebar.attackPaths",
    icon: Route,
    href: "/app/demo/attack-paths",
  },
  {
    id: "risks",
    labelKey: "sidebar.risks",
    icon: ShieldAlert,
    href: "/app/risks",
  },
  {
    id: "workspace",
    labelKey: "sidebar.workspace",
    icon: Briefcase,
    href: "/app/workspace",
    children: [
      { labelKey: "sidebar.workspace.overview", href: "/app/workspace", icon: Activity },
      { labelKey: "sidebar.workspace.assets", href: "/app/workspace/assets", icon: Database },
      { labelKey: "sidebar.workspace.stages", href: "/app/workspace/pipelines", icon: GitBranch },
      { labelKey: "sidebar.workspace.history", href: "/app/workspace/history", icon: Clock },
      { labelKey: "sidebar.workspace.jobs", href: "/app/workspace/jobs", icon: Cpu },
      { labelKey: "sidebar.workspace.monitoring", href: "/app/workspace/monitoring", icon: BarChart3 },
    ],
  },
  {
    id: "playground",
    labelKey: "sidebar.playground",
    icon: FlaskConical,
    href: "/app/playground",
  },
  {
    id: "documentation",
    labelKey: "sidebar.documentation",
    icon: BookOpen,
    href: "/app/docs",
  },
  {
    id: "community",
    labelKey: "sidebar.community",
    icon: Users,
    href: "/app/community",
  },
  {
    id: "platform-status",
    labelKey: "sidebar.platformStatus",
    icon: Gauge,
    href: "/app/platform-status",
  },
  {
    id: "settings",
    labelKey: "sidebar.settings",
    icon: Settings,
    href: "/app/settings",
  },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["workspace"]));
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/app/dashboard" && pathname === "/app/dashboard") return true;
    if (href === "/app/workspace" && pathname === "/app/workspace") return true;
    return pathname.startsWith(href) && href.length > 1 && href !== "/app";
  };

  const isSectionActive = (section: SidebarSection) => {
    if (section.href && isActive(section.href)) return true;
    if (section.children) {
      return section.children.some((child) => isActive(child.href));
    }
    return false;
  };

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sidebarContent = (
    <aside
      className={`flex flex-col h-full bg-surface border-r border-border transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo — SIP */}
      <div className="flex items-center h-14 px-3 border-b border-border shrink-0">
        <Link href="/" className="flex items-center gap-2.5 group min-w-0">
          <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-accent" />
            <div className="absolute inset-0 bg-accent/20 rounded-full blur-md group-hover:bg-accent/30 transition-colors" />
          </div>
          {!collapsed && (
            <div>
              <span className="font-bold text-base tracking-tight truncate block leading-tight text-accent">
                SIP
              </span>
              <span className="powered-by block leading-tight mt-0.5">Security Intelligence Platform</span>
            </div>
          )}
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {sidebarSections.map((section) => {
          const active = isSectionActive(section);
          const expanded = expandedSections.has(section.id);
          const hasChildren = section.children && section.children.length > 0;
          const label = t(section.labelKey);

          return (
            <div key={section.id}>
              <div
                className="relative"
                onMouseEnter={() => setHoveredItem(section.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {hasChildren ? (
                  <button
                    onClick={() => toggleSection(section.id)}
                    className={`flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-sm transition-all duration-200 ${
                      active
                        ? "bg-accent-muted text-accent"
                        : "text-muted-2 hover:text-foreground hover:bg-surface-2"
                    }`}
                  >
                    <section.icon className={`w-[18px] h-[18px] shrink-0 ${active ? "text-accent" : ""}`} />
                    {!collapsed && (
                      <>
                        <span className="truncate flex-1 text-left font-medium">{label}</span>
                        <motion.div
                          animate={{ rotate: expanded ? 0 : -90 }}
                          transition={{ duration: 0.15 }}
                        >
                          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted" />
                        </motion.div>
                      </>
                    )}
                  </button>
                ) : (
                  <Link
                    href={section.href!}
                    onClick={() => {
                      if (mobileOpen) onMobileClose();
                    }}
                    className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-all duration-200 ${
                      active
                        ? "bg-accent-muted text-accent"
                        : "text-muted-2 hover:text-foreground hover:bg-surface-2"
                    }`}
                  >
                    <section.icon className={`w-[18px] h-[18px] shrink-0 ${active ? "text-accent" : ""}`} />
                    {!collapsed && (
                      <span className="truncate flex-1 font-medium">{label}</span>
                    )}
                    {!collapsed && section.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent-muted text-accent border border-accent-border font-semibold">
                        {section.badge}
                      </span>
                    )}
                  </Link>
                )}

                {/* Tooltip when collapsed */}
                {collapsed && hoveredItem === section.id && (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 rounded-md bg-surface-2 border border-border text-xs text-foreground font-medium whitespace-nowrap z-50 shadow-lg">
                    {label}
                  </div>
                )}
              </div>

              {/* Sub-items */}
              {hasChildren && expanded && !collapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2"
                >
                  {section.children!.map((child) => {
                    const childActive = isActive(child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => {
                          if (mobileOpen) onMobileClose();
                        }}
                        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-all duration-200 ${
                          childActive
                            ? "bg-accent-muted text-accent"
                            : "text-muted-2 hover:text-foreground hover:bg-surface-2"
                        }`}
                      >
                        <child.icon className={`w-3.5 h-3.5 shrink-0 ${childActive ? "text-accent" : ""}`} />
                        <span className="font-medium">{t(child.labelKey)}</span>
                      </Link>
                    );
                  })}
                </motion.div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-border shrink-0">
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full py-2 rounded-lg text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className={`fixed left-0 top-0 bottom-0 z-40 transition-all duration-300 hidden md:block ${
          collapsed ? "w-16" : "w-60"
        }`}
      >
        {sidebarContent}
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden"
              onClick={onMobileClose}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 z-[70] w-72 md:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
