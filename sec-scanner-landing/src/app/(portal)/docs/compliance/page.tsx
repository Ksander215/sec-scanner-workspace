import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Compliance — Docs — Security Intelligence Platform",
  description: "Compliance frameworks, automated checks, and audit trail documentation.",
  openGraph: { title: "Compliance — Docs", description: "Compliance documentation." },
};

const frameworks = [
  { name: "PCI DSS 4.0", status: "Supported", description: "Payment Card Industry Data Security Standard with automated requirement mapping." },
  { name: "SOC 2 Type II", status: "Supported", description: "Service Organization Control with continuous monitoring and evidence collection." },
  { name: "ISO 27001", status: "Supported", description: "Information security management system with Annex A control mapping." },
  { name: "GDPR", status: "Supported", description: "General Data Protection Regulation data processing and privacy assessments." },
  { name: "HIPAA", status: "Beta", description: "Health Insurance Portability and Accountability Act security rule checks." },
  { name: "NIST CSF", status: "Beta", description: "NIST Cybersecurity Framework core function assessment and scoring." },
];

export default function CompliancePage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Compliance" }]}
        title="Compliance"
        description="Automated compliance monitoring and reporting for major security frameworks."
      />

      <Container className="py-16">
        <div className="max-w-3xl mx-auto space-y-4">
          {frameworks.map((fw) => (
            <div key={fw.name} className="p-5 rounded-xl bg-surface border border-border flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-base font-semibold text-foreground">{fw.name}</h3>
                  <Badge variant={fw.status === "Supported" ? "low" : "medium"}>{fw.status}</Badge>
                </div>
                <p className="text-sm text-muted-2">{fw.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 max-w-3xl mx-auto p-6 rounded-xl bg-surface border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-3">Audit Trail</h3>
          <p className="text-sm text-muted-2 leading-relaxed">
            Every scan, finding, user action, and configuration change is logged with timestamps, user identity,
            and IP addresses. Audit logs are immutable and can be exported to your SIEM for long-term retention.
          </p>
        </div>
      </Container>
    </>
  );
}
