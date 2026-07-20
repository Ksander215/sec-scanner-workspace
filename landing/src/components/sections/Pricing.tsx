"use client";

import { motion } from "framer-motion";
import { Check, X, Zap, Rocket, Building2, Crown } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

export function Pricing() {
  const { t, locale } = useI18n();

  const plans = [
    {
      name: t("pricing.community"),
      price: t("pricing.community.price"),
      period: "",
      description: t("pricing.community.desc"),
      icon: Zap,
      color: "accent",
      features: [
        { label: t("pricing.feature.scans"), value: "100" },
        { label: t("pricing.feature.users"), value: "1" },
        { label: t("pricing.feature.projects"), value: "3" },
        { label: t("pricing.feature.api"), value: false },
        { label: t("pricing.feature.support"), value: t("pricing.feature.community") },
        { label: t("pricing.feature.sso"), value: false },
        { label: t("pricing.feature.rbac"), value: false },
        { label: t("pricing.feature.audit"), value: false },
      ],
      cta: t("common.getStarted"),
      ctaStyle: "border border-border-light hover:bg-surface-2 text-foreground",
      ctaHref: "/app/demo",
      highlight: false,
    },
    {
      name: t("pricing.team"),
      price: t("pricing.team.price"),
      period: locale === "ru" ? "/мес" : "/mo",
      description: t("pricing.team.desc"),
      icon: Rocket,
      color: "cyan",
      features: [
        { label: t("pricing.feature.scans"), value: t("pricing.unlimited") },
        { label: t("pricing.feature.users"), value: locale === "ru" ? "до 10" : "up to 10" },
        { label: t("pricing.feature.projects"), value: "20" },
        { label: t("pricing.feature.api"), value: true },
        { label: t("pricing.feature.support"), value: t("pricing.feature.email") },
        { label: t("pricing.feature.sso"), value: false },
        { label: t("pricing.feature.rbac"), value: true },
        { label: t("pricing.feature.audit"), value: false },
      ],
      cta: t("pricing.choose"),
      ctaStyle: "bg-accent text-background hover:bg-accent-hover glow-accent",
      ctaHref: "/app/demo",
      highlight: true,
    },
    {
      name: t("pricing.business"),
      price: t("pricing.business.price"),
      period: locale === "ru" ? "/мес" : "/mo",
      description: t("pricing.business.desc"),
      icon: Building2,
      color: "purple",
      features: [
        { label: t("pricing.feature.scans"), value: t("pricing.unlimited") },
        { label: t("pricing.feature.users"), value: locale === "ru" ? "до 50" : "up to 50" },
        { label: t("pricing.feature.projects"), value: t("pricing.unlimited") },
        { label: t("pricing.feature.api"), value: true },
        { label: t("pricing.feature.support"), value: t("pricing.feature.priority") },
        { label: t("pricing.feature.sso"), value: true },
        { label: t("pricing.feature.rbac"), value: true },
        { label: t("pricing.feature.audit"), value: true },
      ],
      cta: t("pricing.choose"),
      ctaStyle: "border border-border-light hover:bg-surface-2 text-foreground",
      ctaHref: "/app/demo",
      highlight: false,
    },
    {
      name: t("pricing.enterprise"),
      price: t("pricing.enterprise.price"),
      period: "",
      description: t("pricing.enterprise.desc"),
      icon: Crown,
      color: "amber",
      features: [
        { label: t("pricing.feature.scans"), value: t("pricing.unlimited") },
        { label: t("pricing.feature.users"), value: t("pricing.unlimited") },
        { label: t("pricing.feature.projects"), value: t("pricing.unlimited") },
        { label: t("pricing.feature.api"), value: true },
        { label: t("pricing.feature.support"), value: t("pricing.feature.dedicated") },
        { label: t("pricing.feature.sso"), value: true },
        { label: t("pricing.feature.rbac"), value: true },
        { label: t("pricing.feature.audit"), value: true },
      ],
      cta: t("pricing.contact"),
      ctaStyle: "border border-amber/30 bg-amber-muted text-amber hover:bg-amber/20",
      ctaHref: "mailto:hello@sec-scanner.pro",
      highlight: false,
    },
  ];

  return (
    <section id="pricing" className="relative py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            {locale === "ru" ? (
              <>Прозрачные<br /><span className="text-gradient-accent">тарифы</span></>
            ) : (
              <>Transparent<br /><span className="text-gradient-accent">Pricing</span></>
            )}
          </h2>
          <p className="mt-6 text-lg text-muted-2 leading-relaxed">
            {locale === "ru"
              ? "Начните бесплатно, масштабируйтесь по мере роста. Никаких скрытых платежей, никаких сюрпризов в счёте."
              : "Start for free, scale as you grow. No hidden fees, no surprise bills."}
          </p>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative p-6 rounded-2xl border ${
                plan.highlight
                  ? "border-accent-border bg-surface glow-accent"
                  : "border-border bg-surface"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-medium bg-accent text-background rounded-full">
                  {locale === "ru" ? "Популярный" : "Popular"}
                </span>
              )}
              <div className="flex items-center gap-3 mb-4">
                <plan.icon className={`w-5 h-5 text-${plan.color}`} />
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              </div>
              <div className="mb-4">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                {plan.period && (
                  <span className="text-sm text-muted">{plan.period}</span>
                )}
              </div>
              <p className="text-sm text-muted-2 mb-6">{plan.description}</p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature.label} className="flex items-start gap-2.5 text-sm">
                    {feature.value === true ? (
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    ) : feature.value === false ? (
                      <X className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                    ) : (
                      <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    )}
                    <span className="text-muted-2">
                      {feature.label}:{" "}
                      {typeof feature.value === "boolean" ? (
                        feature.value ? (
                          <span className="text-foreground">✓</span>
                        ) : (
                          <span className="text-muted">✗</span>
                        )
                      ) : (
                        <span className="text-foreground">{feature.value}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <a
                href={plan.ctaHref}
                className={`block w-full py-2.5 rounded-xl text-sm font-medium text-center transition-colors ${plan.ctaStyle}`}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>

        {/* Payment methods */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-10 text-center"
        >
          <p className="text-sm text-muted">
            {locale === "ru"
              ? "Оплата через: Stripe, Robokassa, Telegram Stars"
              : "Payment via: Stripe, Robokassa, Telegram Stars"}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
