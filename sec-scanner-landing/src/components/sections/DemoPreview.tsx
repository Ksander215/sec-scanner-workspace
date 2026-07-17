"use client";

import { motion } from "framer-motion";
import {
  Play,
  ArrowRight,
  Network,
  ShieldAlert,
  Brain,
  GitBranch,
  BarChart3,
  Activity,
  Bug,
  AlertTriangle,
  Shield,
  Server,
  TrendingUp,
} from "lucide-react";

const demoFeatures = [
  {
    icon: GitBranch,
    title: "Конвейер анализа",
    description: "8 этапов: нормализация, корреляция, карта, оценка, пути атак, рекомендации, объяснимость, отчёт.",
    href: "/app/playground",
    color: "text-accent",
    bg: "bg-accent-muted",
  },
  {
    icon: Network,
    title: "Карта инфраструктуры",
    description: "34 связанных узла — хосты, сервисы, уязвимости, CVE — с поиском и фильтрацией в реальном времени.",
    href: "/app/demo/knowledge-graph",
    color: "text-cyan",
    bg: "bg-cyan-muted",
  },
  {
    icon: ShieldAlert,
    title: "Пути атаки",
    description: "3 прослеженных пути атак с вероятностью эксплуатации, маппингом MITRE ATT&CK и CVE.",
    href: "/app/demo/attack-paths",
    color: "text-red",
    bg: "bg-red-muted",
  },
  {
    icon: Brain,
    title: "AI-помощник",
    description: "Задавайте вопросы на естественном языке — получите рассуждения, связи и план устранения.",
    href: "/app/dashboard",
    color: "text-purple",
    bg: "bg-purple-muted",
  },
];

function InterfaceScreenshot() {
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-2xl shadow-accent/5">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-surface-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red/60" />
          <div className="w-3 h-3 rounded-full bg-amber/60" />
          <div className="w-3 h-3 rounded-full bg-accent/60" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="px-3 py-1 rounded-md bg-surface text-xs text-muted-2 font-mono">sec-scanner.pro/app/dashboard</div>
        </div>
      </div>
      <div className="flex">
        <div className="w-44 border-r border-border p-3 space-y-1 hidden sm:block">
          {[
            { icon: BarChart3, label: "Дашборд", active: true },
            { icon: Server, label: "Рабочее пространство" },
            { icon: Bug, label: "Проблемы" },
            { icon: ShieldAlert, label: "Риски" },
            { icon: Network, label: "Карта инфр." },
            { icon: Activity, label: "Пути атаки" },
            { icon: Shield, label: "Отчёты" },
          ].map((item) => (
            <div key={item.label} className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs ${item.active ? "bg-accent-muted text-accent font-medium" : "text-muted-2"}`}>
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </div>
          ))}
        </div>
        <div className="flex-1 p-4">
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: "Риск", value: "73", color: "text-amber" },
              { label: "Критич.", value: "4", color: "text-red" },
              { label: "Проблемы", value: "12", color: "text-cyan" },
              { label: "Соотв.", value: "82%", color: "text-accent" },
            ].map((stat) => (
              <div key={stat.label} className="p-2.5 rounded-lg bg-surface-2 border border-border text-center">
                <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-[10px] text-muted">{stat.label}</div>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            {[
              { severity: "critical", title: "SQL Injection в /api/v1/users", status: "open" },
              { severity: "high", title: "Открытый Redis на 0.0.0.0:6379", status: "acknowledged" },
              { severity: "critical", title: "Ключ Vault в переменной окружения", status: "open" },
            ].map((finding) => (
              <div key={finding.title} className="flex items-center gap-2 p-2 rounded-md bg-surface-2 border border-border text-xs">
                <AlertTriangle className={`w-3 h-3 shrink-0 ${finding.severity === "critical" ? "text-red" : "text-amber"}`} />
                <span className="flex-1 text-foreground truncate">{finding.title}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase ${finding.severity === "critical" ? "bg-red-muted text-red" : "bg-amber-muted text-amber"}`}>{finding.severity === "critical" ? "критич." : "высокий"}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 rounded-lg bg-surface-2 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted font-medium">Тренд риска (30 дней)</span>
              <TrendingUp className="w-3 h-3 text-accent" />
            </div>
            <div className="flex items-end gap-1 h-8">
              {[40, 55, 48, 62, 58, 73, 68, 75, 70, 73].map((v, i) => (
                <div key={i} className="flex-1 rounded-sm bg-accent/30" style={{ height: `${v}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DemoPreview() {
  return (
    <section id="demo" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-surface/30" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Попробуйте <span className="text-gradient-accent">SIP</span>
          </h2>
          <p className="mt-4 text-lg text-muted-2 max-w-2xl mx-auto">
            Интерактивная демонстрация — изучите платформу без регистрации менее чем за 3 минуты.
          </p>
        </motion.div>

        <motion.a
          href="/app/dashboard"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="block max-w-4xl mx-auto mb-12 group"
        >
          <div className="relative rounded-xl overflow-hidden">
            <InterfaceScreenshot />
            <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/5 transition-colors duration-300 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-95 group-hover:scale-100">
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-background font-semibold text-sm shadow-lg shadow-accent/20">
                  <Play className="w-4 h-4" />
                  Открыть демо
                </div>
              </div>
            </div>
          </div>
        </motion.a>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {demoFeatures.map((feature, i) => (
            <motion.a
              key={feature.title}
              href={feature.href}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group p-5 rounded-xl bg-surface border border-border hover:border-border-light transition-all duration-300 hover:bg-surface-2"
            >
              <div className={`w-10 h-10 rounded-xl ${feature.bg} flex items-center justify-center mb-3`}>
                <feature.icon className={`w-5 h-5 ${feature.color}`} />
              </div>
              <h3 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors flex items-center gap-1.5">
                {feature.title}
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </h3>
              <p className="text-xs text-muted-2 mt-1.5 leading-relaxed">{feature.description}</p>
            </motion.a>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <a
            href="/app/dashboard"
            className="group inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold bg-accent text-background rounded-xl hover:bg-accent-hover transition-all glow-accent"
          >
            <Play className="w-4 h-4" />
            Открыть платформу
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
