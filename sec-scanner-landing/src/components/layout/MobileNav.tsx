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
  titleKey: string;
  links: { labelKey: string; href: string }[];
}

const sections: NavSection[] = [
  {
    titleKey: "nav.platform",
    links: [
      { labelKey: "platform.title", href: "/app/platform" },
      { labelKey: "capabilities.title", href: "/app/capabilities" },
      { labelKey: "architecture.title", href: "/app/architecture" },
      { labelKey: "common.demo", href: "/app/dashboard" },
      { labelKey: "changelog.title", href: "/app/changelog" },
    ],
  },
  {
    titleKey: "nav.marketplace",
    links: [
      { labelKey: "common.all", href: "/app/marketplace" },
      { labelKey: "marketplace.tab.plugins", href: "/app/marketplace/plugins" },
      { labelKey: "marketplace.tab.rules", href: "/app/marketplace/rules" },
      { labelKey: "marketplace.tab.connectors", href: "/app/marketplace/connectors" },
      { labelKey: "marketplace.tab.templates", href: "/app/marketplace/templates" },
      { labelKey: "marketplace.tab.dashboards", href: "/app/marketplace/dashboards" },
      { labelKey: "marketplace.tab.integrations", href: "/app/marketplace/integrations" },
      { labelKey: "marketplace.tab.themes", href: "/app/marketplace/themes" },
      { labelKey: "marketplace.tab.ai", href: "/app/marketplace/ai-prompts" },
    ],
  },
  {
    titleKey: "nav.docs",
    links: [
      { labelKey: "docs.gettingStarted", href: "/app/docs/getting-started" },
      { labelKey: "docs.guides", href: "/app/docs/guides" },
      { labelKey: "docs.api", href: "/app/docs/api" },
      { labelKey: "docs.cli", href: "/app/docs/cli" },
      { labelKey: "docs.sdk", href: "/app/docs/sdk" },
      { labelKey: "docs.deployment", href: "/app/docs/deployment" },
      { labelKey: "docs.security", href: "/app/docs/security" },
      { labelKey: "docs.compliance", href: "/app/docs/compliance" },
    ],
  },
  {
    titleKey: "nav.community",
    links: [
      { labelKey: "community.discord", href: "https://discord.gg/sec-scanner" },
      { labelKey: "community.telegram", href: "https://t.me/sec_scanner" },
      { labelKey: "community.contributing", href: "/app/community/contributing" },
      { labelKey: "community.roadmap", href: "/app/community/roadmap" },
      { labelKey: "community.featureRequests", href: "/app/community/feature-requests" },
    ],
  },
];

export function MobileNav({ open, onClose }: MobileNavProps) {
  const { locale, setLocale, t } = useI18n();

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
                <span className="font-bold text-accent">SIP</span>
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
                <div key={section.titleKey} className="mb-6">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">
                    {t(section.titleKey)}
                  </h3>
                  <ul className="space-y-0.5">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        {link.href.startsWith("http") ? (
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={onClose}
                            className="block px-3 py-2 text-sm text-muted-2 hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                          >
                            {t(link.labelKey)}
                          </a>
                        ) : (
                          <Link
                            href={link.href}
                            onClick={onClose}
                            className="block px-3 py-2 text-sm text-muted-2 hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                          >
                            {t(link.labelKey)}
                          </Link>
                        )}
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
                  {t("nav.pricing")}
                </Link>
                <Link
                  href="/app/blog"
                  onClick={onClose}
                  className="block px-3 py-2 text-sm text-muted-2 hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                >
                  {t("blog.title")}
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
                  href="/app/dashboard"
                  onClick={onClose}
                  className="block w-full text-center px-4 py-2.5 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors"
                >
                  {t("nav.openPlatform")}
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
