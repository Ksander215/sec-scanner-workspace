"use client";

import { motion } from "framer-motion";
import { Check, Zap, Building2, Rocket } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Для индивидуальных исследователей и обучения",
    icon: Zap,
    color: "accent",
    features: [
      "1 проект",
      "5 сканов в день",
      "50 находок на скан",
      "Базовый risk score",
      "Community поддержка",
      "CLI доступ",
      "REST API",
    ],
    cta: "\u041d\u0430\u0447\u0430\u0442\u044c \u0431\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u043e",
    ctaStyle: "border border-border-light hover:bg-surface-2 text-foreground",
    ctaHref: "/app/demo",
    highlight: false,
  },
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    description: "Для малых команд и стартапов",
    icon: Rocket,
    color: "cyan",
    features: [
      "5 проектов",
      "50 сканов в день",
      "500 находок на скан",
      "Knowledge Graph",
      "Attack Path Analysis",
      "Slack интеграция",
      "Email уведомления",
      "PDF отчёты",
    ],
    cta: "Start Free Trial",
    ctaStyle: "bg-accent text-background hover:bg-accent-hover glow-accent",
    ctaHref: "/app/demo",
    highlight: true,
  },
  {
    name: "Professional",
    price: "$99",
    period: "/month",
    description: "Для security-команд среднего масштаба",
    icon: Building2,
    color: "purple",
    features: [
      "20 проектов",
      "Безлимитные сканы",
      "Безлимит findings",
      "SSO (SAML/OIDC)",
      "JIRA / Linear интеграция",
      "Custom rules & plugins",
      "Webhook events",
      "Priority поддержка",
      "SLA 99.9%",
    ],
    cta: "Start Free Trial",
    ctaStyle: "border border-border-light hover:bg-surface-2 text-foreground",
    ctaHref: "/app/demo",
    highlight: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Для крупных организаций с особыми требованиями",
    icon: Building2,
    color: "amber",
    features: [
      "Безлимит проекты",
      "Безлимит сканы",
      "On-premise deployment",
      "Dedicated support",
      "Custom integrations",
      "SOC 2 compliance",
      "Audit log retention",
      "SLA 99.99%",
      "Training & onboarding",
    ],
    cta: "Contact Sales",
    ctaStyle: "border border-amber/30 bg-amber-muted text-amber hover:bg-amber/20",
    ctaHref: "mailto:hello@sec-scanner.pro",
    highlight: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto"
        >
          <span className="text-sm font-medium text-accent uppercase tracking-wider">
            Pricing
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Прозрачные
            <br />
            <span className="text-gradient-accent">тарифы</span>
          </h2>
          <p className="mt-6 text-lg text-muted-2 leading-relaxed">
            Начните бесплатно, масштабируйтесь по мере роста. Никаких скрытых платежей,
            никаких сюрпризов в счёте.
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
                  Most Popular
                </span>
              )}
              <div className="flex items-center gap-3 mb-4">
                <plan.icon className={`w-5 h-5 text-${plan.color}`} />
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              </div>
              <div className="mb-4">
                <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-sm text-muted">{plan.period}</span>
              </div>
              <p className="text-sm text-muted-2 mb-6">{plan.description}</p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span className="text-muted-2">{feature}</span>
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
            Оплата через: Stripe, Robokassa, Telegram Stars
          </p>
        </motion.div>
      </div>
    </section>
  );
}
