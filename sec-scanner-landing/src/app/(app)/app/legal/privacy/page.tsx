import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Privacy Policy — Security Intelligence Platform",
  description: "Privacy policy for the Security Intelligence Platform — how we collect, use, and protect your data.",
  openGraph: { title: "Privacy Policy", description: "Data privacy information." },
};

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Legal" }, { label: "Privacy Policy" }]}
        title="Privacy Policy"
        description="How we collect, use, and protect your data."
      />

      <Container className="py-16">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="p-6 rounded-xl bg-surface border border-border">
            <p className="text-xs text-muted mb-4">Last updated: January 15, 2025</p>
            <h3 className="text-lg font-semibold text-foreground mb-3">1. Data Collection</h3>
            <p className="text-sm text-muted-2 leading-relaxed">
              The Security Intelligence Platform collects minimal data necessary to provide the service.
              For self-hosted deployments, all data remains within your infrastructure. For the cloud SaaS offering,
              we collect account information (email, name), scan metadata (targets, schedules), and usage analytics.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">2. Data Usage</h3>
            <p className="text-sm text-muted-2 leading-relaxed">
              We use collected data solely to provide and improve the service. Scan results and findings are
              never shared with third parties. Anonymous, aggregated usage statistics may be used to improve
              product features and user experience.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">3. Data Security</h3>
            <p className="text-sm text-muted-2 leading-relaxed">
              All data is encrypted at rest (AES-256) and in transit (TLS 1.3). Access to production data
              is restricted to authorized personnel with multi-factor authentication. We conduct regular
              security audits and penetration testing.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">4. Your Rights</h3>
            <p className="text-sm text-muted-2 leading-relaxed">
              You have the right to access, export, and delete your data at any time through the dashboard
              settings or by contacting us. For EU residents, additional GDPR rights apply including the
              right to data portability and the right to object to processing.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">5. Contact</h3>
            <p className="text-sm text-muted-2 leading-relaxed">
              For privacy-related inquiries, contact our Data Protection Officer at{" "}
              <a href="mailto:privacy@sec-scanner.pro" className="text-accent hover:underline">
                privacy@sec-scanner.pro
              </a>.
            </p>
          </div>
        </div>
      </Container>
    </>
  );
}
