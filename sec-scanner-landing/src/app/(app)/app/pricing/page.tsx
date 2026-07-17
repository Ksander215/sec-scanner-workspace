import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing — Security Intelligence Platform",
  description: "Simple, transparent pricing for teams of any size. Start free, scale as you grow.",
  openGraph: {
    title: "Pricing — Security Intelligence Platform",
    description: "Simple, transparent pricing for teams of any size.",
  },
};

const plans = [
  {
    name: "Community",
    price: "Free",
    period: "forever",
    description: "For individual researchers and small projects.",
    features: [
      "Up to 5 targets",
      "Basic DAST scanning",
      "Community rules",
      "CLI access",
      "GitHub integration",
      "Community support",
    ],
    cta: "Get Started",
    ctaHref: "/app/demo",
    highlighted: false,
  },
  {
    name: "Team",
    price: "$49",
    period: "/user/month",
    description: "For security teams managing multiple projects.",
    features: [
      "Unlimited targets",
      "DAST + SAST + API scanning",
      "Premium rules & plugins",
      "CI/CD integration",
      "Team collaboration",
      "Compliance reports",
      "Priority support",
      "Custom dashboards",
    ],
    cta: "Start Trial",
    ctaHref: "/app/demo",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For organizations with advanced security needs.",
    features: [
      "Everything in Team",
      "On-premise deployment",
      "SSO / SAML / LDAP",
      "Custom SLA",
      "Dedicated support engineer",
      "AI-powered triage",
      "Threat intelligence feeds",
      "Audit logging & SIEM",
      "White-label options",
    ],
    cta: "Contact Sales",
    ctaHref: "mailto:hello@sec-scanner.pro",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Pricing" }]}
        title="Simple, Transparent Pricing"
        description="Start free with the Community edition. Upgrade when your team needs advanced scanning, compliance, and collaboration features."
      />

      <Container className="py-16">
        <div className="grid lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-8 rounded-xl border transition-all duration-300 ${
                plan.highlighted
                  ? "bg-surface border-accent/30 shadow-[0_0_30px_rgba(0,255,136,0.08)]"
                  : "bg-surface border-border hover:border-border-light"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="low">Most Popular</Badge>
                </div>
              )}
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                {plan.period && <span className="text-sm text-muted">{plan.period}</span>}
              </div>
              <p className="mt-2 text-sm text-muted-2">{plan.description}</p>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-muted-2">
                    <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={plan.ctaHref}
                className={`mt-8 block w-full py-2.5 rounded-lg text-sm font-medium text-center transition-colors ${
                  plan.highlighted
                    ? "bg-accent text-background hover:bg-accent-hover"
                    : "bg-surface-2 text-foreground border border-border hover:border-border-light"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-muted-2">
          All plans include access to the open-source core. No credit card required for Community.
        </div>
      </Container>
    </>
  );
}
