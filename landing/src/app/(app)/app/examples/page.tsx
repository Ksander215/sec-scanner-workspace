import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import {
  Code2,
  Webhook,
  Database,
  Shield,
  Terminal,
  FileCode,
  Cloud,
  Lock,
  BarChart3,
  GitBranch,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Examples — Security Intelligence Platform",
  description: "Code examples, configurations, and integration templates for the Security Intelligence Platform.",
  openGraph: {
    title: "Examples — Security Intelligence Platform",
    description: "Code examples and integration templates.",
  },
};

const categories = [
  { icon: Webhook, title: "API Scanning", description: "REST and GraphQL API scanning configurations and custom checks.", count: "8 examples" },
  { icon: FileCode, title: "SAST Integration", description: "Source code analysis setup for Python, TypeScript, Go, and Java.", count: "6 examples" },
  { icon: Database, title: "Infrastructure as Code", description: "Terraform, CloudFormation, and Kubernetes manifest scanning.", count: "5 examples" },
  { icon: Cloud, title: "Cloud Deployments", description: "AWS, GCP, and Azure deployment configurations.", count: "4 examples" },
  { icon: GitBranch, title: "CI/CD Pipelines", description: "GitHub Actions, GitLab CI, and Jenkins integration examples.", count: "7 examples" },
  { icon: Terminal, title: "CLI Scripts", description: "Automation scripts for batch scanning, reporting, and data export.", count: "10 examples" },
  { icon: Shield, title: "Custom Rules", description: "YAML rule examples for custom vulnerability detection.", count: "12 examples" },
  { icon: Lock, title: "Authentication", description: "OAuth2, JWT, and API key authentication configurations.", count: "4 examples" },
  { icon: BarChart3, title: "Dashboards", description: "Custom dashboard JSON configurations and widget examples.", count: "3 examples" },
  { icon: Code2, title: "SDK Usage", description: "Python, TypeScript, Go, and Rust SDK integration examples.", count: "9 examples" },
];

export default function ExamplesPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Examples" }]}
        title="Examples"
        description="Code examples, configurations, and integration templates to help you get started quickly."
      />

      <Container className="py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {categories.map((cat) => (
            <Card
              key={cat.title}
              icon={cat.icon}
              title={cat.title}
              description={cat.description}
              badge={cat.count}
            />
          ))}
        </div>
      </Container>
    </>
  );
}
