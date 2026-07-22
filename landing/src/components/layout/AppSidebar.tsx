"use client";

import { useState, useEffect } from "react";
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
  ShieldCheck,
  TrendingUp,
  Brain,
  Sparkles,
} from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

interface SidebarSection {
  id: string;
  labelKey: string;
  icon: React.ElementType;
  href?: string;
  badge?: string;
  audience?: "user" | "founder"; // INT-050: разделение пользовательского и фаундерского интерфейса
  children?: { labelKey: string; href: string; icon: React.ElementType }[];
}

const sidebarSections: SidebarSection[] = [
  // ─── INT-050 BLOCK 2: USER WORKSPACE (простой коммерческий SaaS) ──────
  {
    id: "command-center",
    labelKey: "sidebar.commandCenter",
    icon: Activity,
    href: "/app/command-center",
    audience: "user",
  },
  {
    id: "projects",
    labelKey: "sidebar.projects",
    icon: FolderKanban,
    href: "/app/projects",
    audience: "user",
  },
  {
    id: "scans",
    labelKey: "sidebar.scan",
    icon: Radar,
    href: "/app/scans",
    badge: "5",
    audience: "user",
  },
  {
    id: "findings",
    labelKey: "sidebar.findings",
    icon: Bug,
    href: "/app/findings",
    badge: "12",
    audience: "user",
  },
  {
    id: "reports",
    labelKey: "sidebar.reports",
    icon: FileBarChart,
    href: "/app/reports",
    audience: "user",
  },
  {
    id: "marketplace",
    labelKey: "sidebar.catalog",
    icon: Store,
    href: "/app/marketplace",
    audience: "user",
  },
  {
    id: "integrations",
    labelKey: "sidebar.integrations",
    icon: Cable,
    href: "/app/integrations",
    audience: "user",
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
    audience: "user",
  },
  {
    id: "attack-paths",
    labelKey: "sidebar.attackPaths",
    icon: Route,
    href: "/app/demo/attack-paths",
    audience: "user",
  },
  {
    id: "risks",
    labelKey: "sidebar.risks",
    icon: ShieldAlert,
    href: "/app/risks",
    audience: "user",
  },
  {
    id: "workspace",
    labelKey: "sidebar.workspace",
    icon: Briefcase,
    href: "/app/workspace",
    audience: "user",
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
    audience: "user",
  },
  {
    id: "documentation",
    labelKey: "sidebar.documentation",
    icon: BookOpen,
    href: "/app/docs",
    audience: "user",
  },
  {
    id: "community",
    labelKey: "sidebar.community",
    icon: Users,
    href: "/app/community",
    audience: "user",
  },
  {
    id: "settings",
    labelKey: "sidebar.settings",
    icon: Settings,
    href: "/app/settings",
    audience: "user",
  },

  // ─── INT-050 BLOCK 5: FOUNDER CONSOLE (инженерный контроль) ───────────
  {
    id: "founder-architecture",
    labelKey: "sidebar.architecture",
    icon: Network,
    href: "/app/architecture",
    audience: "founder",
  },
  {
    id: "founder-sip",
    labelKey: "sidebar.sipCenter",
    icon: ShieldCheck,
    href: "/app/architecture/sip",
    audience: "founder",
  },
  {
    id: "founder-ais",
    labelKey: "sidebar.aisCenter",
    icon: Sparkles,
    href: "/app/architecture/ais",
    audience: "founder",
  },
  {
    id: "founder-cto",
    labelKey: "sidebar.ctoCenter",
    icon: Brain,
    href: "/app/architecture/cto",
    audience: "founder",
  },
  {
    id: "founder-aio",
    labelKey: "sidebar.aioCenter",
    icon: Cpu,
    href: "/app/architecture/aio",
    audience: "founder",
  },
  {
    id: "founder-evolution",
    labelKey: "sidebar.evolution",
    icon: GitBranch,
    href: "/app/evolution",
    audience: "founder",
  },
  {
    id: "founder-system-status",
    labelKey: "sidebar.systemStatus",
    icon: Gauge,
    href: "/app/system-status",
    audience: "founder",
  },
  {
    id: "founder-evidence",
    labelKey: "sidebar.evidence",
    icon: ShieldCheck,
    href: "/app/evidence",
    audience: "founder",
  },
  {
    id: "founder-product-readiness",
    labelKey: "sidebar.productReadiness",
    icon: TrendingUp,
    href: "/app/product-readiness",
    audience: "founder",
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
  // INT-050: User/Founder mode toggle. Default = "user" (простой коммерческий SaaS).
  // Founder mode открывает инженерный доступ ко всем 4 центрам и реестрам.
  const [audience, setAudience] = useState<"user" | "founder">(() => {
    if (typeof window === "undefined") return "user";
    const saved = window.localStorage.getItem("sip-audience");
    return saved === "founder" ? "founder" : "user";
  });

  // Авто-переключение на founder mode если пользователь на founder-странице
  useEffect(() => {
    if (!pathname) return;
    const founderRoutes = ["/app/architecture", "/app/evolution", "/app/evidence", "/app/product-readiness", "/app/system-status"];
    if (founderRoutes.some((r) => pathname.startsWith(r)) && audience !== "founder") {
      setAudience("founder");
      if (typeof window !== "undefined") {
        window.localStorage.setItem("sip-audience", "founder");
      }
    }
  }, [pathname, audience]);

  const toggleAudience = () => {
    const next = audience === "user" ? "founder" : "user";
    setAudience(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sip-audience", next);
    }
  };
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

      {/* INT-050: Audience toggle (User / Founder) */}
      {!collapsed && (
        <div className="px-3 py-2 border-b border-border shrink-0">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-2 border border-border">
            <button
              onClick={() => audience !== "user" && toggleAudience()}
              className={`flex-1 px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                audience === "user" ? "bg-accent text-white" : "text-muted-2 hover:text-foreground"
              }`}
            >
              {t("sidebar.audience.user")}
            </button>
            <button
              onClick={() => audience !== "founder" && toggleAudience()}
              className={`flex-1 px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${
                audience === "founder" ? "bg-violet-600 text-white" : "text-muted-2 hover:text-foreground"
              }`}
            >
              {t("sidebar.audience.founder")}
            </button>
          </div>
        </div>
      )}
      {collapsed && (
        <div className="px-2 py-2 border-b border-border shrink-0 flex justify-center">
          <button
            onClick={toggleAudience}
            className={`w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold ${
              audience === "founder" ? "bg-violet-600 text-white" : "bg-accent text-white"
            }`}
            title={audience === "founder" ? t("sidebar.audience.founder") : t("sidebar.audience.user")}
          >
            {audience === "founder" ? "F" : "U"}
          </button>
        </div>
      )}

      {/* Audience label */}
      {!collapsed && (
        <div className="px-3 pt-2 pb-1">
          <div className="text-[9px] font-bold tracking-[0.15em] text-muted-2 uppercase">
            {audience === "user" ? t("sidebar.userWorkspace") : t("sidebar.founderConsole")}
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {sidebarSections
          .filter((section) => section.audience === audience || (!section.audience && audience === "user"))
          .map((section) => {
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
