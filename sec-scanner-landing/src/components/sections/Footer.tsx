"use client";

import Link from "next/link";
import { Shield, Send, MessageCircle, X } from "lucide-react";
import { GitHubIcon } from "@/components/ui/icons";

const footerLinks = [
  {
    title: "Product",
    links: [
      { label: "Platform", href: "#platform" },
      { label: "Capabilities", href: "#capabilities" },
      { label: "Pricing", href: "#pricing" },
      { label: "Marketplace", href: "#marketplace" },
      { label: "Demo", href: "#demo" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "API Reference", href: "/docs/api" },
      { label: "CLI", href: "/docs/cli" },
      { label: "SDK", href: "/docs/sdk" },
      { label: "GitHub", href: "https://github.com/Ksander215/sec-scanner-workspace" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Discord", href: "#" },
      { label: "Telegram", href: "#" },
      { label: "GitHub Discussions", href: "https://github.com/Ksander215/sec-scanner-workspace/discussions" },
      { label: "Roadmap", href: "#roadmap" },
      { label: "Contributing", href: "https://github.com/Ksander215/sec-scanner-workspace/blob/main/CONTRIBUTING.md" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Security Policy", href: "/security" },
      { label: "License (MIT)", href: "https://github.com/Ksander215/sec-scanner-workspace/blob/main/LICENSE" },
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
              <span className="font-semibold text-foreground">
                sec<span className="text-accent">‑scanner</span>
                <span className="text-muted text-xs">.pro</span>
              </span>
            </Link>
            <p className="mt-4 text-sm text-muted leading-relaxed">
              Open Source Security Intelligence Platform для компаний любого масштаба.
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
                href="#"
                className="p-2 text-muted hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                aria-label="X (Twitter)"
              >
                <X className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="p-2 text-muted hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                aria-label="Telegram"
              >
                <Send className="w-4 h-4" />
              </a>
              <a
                href="#"
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
            &copy; {new Date().getFullYear()} sec-scanner.pro — Open Source Security Intelligence
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
