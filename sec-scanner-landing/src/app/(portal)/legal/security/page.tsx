import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Security Policy — Security Intelligence Platform",
  description: "Security vulnerability disclosure policy and security practices for the Security Intelligence Platform.",
  openGraph: { title: "Security Policy", description: "Vulnerability disclosure policy." },
};

export default function LegalSecurityPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Legal" }, { label: "Security Policy" }]}
        title="Security Policy"
        description="Our commitment to security and vulnerability disclosure process."
      />

      <Container className="py-16">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="p-6 rounded-xl bg-surface border border-border">
            <p className="text-xs text-muted mb-4">Last updated: January 15, 2025</p>
            <h3 className="text-lg font-semibold text-foreground mb-3">1. Reporting Vulnerabilities</h3>
            <p className="text-sm text-muted-2 leading-relaxed">
              If you discover a security vulnerability in the Security Intelligence Platform, we encourage
              responsible disclosure. Please report vulnerabilities to{" "}
              <a href="mailto:security@sec-scanner.pro" className="text-accent hover:underline">
                security@sec-scanner.pro
              </a>{" "}
              with details about the issue, steps to reproduce, and potential impact.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">2. Our Commitment</h3>
            <ul className="space-y-2 text-sm text-muted-2">
              <li className="flex items-start gap-2"><span className="text-accent">•</span> Acknowledge reports within 24 hours</li>
              <li className="flex items-start gap-2"><span className="text-accent">•</span> Provide an initial assessment within 72 hours</li>
              <li className="flex items-start gap-2"><span className="text-accent">•</span> Keep reporters informed of progress</li>
              <li className="flex items-start gap-2"><span className="text-accent">•</span> Credit researchers in our security advisories (with permission)</li>
              <li className="flex items-start gap-2"><span className="text-accent">•</span> Not pursue legal action against good-faith researchers</li>
            </ul>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">3. Scope</h3>
            <p className="text-sm text-muted-2 leading-relaxed">
              This policy applies to the core platform, CLI, SDKs, and official plugins. Third-party plugins
              should be reported to their respective maintainers. Out of scope: social engineering, denial of
              service, and physical attacks.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">4. Bug Bounty</h3>
            <p className="text-sm text-muted-2 leading-relaxed">
              We run a bug bounty program for critical vulnerabilities. Rewards range from $100 to $5,000
              depending on severity and impact. Contact us for details on scope and eligibility.
            </p>
          </div>
        </div>
      </Container>
    </>
  );
}
