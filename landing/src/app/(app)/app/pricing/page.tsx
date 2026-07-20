"use client";

import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Check, X, Shield, Zap, Building2, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { motion } from "framer-motion";
import { ContextualHelp } from "@/components/ui/ContextualHelp";
import { SectionFAQ } from "@/components/ui/SectionFAQ";
import { SmartNextStep, RECOMMENDATION_CHAINS } from "@/components/ui/SmartNextStep";

/* ─── Feature definition ────────────────────────────────────────── */
interface PlanFeature {
  /** i18n key for display text (already includes value, e.g. "1 project") */
  key: string;
  /** true = check, false = cross */
  included: boolean;
}

interface Plan {
  id: string;
  nameKey: string;
  priceKey: string;
  priceSuffix?: string;
  descKey: string;
  ctaKey: string;
  highlighted: boolean;
  icon: React.ElementType;
  features: PlanFeature[];
}

const plans: Plan[] = [
  {
    id: "free",
    nameKey: "pricing2.free",
    priceKey: "pricing2.free.price",
    descKey: "pricing2.free.desc",
    ctaKey: "pricing2.free.cta",
    highlighted: false,
    icon: Shield,
    features: [
      { key: "pricing2.feature.demo", included: true },
      { key: "pricing2.feature.1project", included: true },
      { key: "pricing2.feature.2members", included: true },
      { key: "pricing2.feature.reports", included: true },
      { key: "pricing2.feature.realScans", included: false },
      { key: "pricing2.feature.github", included: false },
      { key: "pricing2.feature.emailReports", included: false },
      { key: "pricing2.feature.scheduler", included: false },
      { key: "pricing2.feature.marketplace", included: false },
      { key: "pricing2.feature.api", included: false },
      { key: "pricing2.feature.ssh", included: false },
      { key: "pricing2.feature.team", included: false },
      { key: "pricing2.feature.integrations", included: false },
      { key: "pricing2.feature.automation", included: false },
    ],
  },
  {
    id: "professional",
    nameKey: "pricing2.professional",
    priceKey: "pricing2.professional.price",
    priceSuffix: "pricing2.perMonth",
    descKey: "pricing2.professional.desc",
    ctaKey: "pricing2.professional.cta",
    highlighted: true,
    icon: Zap,
    features: [
      { key: "pricing2.feature.realScans", included: true },
      { key: "pricing2.feature.github", included: true },
      { key: "pricing2.feature.emailReports", included: true },
      { key: "pricing2.feature.scheduler", included: true },
      { key: "pricing2.feature.marketplace", included: true },
      { key: "pricing2.feature.api", included: true },
      { key: "pricing2.feature.ssh", included: true },
      { key: "pricing2.feature.teamUpTo10", included: true },
      { key: "pricing2.feature.upTo20projects", included: true },
      { key: "pricing2.feature.webhook", included: true },
      { key: "pricing2.feature.integrations", included: true },
      { key: "pricing2.feature.scheduledScan", included: true },
      { key: "pricing2.feature.sso", included: false },
      { key: "pricing2.feature.ldap", included: false },
      { key: "pricing2.feature.auditLog", included: false },
      { key: "pricing2.feature.ai", included: false },
    ],
  },
  {
    id: "enterprise",
    nameKey: "pricing2.enterprise",
    priceKey: "pricing2.enterprise.price",
    priceSuffix: "pricing2.perMonth",
    descKey: "pricing2.enterprise.desc",
    ctaKey: "pricing2.enterprise.cta",
    highlighted: false,
    icon: Building2,
    features: [
      { key: "pricing2.feature.realScans", included: true },
      { key: "pricing2.feature.github", included: true },
      { key: "pricing2.feature.emailReports", included: true },
      { key: "pricing2.feature.scheduler", included: true },
      { key: "pricing2.feature.marketplace", included: true },
      { key: "pricing2.feature.api", included: true },
      { key: "pricing2.feature.ssh", included: true },
      { key: "pricing2.feature.unlimitedProjects", included: true },
      { key: "pricing2.feature.unlimitedUsers", included: true },
      { key: "pricing2.feature.sso", included: true },
      { key: "pricing2.feature.ldap", included: true },
      { key: "pricing2.feature.auditLog", included: true },
      { key: "pricing2.feature.ai", included: true },
      { key: "pricing2.feature.privateMarketplace", included: true },
      { key: "pricing2.feature.onpremise", included: true },
      { key: "pricing2.feature.prioritySupport", included: true },
    ],
  },
];

/* ─── Comparison matrix rows ────────────────────────────────────── */
interface ComparisonRow {
  featureKey: string;
  free: boolean | string;
  professional: boolean | string;
  enterprise: boolean | string;
}

