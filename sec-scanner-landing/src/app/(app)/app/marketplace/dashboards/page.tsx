import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { LayoutDashboard } from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboards — Marketplace — Security Intelligence Platform",
  description: "Pre-configured visualization dashboards for reporting and metrics.",
  openGraph: { title: "Dashboards — Marketplace", description: "Visualization dashboards." },
};

const dashboards = [
  { name: "Executive Summary", type: "Reporting", description: "High-level risk posture overview for C-level stakeholders with trend analysis." },
  { name: "Vulnerability Tracker", type: "Operations", description: "Real-time vulnerability status board with assignment and SLA tracking." },
  { name: "Compliance Posture", type: "Compliance", description: "Framework-specific compliance status with gap analysis and remediation progress." },
  { name: "Attack Surface Map", type: "Operations", description: "Visual representation of your external attack surface with risk scoring." },
  { name: "Team Performance", type: "Metrics", description: "Security team KPIs: mean time to remediate, scan coverage, and finding trends." },
  { name: "Threat Intelligence", type: "Threats", description: "Live threat feed integration with CVE impact analysis on your assets." },
];

export default function DashboardsPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Marketplace", href: "/marketplace" }, { label: "Dashboards" }]}
        title="Dashboards"
        description="Pre-configured visualization dashboards for executive reporting, operations, and compliance monitoring."
      />

      <Container className="py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboards.map((dash) => (
            <Card key={dash.name} title={dash.name} description={dash.description}>
              <div className="mt-3">
                <Badge variant="category">{dash.type}</Badge>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-12 p-8 rounded-xl bg-surface border border-border text-center">
          <LayoutDashboard className="w-8 h-8 text-accent mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Custom Dashboards</h3>
          <p className="text-sm text-muted-2 max-w-lg mx-auto">
            Build custom dashboards with the drag-and-drop builder. Combine charts, tables, and widgets to create the view you need.
          </p>
        </div>
      </Container>
    </>
  );
}
