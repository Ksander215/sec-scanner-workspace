import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Box, Cloud, Server } from "lucide-react";

export const metadata: Metadata = {
  title: "Deployment — Docs — Security Intelligence Platform",
  description: "Deployment guides for Docker, Kubernetes, and cloud environments.",
  openGraph: { title: "Deployment — Docs", description: "Deployment guides." },
};

const options = [
  {
    icon: Box,
    title: "Docker Compose",
    description: "Single-host deployment with Docker Compose. Perfect for small teams and testing environments.",
    tag: "Quick Start",
  },
  {
    icon: Server,
    title: "Kubernetes (Helm)",
    description: "Production-grade Kubernetes deployment with Helm charts, auto-scaling, and rolling updates.",
    tag: "Production",
  },
  {
    icon: Cloud,
    title: "Cloud Marketplace",
    description: "One-click deployment from AWS Marketplace, GCP Marketplace, or Azure Marketplace.",
    tag: "Managed",
  },
];

export default function DeploymentPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Docs", href: "/app/docs" }, { label: "Deployment" }]}
        title="Deployment"
        description="Deploy the Security Intelligence Platform on-premises, in the cloud, or in hybrid configurations."
      />

      <Container className="py-16">
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {options.map((opt) => (
            <Card key={opt.title} icon={opt.icon} title={opt.title} description={opt.description}>
              <div className="mt-3">
                <Badge variant="info">{opt.tag}</Badge>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-12 max-w-3xl mx-auto p-6 rounded-xl bg-surface border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-3">Quick Start with Docker</h3>
          <div className="p-4 rounded-lg bg-background border border-border font-mono text-sm space-y-2">
            <div className="text-muted"># Clone the repository</div>
            <div className="text-accent">git clone https://github.com/Ksander215/sec-scanner-workspace</div>
            <div className="text-accent">cd sec-scanner-workspace</div>
            <div className="mt-2 text-muted"># Start all services</div>
            <div className="text-accent">docker compose up -d</div>
            <div className="mt-2 text-muted"># Access the dashboard</div>
            <div className="text-foreground">open http://localhost:3000</div>
          </div>
        </div>
      </Container>
    </>
  );
}
