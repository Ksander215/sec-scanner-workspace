import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Link2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Integrations — Marketplace — Security Intelligence Platform",
  description: "Third-party platform integrations for CI/CD, cloud providers, and DevOps tools.",
  openGraph: { title: "Integrations — Marketplace", description: "Third-party integrations." },
};

const integrations = [
  { name: "GitHub Actions", category: "CI/CD", description: "Run scans on every pull request with GitHub Actions integration." },
  { name: "GitLab CI", category: "CI/CD", description: "Native GitLab CI/CD pipeline integration with merge request gating." },
  { name: "Jenkins", category: "CI/CD", description: "Jenkins plugin for build pipeline security scanning stages." },
  { name: "AWS Security Hub", category: "Cloud", description: "Sync findings with AWS Security Hub for consolidated cloud security." },
  { name: "GCP Security Command Center", category: "Cloud", description: "Google Cloud security findings integration and sync." },
  { name: "Azure Defender", category: "Cloud", description: "Microsoft Azure security center connector for unified alerting." },
];

export default function IntegrationsPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Marketplace", href: "/app/marketplace" }, { label: "Integrations" }]}
        title="Integrations"
        description="Seamlessly integrate with your existing CI/CD pipelines, cloud providers, and DevOps tools."
      />

      <Container className="py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((intg) => (
            <Card key={intg.name} title={intg.name} description={intg.description}>
              <div className="mt-3">
                <Badge variant="category">{intg.category}</Badge>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-12 p-8 rounded-xl bg-surface border border-border text-center">
          <Link2 className="w-8 h-8 text-accent mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Request an Integration</h3>
          <p className="text-sm text-muted-2 max-w-lg mx-auto">
            Don&apos;t see your tool? Open a feature request and we&apos;ll prioritize the integration.
          </p>
        </div>
      </Container>
    </>
  );
}
