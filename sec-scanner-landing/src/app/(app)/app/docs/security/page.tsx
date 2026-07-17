import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Security — Docs — Security Intelligence Platform",
  description: "Security best practices, hardening guide, and vulnerability disclosure policy.",
  openGraph: { title: "Security — Docs", description: "Security best practices." },
};

export default function DocsSecurityPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Docs", href: "/app/docs" }, { label: "Security" }]}
        title="Security"
        description="Security best practices, platform hardening, and vulnerability disclosure policy."
      />

      <Container className="py-16">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">Responsible Disclosure</h3>
            <p className="text-sm text-muted-2 leading-relaxed">
              We take security seriously. If you discover a vulnerability in the platform, please report it responsibly
              to <a href="mailto:security@sec-scanner.pro" className="text-accent hover:underline">security@sec-scanner.pro</a>.
              We commit to acknowledging reports within 24 hours and providing a fix timeline within 72 hours.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">Platform Hardening</h3>
            <ul className="space-y-2 text-sm text-muted-2">
              <li className="flex items-start gap-2"><span className="text-accent">•</span> Enable HTTPS with TLS 1.3 for all communications</li>
              <li className="flex items-start gap-2"><span className="text-accent">•</span> Configure RBAC with least-privilege principles</li>
              <li className="flex items-start gap-2"><span className="text-accent">•</span> Enable audit logging for all API operations</li>
              <li className="flex items-start gap-2"><span className="text-accent">•</span> Set up network policies to isolate scan engines</li>
              <li className="flex items-start gap-2"><span className="text-accent">•</span> Rotate API keys and secrets regularly</li>
              <li className="flex items-start gap-2"><span className="text-accent">•</span> Keep the platform and plugins updated</li>
            </ul>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">Data Security</h3>
            <p className="text-sm text-muted-2 leading-relaxed">
              All scan data and findings are encrypted at rest using AES-256 and in transit using TLS 1.3.
              The self-hosted version stores all data within your infrastructure — nothing leaves your network.
            </p>
          </div>
        </div>
      </Container>
    </>
  );
}
