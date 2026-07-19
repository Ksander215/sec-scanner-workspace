"use client";

import { motion } from "framer-motion";

const roadmapItems = [
  {
    phase: "Q3 2026",
    title: "Public Beta",
    status: "current",
    items: [
      "Новый landing page",
      "Interactive Demo",
      "Playground (paste & analyze)",
      "SaaS Dashboard MVP",
    ],
  },
  {
    phase: "Q4 2026",
    title: "Platform Growth",
    status: "upcoming",
    items: [
      "Marketplace v1",
      "Billing (Stripe, Robokassa, TG Stars)",
      "Community hub",
      "Documentation portal",
    ],
  },
  {
    phase: "Q1 2027",
    title: "Enterprise Ready",
    status: "upcoming",
    items: [
      "SSO для Enterprise",
      "On-premise deployment",
      "Advanced RBAC",
      "Audit log & compliance reports",
    ],
  },
  {
    phase: "Q2 2027",
    title: "AI & Automation",
    status: "future",
    items: [
      "AI-powered triage",
      "Auto-remediation suggestions",
      "Predictive risk scoring",
      "Custom ML models",
    ],
  },
];

const statusStyles: Record<string, { dot: string; label: string }> = {
  current: { dot: "bg-accent", label: "text-accent" },
  upcoming: { dot: "bg-cyan", label: "text-cyan" },
  future: { dot: "bg-muted", label: "text-muted" },
};

export function Roadmap() {
  return (
    <section id="roadmap" className="relative py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto"
        >
          <span className="text-sm font-medium text-purple uppercase tracking-wider">
            Roadmap
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Путь к
            <br />
            <span className="text-gradient-accent">v1.0 и дальше</span>
          </h2>
          <p className="mt-6 text-lg text-muted-2 leading-relaxed">
            Открытый roadmap с чёткими里程碑. Голосуйте за фичи, следите за прогрессом и
            влияйте на развитие платформы.
          </p>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {roadmapItems.map((phase, i) => {
            const style = statusStyles[phase.status];
            return (
              <motion.div
                key={phase.phase}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl border border-border bg-surface hover:bg-surface-2 transition-colors"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                  <span className={`text-xs font-medium uppercase tracking-wider ${style.label}`}>
                    {phase.phase}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  {phase.title}
                </h3>
                <ul className="space-y-2">
                  {phase.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-border-light shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
