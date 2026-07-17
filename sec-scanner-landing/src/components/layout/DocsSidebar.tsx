"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";

const docSections = [
  { icon: Rocket, label: "Getting Started", href: "/docs/getting-started" },
  { icon: BookOpen, label: "Guides", href: "/docs/guides" },
  { icon: Code2, label: "API Reference", href: "/docs/api" },
  { icon: Terminal, label: "CLI", href: "/docs/cli" },
  { icon: Blocks, label: "SDK", href: "/docs/sdk" },
  { icon: Server, label: "Architecture", href: "/docs/architecture" },
  { icon: Upload, label: "Deployment", href: "/docs/deployment" },
  { icon: Shield, label: "Security", href: "/docs/security" },
  { icon: ClipboardCheck, label: "Compliance", href: "/docs/compliance" },
  { icon: Store, label: "Marketplace", href: "/docs/marketplace" },
  { icon: Puzzle, label: "Plugin Development", href: "/docs/plugins" },
];

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-56 shrink-0 py-6 pr-6 border-r border-border overflow-y-auto">
      <div className="mb-4 px-3">
        <span className="text-xs text-muted uppercase tracking-wider font-medium">Documentation</span>
      </div>
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
              <span className="truncate">{section.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
