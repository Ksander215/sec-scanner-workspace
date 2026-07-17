import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Rules — Marketplace — Security Intelligence Platform",
  description: "Browse custom detection rules, compliance checks, and security policies.",
  openGraph: { title: "Rules — Marketplace", description: "Custom detection rules and security policies." },
};

const rules = [
  { name: "OWASP Top 10 2024", author: "Official", severity: "critical" as const, description: "Complete OWASP Top 10 detection rules updated for 2024." },
  { name: "CWE Top 25", author: "Official", severity: "high" as const, description: "MITRE CWE Top 25 most dangerous software weaknesses detection." },
  { name: "PCI DSS 4.0", author: "Official", severity: "high" as const, description: "Payment Card Industry Data Security Standard compliance rules." },
  { name: "API Security Rules", author: "Community", severity: "high" as const, description: "API-specific detection rules covering BOLA, BFLA, and mass assignment." },
  { name: "Cloud Misconfigurations", author: "Community", severity: "medium" as const, description: "Detection rules for AWS, GCP, and Azure common misconfigurations." },
  { name: "Crypto Best Practices", author: "Community", severity: "medium" as const, description: "Cryptographic implementation checks and weak algorithm detection." },
];

export default function RulesPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Marketplace", href: "/marketplace" }, { label: "Rules" }]}
        title="Rules"
        description="Custom detection rules, compliance checks, and security policies for targeted vulnerability scanning."
      />

      <Container className="py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rules.map((rule) => (
            <Card key={rule.name} title={rule.name} description={rule.description}>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant={rule.severity}>{rule.severity}</Badge>
                <Badge variant={rule.author === "Official" ? "low" : "category"}>
                  {rule.author}
                </Badge>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-12 p-8 rounded-xl bg-surface border border-border text-center">
          <ShieldCheck className="w-8 h-8 text-accent mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Write Custom Rules</h3>
          <p className="text-sm text-muted-2 max-w-lg mx-auto mb-4">
            Define custom detection logic using the YAML-based rule format. Share your rules with the community or keep them private.
          </p>
          <a href="/app/docs/guides" className="inline-flex items-center px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors">
            Rule Writing Guide
          </a>
        </div>
      </Container>
    </>
  );
}
