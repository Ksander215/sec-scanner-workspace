"use client";

import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Check, Crown } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

const plans = [
  {
    id: "community",
    nameKey: "pricing.community",
    priceKey: "pricing.community.price",
    descKey: "pricing.community.desc",
    features: [
      { key: "pricing.feature.scans", value: "100" },
      { key: "pricing.feature.users", value: "1" },
      { key: "pricing.feature.projects", value: "3" },
      { key: "pricing.feature.api", value: false },
      { key: "pricing.feature.support", valueKey: "pricing.feature.community" },
      { key: "pricing.feature.sso", value: false },
      { key: "pricing.feature.rbac", value: false },
      { key: "pricing.feature.audit", value: false },
    ],
    ctaKey: "pricing.community",
    highlighted: false,
  },
  {
    id: "team",
    nameKey: "pricing.team",
    priceKey: "pricing.team.price",
    priceSuffix: " ₽/мес",
    descKey: "pricing.team.desc",
    features: [
      { key: "pricing.feature.scans", valueKey: "pricing.unlimited" },
      { key: "pricing.feature.users", value: "до 10" },
      { key: "pricing.feature.projects", value: "20" },
      { key: "pricing.feature.api", value: true },
      { key: "pricing.feature.support", valueKey: "pricing.feature.email" },
      { key: "pricing.feature.sso", value: false },
      { key: "pricing.feature.rbac", value: true },
      { key: "pricing.feature.audit", value: false },
    ],
    ctaKey: "pricing.choose",
    highlighted: true,
  },
  {
    id: "business",
    nameKey: "pricing.business",
    priceKey: "pricing.business.price",
    priceSuffix: " ₽/мес",
    descKey: "pricing.business.desc",
    features: [
      { key: "pricing.feature.scans", valueKey: "pricing.unlimited" },
      { key: "pricing.feature.users", value: "до 50" },
      { key: "pricing.feature.projects", valueKey: "pricing.unlimited" },
      { key: "pricing.feature.api", value: true },
      { key: "pricing.feature.support", valueKey: "pricing.feature.priority" },
      { key: "pricing.feature.sso", value: true },
      { key: "pricing.feature.rbac", value: true },
      { key: "pricing.feature.audit", value: true },
    ],
    ctaKey: "pricing.choose",
    highlighted: false,
  },
  {
    id: "enterprise",
    nameKey: "pricing.enterprise",
    priceKey: "pricing.enterprise.price",
    descKey: "pricing.enterprise.desc",
    features: [
      { key: "pricing.feature.scans", valueKey: "pricing.unlimited" },
      { key: "pricing.feature.users", valueKey: "pricing.unlimited" },
      { key: "pricing.feature.projects", valueKey: "pricing.unlimited" },
      { key: "pricing.feature.api", value: true },
      { key: "pricing.feature.support", valueKey: "pricing.feature.dedicated" },
      { key: "pricing.feature.sso", value: true },
      { key: "pricing.feature.rbac", value: true },
      { key: "pricing.feature.audit", value: true },
      { key: "pricing.feature.custom", value: true },
      { key: "pricing.feature.sla", value: true },
    ],
    ctaKey: "pricing.contact",
    highlighted: false,
    isEnterprise: true,
  },
];

export default function PricingPage() {
  const { t, locale } = useI18n();

  return (
    <>
      <div className="border-b border-border bg-surface/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-foreground">{t("pricing.title")}</h1>
          <p className="text-sm text-muted-2 mt-2">{t("pricing.subtitle")}</p>
        </div>
      </div>

      <Container className="py-12">
        <div className="grid lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative p-6 rounded-xl border transition-all duration-300 ${
                plan.highlighted
                  ? "bg-surface border-accent/30 shadow-[0_0_30px_rgba(0,255,136,0.08)]"
                  : "bg-surface border-border hover:border-border-light"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="low">
                    {locale === "ru" ? "Популярный" : "Popular"}
                  </Badge>
                </div>
              )}
              {plan.isEnterprise && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="info">
                    <Crown className="w-3 h-3 mr-1" />
                    Enterprise
                  </Badge>
                </div>
              )}

              <h3 className="text-lg font-semibold text-foreground">{t(plan.nameKey)}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">{t(plan.priceKey)}</span>
                {plan.priceSuffix && (
                  <span className="text-sm text-muted">{plan.priceSuffix}</span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-2">{t(plan.descKey)}</p>

              <ul className="mt-6 space-y-2.5">
                {plan.features.map((feature) => {
                  const featureLabel = t(feature.key);
                  const featureValue = feature.valueKey
                    ? t(feature.valueKey)
                    : feature.value !== undefined
                    ? typeof feature.value === "boolean"
                      ? ""
                      : String(feature.value)
                    : "";

                  return (
                    <li key={feature.key} className="flex items-start gap-2 text-sm text-muted-2">
                      {feature.value === false ? (
                        <span className="w-4 h-4 shrink-0 mt-0.5 text-muted/50">✗</span>
                      ) : (
                        <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                      )}
                      <span>
                        {featureLabel}
                        {featureValue && `: ${featureValue}`}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <a
                href={plan.isEnterprise ? "mailto:hello@sec-scanner.pro" : "/app/dashboard"}
                className={`mt-6 block w-full py-2.5 rounded-lg text-sm font-medium text-center transition-colors ${
                  plan.highlighted
                    ? "bg-accent text-background hover:bg-accent-hover"
                    : "bg-surface-2 text-foreground border border-border hover:border-border-light"
                }`}
              >
                {t(plan.ctaKey)}
              </a>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center text-sm text-muted-2">
          {locale === "ru"
            ? "Все планы включают доступ к открытому ядру. Для Community кредитная карта не требуется."
            : "All plans include access to the open-source core. No credit card required for Community."}
        </div>
      </Container>
    </>
  );
}
