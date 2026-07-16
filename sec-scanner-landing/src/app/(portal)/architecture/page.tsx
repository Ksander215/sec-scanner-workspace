import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";

import { Container } from "@/components/ui/Container";
import { Layers, Server, Plug, ArrowRightLeft, BarChart3, Brain } from "lucide-react";

export const metadata: Metadata = {
  title: "Architecture — Security Intelligence Platform",
  description: "Learn about the modular architecture behind the Security Intelligence Platform — engine layer, correlation bus, plugin system, and more.",
  openGraph: {
    title: "Architecture — Security Intelligence Platform",
    description: "Learn about the modular architecture of the Security Intelligence Platform.",
  },
};

const layers = [
  {
    icon: Server,
    title: "Scanning Engines",
    description: "Pluggable engine layer supporting DAST, SAST, API, infrastructure, and custom scanners. Each engine runs in an isolated sandbox with resource limits and timeout controls.",
  },
  {
    icon: ArrowRightLeft,
    title: "Correlation Bus",
    description: "Event-driven correlation engine that deduplicates findings across scanners, enriches data with threat intelligence, and computes risk scores in real time.",
  },
  {
    icon: Plug,
    title: "Plugin System",
    description: "Extensible plugin architecture with a well-defined API. Load community plugins from the marketplace or build your own with the SDK.",
  },
  {
    icon: Brain,
    title: "AI/ML Pipeline",
    description: "On-device machine learning for false positive reduction, finding classification, and remediation suggestions. No data leaves your environment.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reporting",
    description: "Real-time dashboards, trend analysis, and automated report generation for stakeholders. Export to PDF, JSON, or integrate with your BI tools.",
  },
  {
    icon: Layers,
    title: "API Gateway",
    description: "Unified REST and GraphQL API with role-based access control, rate limiting, and comprehensive audit logging for all platform operations.",
  },
];

export default function ArchitecturePage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Product" }, { label: "Architecture" }]}
        title="Architecture"
        description="A modular, extensible architecture designed for scale — from a single security engineer to enterprise teams managing thousands of assets."
      />

      <Container className="py-16">
        {/* Architecture layers */}
        <div className="space-y-4">
          {layers.map((layer, i) => (
            <div
              key={layer.title}
              className="group relative p-6 rounded-xl bg-surface border border-border hover:border-border-light transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center shrink-0">
                  <layer.icon className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-mono text-muted">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="text-base font-semibold text-foreground">{layer.title}</h3>
                  </div>
                  <p className="text-sm text-muted-2 leading-relaxed">{layer.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 p-8 rounded-xl bg-surface border border-border">
          <h2 className="text-2xl font-bold text-foreground mb-4">Deployment Options</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="p-4 rounded-lg bg-surface-2 border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-1">Self-Hosted</h3>
              <p className="text-xs text-muted-2">Docker Compose or Kubernetes. Full control, no data leaves your network.</p>
            </div>
            <div className="p-4 rounded-lg bg-surface-2 border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-1">Cloud SaaS</h3>
              <p className="text-xs text-muted-2">Managed infrastructure with automatic updates and scaling. Start scanning in minutes.</p>
            </div>
            <div className="p-4 rounded-lg bg-surface-2 border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-1">Hybrid</h3>
              <p className="text-xs text-muted-2">Scanning agents on-premises with cloud management console. Best of both worlds.</p>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}
