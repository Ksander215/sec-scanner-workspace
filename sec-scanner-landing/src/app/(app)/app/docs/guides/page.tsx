import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Guides — Docs — Security Intelligence Platform",
  description: "Step-by-step tutorials for common security scanning and monitoring tasks.",
  openGraph: { title: "Guides — Docs", description: "Step-by-step tutorials." },
};

const guides = [
  { title: "Configure Authenticated Scanning", description: "Set up login flows and session management for scanning behind authentication." },
  { title: "CI/CD Pipeline Integration", description: "Integrate security scanning into your GitHub Actions, GitLab CI, or Jenkins pipelines." },
  { title: "Custom Rule Development", description: "Write and test custom detection rules using the YAML rule format." },
  { title: "Compliance Report Generation", description: "Generate compliance reports for PCI DSS, SOC 2, and ISO 27001." },
  { title: "Multi-Target Scanning", description: "Configure and schedule scans across multiple targets with different profiles." },
  { title: "Webhook & Notification Setup", description: "Configure Slack, email, and webhook notifications for critical findings." },
  { title: "Plugin Development Walkthrough", description: "Build your first plugin from scratch with the Plugin SDK." },
  { title: "Kubernetes Deployment", description: "Deploy the platform on Kubernetes with Helm charts and production best practices." },
];

export default function GuidesPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Guides" }]}
        title="Guides"
        description="Step-by-step tutorials for common tasks, integrations, and advanced configurations."
      />

      <Container className="py-16">
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {guides.map((guide) => (
            <Card key={guide.title} title={guide.title} description={guide.description} />
          ))}
        </div>
      </Container>
    </>
  );
}
