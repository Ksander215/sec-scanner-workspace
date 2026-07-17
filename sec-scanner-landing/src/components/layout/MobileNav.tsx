"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, X, ExternalLink, Globe } from "lucide-react";
import { GitHubIcon } from "@/components/ui/icons";
import { useI18n } from "@/lib/i18n-context";
import { localeNames, type Locale } from "@/lib/i18n";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

interface NavSection {
  title: string;
  links: { label: string; href: string }[];
}

const sections: NavSection[] = [
  {
    title: "Product",
    links: [
      { label: "Platform", href: "/platform" },
      { label: "Capabilities", href: "/capabilities" },
      { label: "Architecture", href: "/architecture" },
      { label: "Demo", href: "/demo" },
      { label: "Changelog", href: "/changelog" },
    ],
  },
  {
    title: "Marketplace",
    links: [
      { label: "All Extensions", href: "/marketplace" },
      { label: "Plugins", href: "/marketplace/plugins" },
      { label: "Rules", href: "/marketplace/rules" },
      { label: "Connectors", href: "/marketplace/connectors" },
      { label: "Templates", href: "/marketplace/templates" },
      { label: "Dashboards", href: "/marketplace/dashboards" },
      { label: "Integrations", href: "/marketplace/integrations" },
      { label: "Themes", href: "/marketplace/themes" },
      { label: "AI Prompts", href: "/marketplace/ai-prompts" },
    ],
  },
  {
    title: "Docs",
    links: [
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
    title: "Community",
    links: [
      { label: "Discord", href: "#" },
      { label: "Telegram", href: "#" },
      { label: "Contributing", href: "/community/contributing" },
      { label: "Roadmap", href: "/community/roadmap" },
      { label: "Feature Requests", href: "/community/feature-requests" },
    ],
  },
];

export function MobileNav({ open, onClose }: MobileNavProps) {
  const { locale, setLocale } = useI18n();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Slide-out panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-[70] w-80 max-w-[85vw] bg-surface border-l border-border overflow-y-auto"
          >
            {/* Close button */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <Link href="/" onClick={onClose} className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-accent" />
                <span className="font-semibold text-foreground">
                  sec<span className="text-accent">‑scanner</span>
                </span>
              </Link>
              <button
                onClick={onClose}
                className="p-2 text-muted-2 hover:text-foreground rounded-lg hover:bg-surface-2"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav sections */}
            <div className="p-4">
              {sections.map((section) => (
                <div key={section.title} className="mb-6">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">
                    {section.title}
                  </h3>
                  <ul className="space-y-0.5">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          onClick={onClose}
                          className="block px-3 py-2 text-sm text-muted-2 hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* Extra links */}
              <div className="pt-4 border-t border-border space-y-2">
                <Link
                  href="/app/pricing"
                  onClick={onClose}
                  className="block px-3 py-2 text-sm text-muted-2 hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  href="/app/blog"
                  onClick={onClose}
                  className="block px-3 py-2 text-sm text-muted-2 hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                >
                  Blog
                </Link>
                <Link
                  href="/app/examples"
                  onClick={onClose}
                  className="block px-3 py-2 text-sm text-muted-2 hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                >
                  Examples
                </Link>
              </div>

              {/* Actions */}
              <div className="mt-6 pt-4 border-t border-border space-y-3">
                <button
                  onClick={() => {
                    setLocale(locale === "ru" ? "en" : "ru");
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-muted-2 hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors w-full"
                >
                  <Globe className="w-4 h-4" />
                  {localeNames[locale]} / {localeNames[locale === "ru" ? "en" : "ru" as Locale]}
                </button>
                <a
                  href="https://github.com/Ksander215/sec-scanner-workspace"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-muted-2 hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                >
                  <GitHubIcon className="w-4 h-4" />
                  GitHub
                  <ExternalLink className="w-3 h-3" />
                </a>
                <Link
                  href="/app/demo"
                  onClick={onClose}
                  className="block w-full text-center px-4 py-2.5 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors"
                >
                  Try Demo
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
