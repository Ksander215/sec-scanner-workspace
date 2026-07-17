import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Shield, Zap, BarChart3, Lock, Cpu, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "Platform — Security Intelligence Platform",
  description: "Unified security intelligence platform for organizations of any scale. Analyze, correlate, prioritize, and remediate vulnerabilities.",
  openGraph: {
    title: "Platform — Security Intelligence Platform",
    description: "Unified security intelligence platform for organizations of any scale.",
  },
};

export default function PlatformPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Product" }, { label: "Platform" }]}
        title="Security Intelligence Platform"
        description="Unified open-source platform that consolidates vulnerability scanning, threat intelligence, and compliance monitoring into a single pane of glass for organizations of any scale."
      />

      <Container className="py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            icon={Shield}
            title="Vulnerability Scanner"
            description="Multi-engine scanning across web apps, APIs, infrastructure, and containers with OWASP Top 10 coverage and beyond."
            badge="Core"
          />
          <Card
            icon={Zap}
            title="Real-Time Correlation"
            description="Correlate findings from multiple scanners and data sources to eliminate duplicates and prioritize what matters most."
            badge="Core"
          />
          <Card
            icon={BarChart3}
            title="Risk Scoring Engine"
            description="Context-aware risk scoring that factors in asset criticality, exploit availability, and business impact."
            badge="Core"
          />
          <Card
            icon={Lock}
            title="Compliance Monitoring"
            description="Continuous compliance checks against PCI DSS, SOC 2, ISO 27001, GDPR, and custom frameworks."
          />
          <Card
            icon={Cpu}
            title="AI-Powered Triage"
            description="Machine learning models that automatically classify findings, reduce false positives, and suggest remediation paths."
          />
          <Card
            icon={Globe}
            title="Threat Intelligence"
            description="Integrated threat feeds and CVE database with real-time updates and cross-referencing against your attack surface."
          />
        </div>

        <div className="mt-16 p-8 rounded-xl bg-surface border border-border">
          <h2 className="text-2xl font-bold text-foreground mb-4">Why Open Source?</h2>
          <p className="text-muted-2 leading-relaxed max-w-3xl">
            Security tools should be transparent and auditable. Our open-source approach means you can inspect every line of code,
            contribute improvements, and trust that the platform works exactly as documented. No black boxes, no vendor lock-in —
            just powerful security intelligence you can rely on.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            <Badge variant="info">MIT License</Badge>
            <Badge variant="low">Self-Hosted</Badge>
            <Badge variant="category">Cloud-Ready</Badge>
          </div>
        </div>
      </Container>
    </>
  );
}
