"use client";

import Link from "next/link";
import { Shield, Send, MessageCircle } from "lucide-react";
import { GitHubIcon } from "@/components/ui/icons";
import { useI18n } from "@/lib/i18n-context";

export function Footer() {
  const { t, locale } = useI18n();

  const footerLinks = [
    {
      title: locale === "ru" ? "Продукт" : "Product",
      links: [
        { label: t("nav.platform"), href: "/app/platform" },
        { label: t("nav.dashboard"), href: "/app/dashboard" },
        { label: t("nav.pricing"), href: "/app/pricing" },
        { label: t("nav.marketplace"), href: "/app/marketplace" },
        { label: locale === "ru" ? "Демо" : "Demo", href: "/app/dashboard" },
      ],
    },
    {
      title: locale === "ru" ? "Разработчикам" : "Developers",
      links: [
        { label: t("nav.documentation"), href: "/app/docs" },
        { label: "API Reference", href: "/app/docs/api" },
        { label: "CLI", href: "/app/docs/cli" },
        { label: "SDK", href: "/app/docs/sdk" },
        { label: "GitHub", href: "https://github.com/Ksander215/sec-scanner-workspace" },
      ],
    },
    {
      title: t("community.title"),
      links: [
        { label: "Telegram", href: "https://t.me/sip_security_platform" },
        { label: "Discord", href: "https://discord.gg/sip-security" },
        { label: "GitHub Discussions", href: "https://github.com/Ksander215/sec-scanner-workspace/discussions" },
        { label: t("community.roadmap"), href: "/app/community/roadmap" },
        { label: t("community.contributing"), href: "https://github.com/Ksander215/sec-scanner-workspace/blob/main/CONTRIBUTING.md" },
      ],
    },
    {
      title: locale === "ru" ? "Юридическое" : "Legal",
      links: [
        { label: locale === "ru" ? "Политика конфиденциальности" : "Privacy Policy", href: "/app/legal/privacy" },
        { label: locale === "ru" ? "Условия использования" : "Terms of Service", href: "/app/legal/terms" },
        { label: locale === "ru" ? "Политика безопасности" : "Security Policy", href: "/app/legal/security" },
        { label: "MIT License", href: "https://github.com/Ksander215/sec-scanner-workspace/blob/main/LICENSE" },
      ],
    },
  ];

  return (
    <footer className="relative border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 group">
              <Shield className="w-6 h-6 text-accent" />
              <span className="font-bold text-foreground text-lg">
                <span className="text-accent">SIP</span>
              </span>
            </Link>
            <p className="mt-2 text-xs text-muted">Security Intelligence Platform</p>
            <p className="mt-1 text-xs text-muted">{t("brand.tagline")}</p>
            <p className="mt-3 text-sm text-muted leading-relaxed">
              Powered by Sec Scanner Engine
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://github.com/Ksander215/sec-scanner-workspace"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-muted hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                aria-label="GitHub"
              >
                <GitHubIcon className="w-4 h-4" />
              </a>
              <a
                href="https://t.me/sip_security_platform"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-muted hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                aria-label="Telegram"
              >
                <Send className="w-4 h-4" />
              </a>
              <a
                href="https://discord.gg/sip-security"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-muted hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                aria-label="Discord"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {footerLinks.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-foreground mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                      rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="text-sm text-muted-2 hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted">
            &copy; {new Date().getFullYear()} SIP — Security Intelligence Platform. {locale === "ru" ? "Все права защищены" : "All rights reserved"}.
          </p>
          <a
            href="mailto:hello@sec-scanner.pro"
            className="text-sm text-muted-2 hover:text-accent transition-colors"
          >
            hello@sec-scanner.pro
          </a>
        </div>
      </div>
    </footer>
  );
}
