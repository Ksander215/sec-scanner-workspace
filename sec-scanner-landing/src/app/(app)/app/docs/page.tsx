"use client";

import Link from "next/link";
import { DocsSidebar } from "@/components/layout/DocsSidebar";
import { Badge } from "@/components/ui/Badge";
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
} from "lucide-react";

const sections = [
  { icon: Rocket, title: "Getting Started", description: "Install, configure, and run your first scan in under 5 minutes. Covers Docker, CLI, and SaaS setup.", href: "/docs/getting-started", badge: "Start here" },
  { icon: BookOpen, title: "Guides", description: "Step-by-step tutorials for common workflows: scanning, correlation, reporting, and remediation.", href: "/docs/guides" },
  { icon: Code2, title: "API Reference", description: "REST API documentation with request/response examples, authentication, and rate limits.", href: "/docs/api" },
  { icon: Terminal, title: "CLI", description: "Command-line interface reference with usage patterns, flags, and output formats.", href: "/docs/cli" },
  { icon: Blocks, title: "SDK", description: "TypeScript and Python SDKs for programmatic access. Integrate scanning into your CI/CD.", href: "/docs/sdk" },
  { icon: Server, title: "Architecture", description: "Technical architecture: data flow, domain models, and system design decisions.", href: "/docs/architecture" },
  { icon: Upload, title: "Deployment", description: "Docker Compose, Kubernetes Helm, and cloud deployment guides with best practices.", href: "/docs/deployment" },
  { icon: Shield, title: "Security", description: "Security hardening, TLS configuration, and best practices for production deployments.", href: "/docs/security" },
  { icon: ClipboardCheck, title: "Compliance", description: "Compliance frameworks (OWASP, CIS, PCI DSS), reports, and audit trail configuration.", href: "/docs/compliance" },
  { icon: Store, title: "Marketplace", description: "Publishing and managing marketplace extensions. Versioning, reviews, and monetization.", href: "/docs/marketplace" },
  { icon: Puzzle, title: "Plugin Development", description: "Build custom scanning plugins with the Plugin SDK. API hooks, testing, and distribution.", href: "/docs/plugins" },
];

export default function DocsPage() {
  return (
    <div className="flex min-h-[calc(100vh-7rem)]">
      <DocsSidebar />
      <div className="flex-1 py-8 px-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Documentation</h1>
        <p className="text-lg text-muted-2 mb-8">
          Everything you need to get started, integrate, and master the Security Intelligence Platform.
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
                      {section.title}
                    </h3>
                    {section.badge && <Badge variant="low">{section.badge}</Badge>}
                  </div>
                  <p className="text-xs text-muted-2 mt-1 leading-relaxed">{section.description}</p>
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