const comparisonRows: ComparisonRow[] = [
  { featureKey: "pricing2.feature.demo", free: true, professional: true, enterprise: true },
  { featureKey: "pricing2.feature.projects", free: "1", professional: "20", enterprise: true },
  { featureKey: "pricing2.feature.members", free: "2", professional: "10", enterprise: true },
  { featureKey: "pricing2.feature.reports", free: true, professional: true, enterprise: true },
  { featureKey: "pricing2.feature.realScans", free: false, professional: true, enterprise: true },
  { featureKey: "pricing2.feature.github", free: false, professional: true, enterprise: true },
  { featureKey: "pricing2.feature.emailReports", free: false, professional: true, enterprise: true },
  { featureKey: "pricing2.feature.scheduler", free: false, professional: true, enterprise: true },
  { featureKey: "pricing2.feature.marketplace", free: false, professional: true, enterprise: true },
  { featureKey: "pricing2.feature.api", free: false, professional: true, enterprise: true },
  { featureKey: "pricing2.feature.ssh", free: false, professional: true, enterprise: true },
  { featureKey: "pricing2.feature.team", free: false, professional: true, enterprise: true },
  { featureKey: "pricing2.feature.integrations", free: false, professional: true, enterprise: true },
  { featureKey: "pricing2.feature.automation", free: false, professional: true, enterprise: true },
  { featureKey: "pricing2.feature.webhook", free: false, professional: true, enterprise: true },
  { featureKey: "pricing2.feature.scheduledScan", free: false, professional: true, enterprise: true },
  { featureKey: "pricing2.feature.sso", free: false, professional: false, enterprise: true },
  { featureKey: "pricing2.feature.ldap", free: false, professional: false, enterprise: true },
  { featureKey: "pricing2.feature.auditLog", free: false, professional: false, enterprise: true },
  { featureKey: "pricing2.feature.ai", free: false, professional: false, enterprise: true },
  { featureKey: "pricing2.feature.privateMarketplace", free: false, professional: false, enterprise: true },
  { featureKey: "pricing2.feature.onpremise", free: false, professional: false, enterprise: true },
  { featureKey: "pricing2.feature.prioritySupport", free: false, professional: false, enterprise: true },
];

/* ─── Cell renderer for comparison table ────────────────────────── */
function CellValue({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="text-sm font-medium text-foreground">{value}</span>;
  }
  if (value) {
    return <Check className="w-4 h-4 text-accent mx-auto" />;
  }
  return <X className="w-4 h-4 text-muted/40 mx-auto" />;
}

/* ─── Page component ────────────────────────────────────────────── */
export default function PricingPage() {
  const { t } = useI18n();

  return (
    <>
      {/* Header */}
      <div id="pricing-header" className="border-b border-border bg-surface/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-foreground"
          >
            {t("pricing2.title")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-sm text-muted-2 mt-2"
          >
            {t("pricing2.subtitle")}
          </motion.p>
          <div className="flex items-center gap-2 mt-2">
            <ContextualHelp section="pricing" />
          </div>
        </div>
      </div>

      <Container className="py-12">
        {/* ── Pricing cards ── */}
        <div id="pricing-plans" className="grid lg:grid-cols-3 gap-6 items-start">
          {plans.map((plan, idx) => {
            const Icon = plan.icon;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`relative p-6 rounded-xl border transition-all duration-300 ${
                  plan.highlighted
                    ? "bg-surface border-accent/30 shadow-[0_0_40px_rgba(0,255,136,0.1)] lg:scale-105 lg:-my-3"
                    : "bg-surface border-border hover:border-border-light"
                }`}
              >
                {/* Popular badge */}
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge variant="low">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {t("pricing2.popular")}
                    </Badge>
                  </div>
                )}

                {/* Tier icon + name */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      plan.highlighted
                        ? "bg-accent-muted"
                        : "bg-surface-2 border border-border"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        plan.highlighted ? "text-accent" : "text-muted-2"
                      }`}
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {t(plan.nameKey)}
                  </h3>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-bold text-foreground">
                    {t(plan.priceKey)}
                  </span>
                  {plan.priceSuffix && (
                    <span className="text-sm text-muted">
                      {t(plan.priceSuffix)}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="mt-2 text-sm text-muted-2 leading-relaxed">
                  {t(plan.descKey)}
                </p>

                {/* Feature list */}
                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature.key}
                      className={`flex items-start gap-2.5 text-sm ${
                        feature.included ? "text-muted-2" : "text-muted/50"
                      }`}
                    >
                      {feature.included ? (
                        <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-4 h-4 text-muted/40 shrink-0 mt-0.5" />
                      )}
                      <span>{t(feature.key)}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA button */}
                <Button
                  variant={plan.highlighted ? "primary" : "outline"}
                  size="lg"
                  className="mt-6 w-full"
                  onClick={() => {
                    if (plan.id === "enterprise") {
                      window.location.href = "mailto:hello@sec-scanner.pro";
                    } else {
                      window.location.href = "/app/dashboard";
                    }
                  }}
                >
                  {t(plan.ctaKey)}
                </Button>
              </motion.div>
            );
          })}
        </div>

        {/* ── Footnote ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center text-sm text-muted-2"
        >
          {t("pricing2.subtitle")}
        </motion.p>

        {/* ── Feature comparison table ── */}
        <motion.section id="pricing-comparison"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16"
        >
          <h2 className="text-xl font-bold text-foreground mb-6">
            {t("pricing2.comparison.title")}
          </h2>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-2 border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-2 whitespace-nowrap">
                    {t("pricing2.comparison.feature")}
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-foreground whitespace-nowrap">
                    {t("pricing2.free")}
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-accent whitespace-nowrap">
                    {t("pricing2.professional")}
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-foreground whitespace-nowrap">
                    {t("pricing2.enterprise")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr
                    key={row.featureKey}
                    className={`border-b border-border last:border-b-0 ${
                      i % 2 === 0 ? "bg-surface" : "bg-surface/50"
                    }`}
                  >
                    <td className="py-2.5 px-4 text-muted-2 whitespace-nowrap">
                      {t(row.featureKey)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <CellValue value={row.free} />
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <CellValue value={row.professional} />
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <CellValue value={row.enterprise} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>
      </Container>

      <div id="pricing-faq" className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionFAQ section="pricing" />
        <SmartNextStep {...RECOMMENDATION_CHAINS["pricing"]} />
      </div>
    </>
  );
}
