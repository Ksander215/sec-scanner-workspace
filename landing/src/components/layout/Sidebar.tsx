"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Layers,
  Play,
  FlaskConical,
  Store,
  BookOpen,
  Users,
  Download,
  Cloud,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";

interface SidebarItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string;
}

const sidebarItems: SidebarItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", badge: "New" },
  { icon: Layers, label: "Platform", href: "/platform" },
  { icon: Play, label: "Demo", href: "/demo" },
  { icon: FlaskConical, label: "Playground", href: "/playground" },
  { icon: Store, label: "Marketplace", href: "/marketplace" },
  { icon: BookOpen, label: "Documentation", href: "/docs" },
  { icon: Users, label: "Community", href: "/community" },
  { icon: Download, label: "Downloads", href: "/download" },
  { icon: Cloud, label: "Cloud", href: "/cloud" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const isActive = (href: string) => {
    if (href === "/dashboard" && pathname === "/dashboard") return true;
    if (href === "/playground" && pathname?.startsWith("/playground")) return true;
    return pathname?.startsWith(href) && href !== "/" && href.length > 1;
  };

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-surface border-r border-border transition-all duration-300 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-3 border-b border-border shrink-0">
        <Link href="/" className="flex items-center gap-2.5 group min-w-0">
          <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-accent" />
            <div className="absolute inset-0 bg-accent/20 rounded-full blur-md group-hover:bg-accent/30 transition-colors" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-base tracking-tight truncate">
              <span className="text-foreground">sec</span>
              <span className="text-accent">‑scanner</span>
            </span>
          )}
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {sidebarItems.map((item) => {
          const active = isActive(item.href);
          return (
            <div
              key={item.href}
              className="relative"
              onMouseEnter={() => setHoveredItem(item.href)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-all duration-200 group relative ${
                  active
                    ? "bg-accent-muted text-accent"
                    : "text-muted-2 hover:text-foreground hover:bg-surface-2"
                }`}
              >
                <item.icon className={`w-[18px] h-[18px] shrink-0 ${active ? "text-accent" : ""}`} />
                {!collapsed && (
                  <span className="truncate flex-1 font-medium">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent-muted text-accent border border-accent-border">
                    {item.badge}
                  </span>
                )}
              </Link>

              {/* Tooltip when collapsed */}
              {collapsed && hoveredItem === item.href && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 rounded-md bg-surface-2 border border-border text-xs text-foreground font-medium whitespace-nowrap z-50 shadow-lg">
                  {item.label}
                </div>
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
}
