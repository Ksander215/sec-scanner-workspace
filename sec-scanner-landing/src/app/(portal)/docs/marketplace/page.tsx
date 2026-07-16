import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Store, Upload, DollarSign, BarChart3, PackageCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Marketplace Docs — Docs — Security Intelligence Platform",
  description: "Documentation for publishing, managing, and consuming marketplace extensions.",
  openGraph: { title: "Marketplace Docs", description: "Marketplace documentation." },
};

const topics = [
  { icon: Store, title: "Browsing & Installing", description: "How to find, evaluate, and install extensions from the marketplace." },
  { icon: Upload, title: "Publishing Your Extension", description: "Submit your plugin, rule pack, or connector for community distribution." },
  { icon: PackageCheck, title: "Review Guidelines", description: "Quality standards, security review process, and approval criteria." },
  { icon: BarChart3, title: "Analytics & Metrics", description: "Track downloads, ratings, and usage metrics for your published extensions." },
  { icon: DollarSign, title: "Monetization", description: "Premium extension pricing, licensing, and revenue sharing options." },
];

export default function DocsMarketplacePage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Marketplace" }]}
        title="Marketplace Documentation"
        description="Everything you need to publish, manage, and consume marketplace extensions."
      />

      <Container className="py-16">
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {topics.map((topic) => (
            <Card key={topic.title} icon={topic.icon} title={topic.title} description={topic.description} />
          ))}
        </div>
      </Container>
    </>
  );
}
