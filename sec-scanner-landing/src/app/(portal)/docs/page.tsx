import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
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

export const metadata: Metadata = {
  title: "Documentation — Security Intelligence Platform",
  description: "Comprehensive documentation for the Security Intelligence Platform — getting started, guides, API, CLI, SDK, and more.",
  openGraph: {
    title: "Documentation — Security Intelligence Platform",
    description: "Platform documentation and guides.",
  },
};

const sections = [
  {
    icon: Rocket,
    title: "Getting Started",
    description: "Install, configure, and run your first scan in under 5 minutes.",
    href: "/docs/getting-started",
  },
  {
    icon: BookOpen,
    title: "Guides",
    description: "Step-by-step tutorials for common tasks and workflows.",
    href: "/docs/guides",
  },
  {
    icon: Code2,
    title: "API Reference",
    description: "REST and GraphQL API documentation with examples.",
    href: "/docs/api",
  },
  {
    icon: Terminal,
    title: "CLI",
    description: "Command-line interface reference and usage patterns.",
    href: "/docs/cli",
  },
  {
    icon: Blocks,
    title: "SDK",
    description: "Language SDKs for Python, TypeScript, Go, and Rust.",
    href: "/docs/sdk",
  },
  {
    icon: Server,
    title: "Architecture",
    description: "Technical architecture, data flow, and system design docs.",
    href: "/docs/architecture",
  },
  {
    icon: Upload,
    title: "Deployment",
    description: "Docker, Kubernetes, and cloud deployment guides.",
    href: "/docs/deployment",
  },
  {
    icon: Shield,
    title: "Security",
    description: "Security best practices and hardening guide.",
    href: "/docs/security",
  },
  {
    icon: ClipboardCheck,
    title: "Compliance",
    description: "Compliance frameworks, reports, and audit trails.",
    href: "/docs/compliance",
  },
  {
    icon: Store,
    title: "Marketplace",
    description: "Publishing and managing marketplace extensions.",
    href: "/docs/marketplace",
  },
  {
    icon: Puzzle,
    title: "Plugin Development",
    description: "Build custom plugins with the Plugin SDK.",
    href: "/docs/plugins",
  },
];

export default function DocsPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Documentation" }]}
        title="Documentation"
        description="Everything you need to get started, integrate, and master the Security Intelligence Platform."
      />

      <Container className="py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => (
            <Card
              key={section.title}
              icon={section.icon}
              title={section.title}
              description={section.description}
              href={section.href}
            />
          ))}
        </div>
      </Container>
    </>
  );
}
