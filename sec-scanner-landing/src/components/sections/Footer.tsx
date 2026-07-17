"use client";

import Link from "next/link";
import { Shield, Send, MessageCircle, X } from "lucide-react";
import { GitHubIcon } from "@/components/ui/icons";

const footerLinks = [
  {
    title: "Продукт",
    links: [
      { label: "Платформа", href: "/app/platform" },
      { label: "Дашборд", href: "/app/dashboard" },
      { label: "Тарифы", href: "/app/pricing" },
      { label: "Каталог инструментов", href: "/app/marketplace" },
      { label: "Демо", href: "/app/dashboard" },
    ],
  },
  {
    title: "Разработчикам",
    links: [
      { label: "Документация", href: "/app/docs" },
      { label: "API Reference", href: "/app/docs/api" },
      { label: "CLI", href: "/app/docs/cli" },
      { label: "SDK", href: "/app/docs/sdk" },
      { label: "GitHub", href: "https://github.com/Ksander215/sec-scanner-workspace" },
    ],
  },
  {
    title: "Сообщество",
    links: [
      { label: "Telegram", href: "https://t.me/sip_security_platform" },
      { label: "Discord", href: "https://discord.gg/sip-security" },
      { label: "GitHub Discussions", href: "https://github.com/Ksander215/sec-scanner-workspace/discussions" },
      { label: "Дорожная карта", href: "/app/community/roadmap" },
      { label: "Вклад в проект", href: "https://github.com/Ksander215/sec-scanner-workspace/blob/main/CONTRIBUTING.md" },
    ],
  },
  {
    title: "Юридическое",
    links: [
      { label: "Политика конфиденциальности", href: "/app/legal/privacy" },
      { label: "Условия использования", href: "/app/legal/terms" },
      { label: "Политика безопасности", href: "/app/legal/security" },
      { label: "Лицензия (MIT)", href: "https://github.com/Ksander215/sec-scanner-workspace/blob/main/LICENSE" },
    ],
  },
];

export function Footer() {
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
            <p className="mt-1 text-xs text-muted">Операционная система для безопасности бизнеса</p>
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
            &copy; {new Date().getFullYear()} SIP — Security Intelligence Platform. {footer_allRights}
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

const footer_allRights = "Все права защищены";
