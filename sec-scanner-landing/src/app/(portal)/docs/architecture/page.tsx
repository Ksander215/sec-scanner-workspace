import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Layers, Server, Plug, ArrowRightLeft, Brain, BarChart3 } from "lucide-react";

export const metadata: Metadata = {
  title: "Architecture — Docs — Security Intelligence Platform",
  description: "Technical architecture documentation — system design, data flow, and component interactions.",
  openGraph: { title: "Architecture — Docs", description: "Technical architecture docs." },
};

const components = [
  { icon: Server, title: "Scan Engine", description: "Pluggable scanning engine architecture with sandboxed execution, resource limits, and timeout controls." },
  { icon: ArrowRightLeft, title: "Correlation Bus", description: "Event-driven correlation pipeline using a publish-subscribe pattern with real-time deduplication." },
  { icon: Plug, title: "Plugin Runtime", description: "Sandboxed plugin execution environment with capability-based permissions and hot-reloading." },
  { icon: Brain, title: "ML Pipeline", description: "On-device machine learning inference for classification and triage. No external API calls." },
  { icon: BarChart3, title: "Storage Layer", description: "PostgreSQL for relational data, ClickHouse for time-series analytics, S3-compatible for artifacts." },
  { icon: Layers, title: "API Gateway", description: "Rate-limited REST/GraphQL gateway with JWT auth, RBAC, and audit logging middleware." },
];

export default function DocsArchitecturePage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Architecture" }]}
        title="Architecture Documentation"
        description="Deep dive into the technical architecture, design decisions, and component interactions."
      />

      <Container className="py-16">
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {components.map((comp) => (
            <Card key={comp.title} icon={comp.icon} title={comp.title} description={comp.description} />
          ))}
        </div>

        <div className="mt-12 max-w-4xl mx-auto p-6 rounded-xl bg-surface border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-3">Data Flow</h3>
          <div className="font-mono text-sm text-muted-2 leading-loose">
            <div>Target → Scan Engine → Raw Findings</div>
            <div className="text-accent pl-4">→ Correlation Bus → Deduplication + Enrichment</div>
            <div className="text-cyan pl-8">→ Risk Scoring → ML Classification</div>
            <div className="text-amber pl-12">→ Storage → API → Dashboard / Reports / Webhooks</div>
          </div>
        </div>
      </Container>
    </>
  );
}
