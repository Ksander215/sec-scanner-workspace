import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Changelog — Security Intelligence Platform",
  description: "Release notes and updates for the Security Intelligence Platform.",
  openGraph: {
    title: "Changelog — Security Intelligence Platform",
    description: "Release notes and updates.",
  },
};

const releases = [
  {
    version: "v0.9.0",
    date: "2025-01-15",
    tag: "Latest",
    changes: [
      { type: "feature", text: "Added AI-powered false positive reduction engine" },
      { type: "feature", text: "New GraphQL API scanning module" },
      { type: "improvement", text: "Correlation engine now handles 3x more findings" },
      { type: "fix", text: "Fixed memory leak in long-running DAST scans" },
      { type: "fix", text: "Resolved CSS rendering issue in PDF reports" },
    ],
  },
  {
    version: "v0.8.2",
    date: "2024-12-20",
    tag: null,
    changes: [
      { type: "feature", text: "Kubernetes CIS benchmark scanning" },
      { type: "improvement", text: "CLI now supports parallel scan profiles" },
      { type: "fix", text: "Fixed authentication flow for OAuth2-protected targets" },
    ],
  },
  {
    version: "v0.8.0",
    date: "2024-11-10",
    tag: null,
    changes: [
      { type: "feature", text: "Plugin marketplace integration" },
      { type: "feature", text: "Custom dashboard builder" },
      { type: "improvement", text: "Dashboard loading time reduced by 60%" },
      { type: "fix", text: "Fixed timezone handling in scheduled scans" },
    ],
  },
  {
    version: "v0.7.0",
    date: "2024-09-28",
    tag: null,
    changes: [
      { type: "feature", text: "Initial compliance monitoring module (PCI DSS, SOC 2)" },
      { type: "feature", text: "REST API v2 with GraphQL support" },
      { type: "improvement", text: "Scan results now stream in real-time" },
    ],
  },
];

const typeColors: Record<string, "critical" | "high" | "medium" | "info"> = {
  feature: "info",
  improvement: "medium",
  fix: "high",
};

export default function ChangelogPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Product" }, { label: "Changelog" }]}
        title="Changelog"
        description="What's new in the Security Intelligence Platform. Every release, every improvement."
      />

      <Container className="py-16">
        <div className="max-w-3xl mx-auto space-y-12">
          {releases.map((release) => (
            <div key={release.version} className="relative pl-8 border-l-2 border-border">
              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-accent border-2 border-background" />
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-lg font-bold text-foreground">{release.version}</h3>
                {release.tag && <Badge variant="low">{release.tag}</Badge>}
                <span className="text-sm text-muted">{release.date}</span>
              </div>
              <ul className="space-y-2">
                {release.changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-2">
                    <Badge variant={typeColors[change.type]}>{change.type}</Badge>
                    <span>{change.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </>
  );
}
