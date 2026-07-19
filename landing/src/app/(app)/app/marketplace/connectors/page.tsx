import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Cable } from "lucide-react";

export const metadata: Metadata = {
  title: "Connectors — Marketplace — Security Intelligence Platform",
  description: "Data source connectors for ticketing, messaging, SIEM, and workflow tools.",
  openGraph: { title: "Connectors — Marketplace", description: "Data source connectors." },
};

const connectors = [
  { name: "Jira", category: "Ticketing", description: "Create and update Jira tickets from findings with custom field mapping." },
  { name: "Slack", category: "Messaging", description: "Send real-time alerts and weekly digests to Slack channels." },
  { name: "PagerDuty", category: "Incident Management", description: "Escalate critical findings to on-call responders automatically." },
  { name: "Splunk", category: "SIEM", description: "Forward security events and findings to Splunk for correlation." },
  { name: "Elasticsearch", category: "SIEM", description: "Index findings in Elasticsearch for custom analytics and visualization." },
  { name: "Microsoft Teams", category: "Messaging", description: "Post security alerts and reports directly to Teams channels." },
];

export default function ConnectorsPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Marketplace", href: "/app/marketplace" }, { label: "Connectors" }]}
        title="Connectors"
        description="Data source connectors for ticketing, messaging, SIEM, and workflow automation tools."
      />

      <Container className="py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {connectors.map((conn) => (
            <Card key={conn.name} title={conn.name} description={conn.description}>
              <div className="mt-3">
                <Badge variant="category">{conn.category}</Badge>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-12 p-8 rounded-xl bg-surface border border-border text-center">
          <Cable className="w-8 h-8 text-accent mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Need a Custom Connector?</h3>
          <p className="text-sm text-muted-2 max-w-lg mx-auto mb-4">
            Build connectors using the universal webhook framework or request one from the community.
          </p>
          <a href="/app/docs/guides" className="inline-flex items-center px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors">
            Connector SDK Guide
          </a>
        </div>
      </Container>
    </>
  );
}
