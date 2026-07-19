import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Webhook, Database, Scan, FileCode, Network, Terminal } from "lucide-react";

export const metadata: Metadata = {
  title: "Capabilities — Security Intelligence Platform",
  description: "Explore core capabilities: DAST, SAST, API security, infrastructure scanning, compliance automation, and more.",
  openGraph: {
    title: "Capabilities — Security Intelligence Platform",
    description: "Explore core capabilities of the Security Intelligence Platform.",
  },
};

const capabilities = [
  {
    icon: Webhook,
    title: "API Security Testing",
    description: "Comprehensive REST and GraphQL API testing with automatic schema discovery, authentication testing, and business logic abuse detection.",
    severity: "critical" as const,
  },
  {
    icon: FileCode,
    title: "Static Analysis (SAST)",
    description: "Deep source code analysis with taint tracking, data flow analysis, and support for 20+ programming languages.",
    severity: "high" as const,
  },
  {
    icon: Scan,
    title: "Dynamic Analysis (DAST)",
    description: "Runtime application testing with smart crawling, parameter fuzzing, and authenticated scanning for modern web applications.",
    severity: "high" as const,
  },
  {
    icon: Database,
    title: "Infrastructure Scanning",
    description: "Cloud, container, and Kubernetes security assessment with CIS benchmark validation and misconfiguration detection.",
    severity: "medium" as const,
  },
  {
    icon: Network,
    title: "Network Discovery",
    description: "Automated asset discovery, port scanning, and service fingerprinting to map your external attack surface.",
    severity: "medium" as const,
  },
  {
    icon: Terminal,
    title: "CLI & Automation",
    description: "Full-featured CLI with CI/CD integration, custom pipelines, and API-driven automation for security-as-code workflows.",
    severity: "info" as const,
  },
];

export default function CapabilitiesPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Product" }, { label: "Capabilities" }]}
        title="Capabilities"
        description="From API security to infrastructure scanning, the platform provides comprehensive coverage across your entire technology stack."
      />

      <Container className="py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((cap) => (
            <Card
              key={cap.title}
              icon={cap.icon}
              title={cap.title}
              description={cap.description}
            >
              <div className="mt-3">
                <Badge variant={cap.severity}>{cap.severity}</Badge>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-16 p-8 rounded-xl bg-surface border border-border text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">Need a Custom Capability?</h2>
          <p className="text-muted-2 max-w-2xl mx-auto mb-6">
            The platform is built on a plugin architecture. Extend it with custom scanners, rules, and connectors — or request one from the community.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href="/app/marketplace/plugins" className="inline-flex items-center px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors">
              Browse Plugins
            </a>
            <a href="/app/docs/plugins" className="inline-flex items-center px-4 py-2 text-sm font-medium border border-border text-foreground rounded-lg hover:bg-surface-2 hover:border-border-light transition-colors">
              Build Your Own
            </a>
          </div>
        </div>
      </Container>
    </>
  );
}
