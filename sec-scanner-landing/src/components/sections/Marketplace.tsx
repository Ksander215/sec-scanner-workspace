"use client";

import { motion } from "framer-motion";
import {
  Puzzle,
  FileCode,
  Plug,
  Layout,
  Monitor,
  RefreshCw,
  Palette,
  Sparkles,
} from "lucide-react";

const categories = [
  {
    icon: Puzzle,
    name: "Plugins",
    count: "45+",
    desc: "Расширения для сканеров, репортеров и интеграций",
    color: "#00ff88",
  },
  {
    icon: FileCode,
    name: "Rules",
    count: "200+",
    desc: "Кастомные правила обнаружения для Semgrep, Nuclei, YARA",
    color: "#00d4ff",
  },
  {
    icon: Plug,
    name: "Connectors",
    count: "30+",
    desc: "Интеграции с JIRA, Slack, Splunk, AWS Security Hub",
    color: "#a855f7",
  },
  {
    icon: Layout,
    name: "Templates",
    count: "25+",
    desc: "Шаблоны отчётов, политик и пайплайнов сканирования",
    color: "#ffb800",
  },
  {
    icon: Monitor,
    name: "Dashboards",
    count: "15+",
    desc: "Готовые дашборды для CISO, DevSecOps, Compliance",
    color: "#ff6b35",
  },
  {
    icon: RefreshCw,
    name: "Integrations",
    count: "40+",
    desc: "CI/CD, SSO, SIEM, cloud providers и мессенджеры",
    color: "#ff4444",
  },
  {
    icon: Palette,
    name: "Themes",
    count: "8",
    desc: "Тёмные, светлые и кастомные темы интерфейса",
    color: "#00ff88",
  },
  {
    icon: Sparkles,
    name: "AI Prompts",
    count: "50+",
    desc: "Промпты для анализа, триажа и ремедиации находок",
    color: "#00d4ff",
  },
];

export function Marketplace() {
  return (
    <section id="marketplace" className="relative py-24 sm:py-32 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto"
        >
          <span className="text-sm font-medium text-cyan uppercase tracking-wider">
            Marketplace
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Расширяйте платформу
            <br />
            <span className="text-gradient-accent">через маркетплейс</span>
          </h2>
          <p className="mt-6 text-lg text-muted-2 leading-relaxed">
            Плагины, правила, коннекторы и шаблоны от сообщества и нашей команды.
            Устанавливайте в один клик или публикуйте свои.
          </p>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group p-5 rounded-2xl border border-border bg-background hover:bg-surface-2 transition-all duration-300 cursor-pointer"
            >
              <div
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3"
                style={{ backgroundColor: `${cat.color}15` }}
              >
                <cat.icon className="w-5 h-5" style={{ color: cat.color }} />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">{cat.name}</h3>
                <span
                  className="text-xs font-mono font-medium px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                >
                  {cat.count}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-2 leading-relaxed">{cat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
