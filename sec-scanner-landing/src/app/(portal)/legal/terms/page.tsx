import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Terms of Service — Security Intelligence Platform",
  description: "Terms of service for the Security Intelligence Platform.",
  openGraph: { title: "Terms of Service", description: "Terms and conditions." },
};

export default function TermsPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Legal" }, { label: "Terms of Service" }]}
        title="Terms of Service"
        description="Terms and conditions for using the Security Intelligence Platform."
      />

      <Container className="py-16">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="p-6 rounded-xl bg-surface border border-border">
            <p className="text-xs text-muted mb-4">Last updated: January 15, 2025</p>
            <h3 className="text-lg font-semibold text-foreground mb-3">1. Acceptance of Terms</h3>
            <p className="text-sm text-muted-2 leading-relaxed">
              By accessing or using the Security Intelligence Platform, you agree to be bound by these Terms
              of Service. If you do not agree to these terms, you may not access or use the platform.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">2. Open Source License</h3>
            <p className="text-sm text-muted-2 leading-relaxed">
              The Security Intelligence Platform core is licensed under the MIT License. You are free to use,
              modify, and distribute the software in accordance with the license terms. Premium features and
              cloud services are subject to separate commercial terms.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">3. Acceptable Use</h3>
            <p className="text-sm text-muted-2 leading-relaxed">
              You agree to use the platform only for lawful security testing on systems you own or have
              explicit authorization to test. Unauthorized scanning of third-party systems is prohibited.
              You are responsible for ensuring compliance with applicable laws and regulations.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">4. Service Availability</h3>
            <p className="text-sm text-muted-2 leading-relaxed">
              We strive to maintain 99.9% uptime for cloud services but do not guarantee uninterrupted
              availability. Self-hosted deployments are under your control and not subject to SLA terms
              unless covered by an Enterprise agreement.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">5. Contact</h3>
            <p className="text-sm text-muted-2 leading-relaxed">
              For legal inquiries, contact us at{" "}
              <a href="mailto:legal@sec-scanner.pro" className="text-accent hover:underline">
                legal@sec-scanner.pro
              </a>.
            </p>
          </div>
        </div>
      </Container>
    </>
  );
}
