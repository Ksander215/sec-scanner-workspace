import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import {
  Puzzle,
  ShieldCheck,
  Cable,
  LayoutTemplate,
  LayoutDashboard,
  Link2,
  Palette,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Marketplace — Security Intelligence Platform",
  description: "Browse plugins, rules, connectors, templates, dashboards, integrations, themes, and AI prompts for the Security Intelligence Platform.",
  openGraph: {
    title: "Marketplace — Security Intelligence Platform",
    description: "Browse extensions and integrations for the platform.",
  },
};

const categories = [
  {
    icon: Puzzle,
    title: "Plugins",
    description: "Extend the platform with custom scanning engines, data processors, and workflow automation tools.",
    href: "/marketplace/plugins",
    count: "24+",
  },
  {
    icon: ShieldCheck,
    title: "Rules",
    description: "Custom detection rules, compliance checks, and security policies for targeted scanning.",
    href: "/marketplace/rules",
    count: "150+",
  },
  {
    icon: Cable,
    title: "Connectors",
    description: "Data source integrations for Jira, Slack, PagerDuty, Splunk, and other tools.",
    href: "/marketplace/connectors",
    count: "18+",
  },
  {
    icon: LayoutTemplate,
    title: "Templates",
    description: "Pre-built scan templates for common stacks: React, Spring, Django, Express, and more.",
    href: "/marketplace/templates",
    count: "30+",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboards",
    description: "Pre-configured visualization dashboards for executive reporting and team metrics.",
    href: "/marketplace/dashboards",
    count: "12+",
  },
  {
    icon: Link2,
    title: "Integrations",
    description: "Third-party platform integrations: GitHub, GitLab, Jenkins, AWS, GCP, Azure.",
    href: "/marketplace/integrations",
    count: "20+",
  },
  {
    icon: Palette,
    title: "Themes",
    description: "Custom UI themes and appearance packages for the platform dashboard.",
    href: "/marketplace/themes",
    count: "8+",
  },
  {
    icon: Sparkles,
    title: "AI Prompts",
    description: "Curated AI prompt templates for vulnerability analysis, report writing, and remediation guidance.",
    href: "/marketplace/ai-prompts",
    count: "15+",
  },
];

export default function MarketplacePage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Marketplace" }]}
        title="Marketplace"
        description="Extend and customize the Security Intelligence Platform with community and official extensions. From scanning plugins to AI prompts."
      />

      <Container className="py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => (
            <Card
              key={cat.title}
              icon={cat.icon}
              title={cat.title}
              description={cat.description}
              href={cat.href}
              badge={cat.count}
            />
          ))}
        </div>
      </Container>
    </>
  );
}
