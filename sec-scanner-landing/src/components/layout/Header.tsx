"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ChevronDown,
  Search,
  ExternalLink,
  Globe,
} from "lucide-react";
import { GitHubIcon } from "@/components/ui/icons";
import { useI18n } from "@/lib/i18n-context";
import { localeNames } from "@/lib/i18n";
import { SearchModal } from "./SearchModal";
import { MobileNav } from "./MobileNav";

interface NavChild {
  label: string;
  href: string;
  description?: string;
}

interface NavItem {
  label: string;
  href?: string;
  children?: NavChild[];
}

const navItems: NavItem[] = [
  {
    label: "Product",
    children: [
      { label: "Platform", href: "/platform", description: "Platform overview" },
      { label: "Capabilities", href: "/capabilities", description: "Core features" },
      { label: "Architecture", href: "/architecture", description: "Interactive architecture" },
      { label: "Demo", href: "/demo", description: "Live demo workspace" },
      { label: "Dashboard", href: "/dashboard", description: "Executive dashboard" },
      { label: "Download", href: "/download", description: "Install & deploy" },
      { label: "Changelog", href: "/changelog", description: "Release notes" },
    ],
  },
  {
    label: "Explore",
    children: [
      { label: "Demo Workspace", href: "/demo", description: "Interactive pipeline analysis" },
      { label: "Knowledge Graph", href: "/demo/knowledge-graph", description: "Security relationships" },
      { label: "Attack Paths", href: "/demo/attack-paths", description: "Threat path visualization" },
      { label: "AI Copilot", href: "/dashboard", description: "AI security assistant" },
      { label: "Cloud Workspace", href: "/cloud", description: "SaaS workspace preview" },
    ],
  },
  {
    label: "Marketplace",
    children: [
      { label: "Browse All", href: "/marketplace", description: "Extensions catalog" },
      { label: "Plugins", href: "/marketplace/plugins" },
      { label: "Rules", href: "/marketplace/rules" },
      { label: "Connectors", href: "/marketplace/connectors" },
      { label: "Templates", href: "/marketplace/templates" },
      { label: "Dashboards", href: "/marketplace/dashboards" },
      { label: "Integrations", href: "/marketplace/integrations" },
      { label: "AI Prompts", href: "/marketplace/ai-prompts" },
    ],
  },
  {
    label: "Docs",
    children: [
      { label: "Getting Started", href: "/docs/getting-started" },
      { label: "Guides", href: "/docs/guides" },
      { label: "API Reference", href: "/docs/api" },
      { label: "CLI", href: "/docs/cli" },
      { label: "SDK", href: "/docs/sdk" },
      { label: "Deployment", href: "/docs/deployment" },
      { label: "Security", href: "/docs/security" },
      { label: "Compliance", href: "/docs/compliance" },
    ],
  },
  {
    label: "Community",
    children: [
      { label: "Discord", href: "#" },
      { label: "Telegram", href: "#" },
      { label: "Contributing", href: "/community/contributing" },
      { label: "Roadmap", href: "/community/roadmap", description: "Interactive roadmap" },
      { label: "Feature Requests", href: "/community/feature-requests" },
    ],
  },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { locale, setLocale } = useI18n();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/80 backdrop-blur-xl border-b border-border"
            : "bg-background/60 backdrop-blur-md"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="relative w-8 h-8 flex items-center justify-center">
                <Shield className="w-7 h-7 text-accent" />
                <div className="absolute inset-0 bg-accent/20 rounded-full blur-md group-hover:bg-accent/30 transition-colors" />
              </div>
              <span className="font-semibold text-lg tracking-tight">
                <span className="text-foreground">sec</span>
                <span className="text-accent">‑scanner</span>
                <span className="text-muted text-sm">.pro</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0.5" ref={dropdownRef}>
              {navItems.map((item) => (
                <div key={item.label} className="relative">
                  {item.children ? (
                    <button
                      onClick={() =>
                        setOpenDropdown(openDropdown === item.label ? null : item.label)
                      }
                      className="flex items-center gap-1 px-3 py-2 text-sm text-muted-2 hover:text-foreground transition-colors rounded-lg hover:bg-surface-2"
                    >
                      {item.label}
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          openDropdown === item.label ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  ) : (
                    <Link
                      href={item.href!}
                      className="px-3 py-2 text-sm text-muted-2 hover:text-foreground transition-colors rounded-lg hover:bg-surface-2"
                    >
                      {item.label}
                    </Link>
                  )}

                  <AnimatePresence>
                    {item.children && openDropdown === item.label && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 mt-1 w-56 py-2 bg-surface border border-border rounded-xl shadow-xl shadow-black/40 overflow-hidden z-50"
                      >
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setOpenDropdown(null)}
                            className="block px-4 py-2.5 text-sm text-muted-2 hover:text-foreground hover:bg-surface-2 transition-colors"
                          >
                            <span className="block font-medium text-foreground/90">
                              {child.label}
                            </span>
                            {child.description && (
                              <span className="block text-xs text-muted mt-0.5">
                                {child.description}
                              </span>
                            )}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
              <Link
                href="/pricing"
                className="px-3 py-2 text-sm text-muted-2 hover:text-foreground transition-colors rounded-lg hover:bg-surface-2"
              >
                Pricing
              </Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-muted hover:text-foreground bg-surface border border-border rounded-lg hover:border-border-light transition-colors"
                aria-label="Search"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="text-xs">⌘K</span>
              </button>

              {/* Language switcher */}
              <button
                onClick={() => setLocale(locale === "ru" ? "en" : "ru")}
                className="flex items-center gap-1 px-2 py-1.5 text-sm text-muted-2 hover:text-foreground transition-colors rounded-lg hover:bg-surface-2"
                aria-label="Switch language"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{localeNames[locale]}</span>
              </button>

              <a
                href="https://github.com/Ksander215/sec-scanner-workspace"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-muted-2 hover:text-foreground transition-colors"
              >
                <GitHubIcon className="w-4 h-4" />
                <ExternalLink className="w-3 h-3" />
              </a>

              <Link
                href="/demo"
                className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors"
              >
                Try Demo
              </Link>

              {/* Mobile toggle */}
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 text-muted-2 hover:text-foreground"
                aria-label="Open menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
