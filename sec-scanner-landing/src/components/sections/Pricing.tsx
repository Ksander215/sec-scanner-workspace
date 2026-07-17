"use client";

import { motion } from "framer-motion";
import { Check, X, Zap, Rocket, Building2, Crown } from "lucide-react";

const plans = [
  {
    name: "Сообщество",
    price: "Бесплатно",
    period: "",
    description: "Для индивидуальных исследователей",
    icon: Zap,
    color: "accent",
    features: [
      { label: "Сканирования", value: "100" },
      { label: "Пользователи", value: "1" },
      { label: "Проекты", value: "3" },
      { label: "API доступ", value: false },
      { label: "Поддержка", value: "Поддержка сообщества" },
      { label: "SSO/SAML", value: false },
      { label: "RBAC", value: false },
      { label: "Аудит логов", value: false },
    ],
    cta: "Начать бесплатно",
    ctaStyle: "border border-border-light hover:bg-surface-2 text-foreground",
    ctaHref: "/app/demo",
    highlight: false,
  },
  {
    name: "Команда",
    price: "4 900 ₽",
    period: "/мес",
    description: "Для security-команд и DevOps",
    icon: Rocket,
    color: "cyan",
    features: [
      { label: "Сканирования", value: "Безлимит" },
      { label: "Пользователи", value: "до 10" },
      { label: "Проекты", value: "20" },
      { label: "API доступ", value: true },
      { label: "Поддержка", value: "Email" },
      { label: "SSO/SAML", value: false },
      { label: "RBAC", value: true },
      { label: "Аудит логов", value: false },
    ],
    cta: "Выбрать",
    ctaStyle: "bg-accent text-background hover:bg-accent-hover glow-accent",
    ctaHref: "/app/demo",
    highlight: true,
  },
  {
    name: "Бизнес",
    price: "14 900 ₽",
    period: "/мес",
    description: "Для среднего и крупного бизнеса",
    icon: Building2,
    color: "purple",
    features: [
      { label: "Сканирования", value: "Безлимит" },
      { label: "Пользователи", value: "до 50" },
      { label: "Проекты", value: "Безлимит" },
      { label: "API доступ", value: true },
      { label: "Поддержка", value: "Приоритетная" },
      { label: "SSO/SAML", value: true },
      { label: "RBAC", value: true },
      { label: "Аудит логов", value: true },
    ],
    cta: "Выбрать",
    ctaStyle: "border border-border-light hover:bg-surface-2 text-foreground",
    ctaHref: "/app/demo",
    highlight: false,
  },
  {
    name: "Корпоративный",
    price: "По запросу",
    period: "",
    description: "Для крупных организаций",
    icon: Crown,
    color: "amber",
    features: [
      { label: "Сканирования", value: "Безлимит" },
      { label: "Пользователи", value: "Безлимит" },
      { label: "Проекты", value: "Безлимит" },
      { label: "API доступ", value: true },
      { label: "Поддержка", value: "Выделенный менеджер" },
      { label: "SSO/SAML", value: true },
      { label: "RBAC", value: true },
      { label: "Аудит логов", value: true },
    ],
    cta: "Связаться",
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
            Тарифы
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
                  Популярный
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
            Оплата через: Stripe, Robokassa, Telegram Stars
          </p>
        </motion.div>
      </div>
    </section>
  );
}
