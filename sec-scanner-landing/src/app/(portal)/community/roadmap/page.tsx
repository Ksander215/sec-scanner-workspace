import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Roadmap — Community — Security Intelligence Platform",
  description: "Product roadmap — see what's planned, in progress, and recently shipped.",
  openGraph: { title: "Roadmap — Community", description: "Product roadmap." },
};

const roadmapItems = [
  { title: "Cloud Scanning Module", status: "In Progress", description: "AWS, GCP, and Azure misconfiguration detection with CIS benchmark validation.", quarter: "Q1 2025" },
  { title: "Mobile App Security", status: "Planned", description: "Static and dynamic analysis for iOS and Android applications.", quarter: "Q2 2025" },
  { title: "AI Remediation Assistant", status: "In Progress", description: "AI-powered remediation guidance with code examples and step-by-step instructions.", quarter: "Q1 2025" },
  { title: "Custom Compliance Frameworks", status: "Planned", description: "Build and share custom compliance frameworks with requirement mapping.", quarter: "Q2 2025" },
  { title: "Team Collaboration v2", status: "Planned", description: "Enhanced team features: comments, assignments, SLA tracking, and workflows.", quarter: "Q3 2025" },
  { title: "SBOM Generation", status: "Completed", description: "Software Bill of Materials generation from scan results with CycloneDX support.", quarter: "Q4 2024" },
  { title: "Plugin Marketplace v2", status: "Completed", description: "Redesigned marketplace with ratings, reviews, and verified publisher badges.", quarter: "Q4 2024" },
];

const statusVariant: Record<string, "info" | "medium" | "low"> = {
  "In Progress": "info",
  "Planned": "medium",
  "Completed": "low",
};

export default function RoadmapPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Community", href: "/community" }, { label: "Roadmap" }]}
        title="Roadmap"
        description="See what's planned, what's in progress, and what we've recently shipped."
      />

      <Container className="py-16">
        <div className="max-w-3xl mx-auto space-y-4">
          {roadmapItems.map((item) => (
            <div key={item.title} className="p-5 rounded-xl bg-surface border border-border">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                    <Badge variant={statusVariant[item.status]}>{item.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-2">{item.description}</p>
                </div>
                <span className="text-xs text-muted shrink-0">{item.quarter}</span>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </>
  );
}
