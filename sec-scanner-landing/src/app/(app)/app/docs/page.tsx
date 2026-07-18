"use client";

import Link from "next/link";
import { DocsSidebar } from "@/components/layout/DocsSidebar";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/i18n-context";
import {
  Rocket,
  BookOpen,
  Code2,
  Terminal,
  Blocks,
  Server,
  Upload,
  Shield,
  ClipboardCheck,
  Store,
  Puzzle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

const sections = [
  { icon: Rocket, titleKey: "docs.gettingStarted", descKey: "docs.desc.gettingStarted", href: "/app/docs/getting-started", badgeKey: "docs.badge.startHere" },
  { icon: BookOpen, titleKey: "docs.guides", descKey: "docs.desc.guides", href: "/app/docs/guides" },
  { icon: Code2, titleKey: "docs.api", descKey: "docs.desc.api", href: "/app/docs/api" },
  { icon: Terminal, titleKey: "docs.cli", descKey: "docs.desc.cli", href: "/app/docs/cli" },
  { icon: Blocks, titleKey: "docs.sdk", descKey: "docs.desc.sdk", href: "/app/docs/sdk" },
  { icon: Server, titleKey: "docs.architecture", descKey: "docs.desc.architecture", href: "/app/docs/architecture" },
  { icon: Upload, titleKey: "docs.deployment", descKey: "docs.desc.deployment", href: "/app/docs/deployment" },
  { icon: Shield, titleKey: "docs.security", descKey: "docs.desc.security", href: "/app/docs/security" },
  { icon: ClipboardCheck, titleKey: "docs.compliance", descKey: "docs.desc.compliance", href: "/app/docs/compliance" },
  { icon: Store, titleKey: "docs.marketplace", descKey: "docs.desc.marketplace", href: "/app/docs/marketplace" },
  { icon: Puzzle, titleKey: "docs.plugins", descKey: "docs.desc.plugins", href: "/app/docs/plugins" },
];

export default function DocsPage() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-[calc(100vh-7rem)]">
      <DocsSidebar />
      <div className="flex-1 py-8 px-8 max-w-4xl">
        {/* Back button — always works */}
        <div className="mb-6">
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 text-sm text-muted-2 hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>{t("docs.back")}</span>
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">{t("docs.title")}</h1>
        <p className="text-lg text-muted-2 mb-8">
          {t("docs.subtitle")}
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group p-5 rounded-xl bg-surface border border-border hover:border-border-light hover:bg-surface-2 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent-muted flex items-center justify-center shrink-0">
                  <section.icon className="w-4.5 h-4.5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                      {t(section.titleKey)}
                    </h3>
                    {section.badgeKey && <Badge variant="low">{t(section.badgeKey)}</Badge>}
                  </div>
                  <p className="text-xs text-muted-2 mt-1 leading-relaxed">{t(section.descKey)}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted mt-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
