import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Dashboard — Security Intelligence Platform",
  description: "Security dashboard — overview of scans, findings, and risk posture.",
  openGraph: { title: "Dashboard", description: "Security dashboard." },
};

const metrics = [
  { label: "Active Scans", value: "3", change: "+1 today" },
  { label: "Total Findings", value: "847", change: "-12 this week" },
  { label: "Critical", value: "4", change: "2 unassigned" },
  { label: "Risk Score", value: "72/100", change: "↓ 3 pts" },
];

const recentFindings = [
  { title: "SQL Injection in /api/v1/users", severity: "critical" as const, target: "app.example.com", age: "2h ago" },
  { title: "XSS (Reflected) in /search", severity: "high" as const, target: "app.example.com", age: "4h ago" },
  { title: "Missing CSP Header", severity: "medium" as const, target: "portal.example.com", age: "1d ago" },
  { title: "Outdated TLS Configuration", severity: "medium" as const, target: "api.example.com", age: "2d ago" },
  { title: "Information Disclosure", severity: "low" as const, target: "staging.example.com", age: "3d ago" },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "App" }, { label: "Dashboard" }]}
        title="Dashboard"
        description="Overview of your security posture, active scans, and recent findings."
      />

      <Container className="py-8">
        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {metrics.map((m) => (
            <div key={m.label} className="p-5 rounded-xl bg-surface border border-border">
              <div className="text-xs text-muted uppercase tracking-wider mb-1">{m.label}</div>
              <div className="text-2xl font-bold text-foreground">{m.value}</div>
              <div className="text-xs text-muted-2 mt-1">{m.change}</div>
            </div>
          ))}
        </div>

        {/* Recent findings */}
        <div className="rounded-xl bg-surface border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Recent Findings</h3>
            <Badge variant="category">Live Preview</Badge>
          </div>
          <div className="divide-y divide-border">
            {recentFindings.map((f) => (
              <div key={f.title} className="px-5 py-3 flex items-center gap-3 hover:bg-surface-2 transition-colors">
                <Badge variant={f.severity}>{f.severity}</Badge>
                <span className="text-sm text-foreground flex-1 truncate">{f.title}</span>
                <span className="text-xs text-muted hidden sm:block">{f.target}</span>
                <span className="text-xs text-muted-2">{f.age}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 p-6 rounded-xl bg-surface border border-border text-center">
          <p className="text-sm text-muted-2 mb-3">
            This is a static preview of the dashboard. The full interactive version is available in the SaaS deployment.
          </p>
          <a
            href="/demo"
            className="inline-flex items-center px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors"
          >
            Try Interactive Demo
          </a>
        </div>
      </Container>
    </>
  );
}
