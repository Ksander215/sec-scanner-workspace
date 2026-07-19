"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  ArrowLeft,
} from "lucide-react";

const docSections = [
  { icon: Rocket, labelKey: "docs.gettingStarted", href: "/app/docs/getting-started" },
  { icon: BookOpen, labelKey: "docs.guides", href: "/app/docs/guides" },
  { icon: Code2, labelKey: "docs.api", href: "/app/docs/api" },
  { icon: Terminal, labelKey: "docs.cli", href: "/app/docs/cli" },
  { icon: Blocks, labelKey: "docs.sdk", href: "/app/docs/sdk" },
  { icon: Server, labelKey: "docs.architecture", href: "/app/docs/architecture" },
  { icon: Upload, labelKey: "docs.deployment", href: "/app/docs/deployment" },
  { icon: Shield, labelKey: "docs.security", href: "/app/docs/security" },
  { icon: ClipboardCheck, labelKey: "docs.compliance", href: "/app/docs/compliance" },
  { icon: Store, labelKey: "docs.marketplace", href: "/app/docs/marketplace" },
  { icon: Puzzle, labelKey: "docs.plugins", href: "/app/docs/plugins" },
];

export function DocsSidebar() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className="w-56 shrink-0 py-6 pr-6 border-r border-border overflow-y-auto sticky top-0 h-[calc(100vh-7rem)] bg-background">
      {/* Back button */}
      <div className="mb-4 px-3">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm text-muted-2 hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>{t("docs.back")}</span>
        </Link>
      </div>

      {/* Section heading */}
      <div className="mb-4 px-3">
        <span className="text-xs text-muted uppercase tracking-wider font-medium">
          {t("docs.title")}
        </span>
      </div>

      {/* Navigation links */}
      <div className="space-y-0.5">
        {docSections.map((section) => {
          const isActive = pathname === section.href;
          const Icon = section.icon;
          return (
            <Link
              key={section.href}
              href={section.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-accent-muted text-accent font-medium"
                  : "text-muted-2 hover:text-foreground hover:bg-surface-2"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{t(section.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
