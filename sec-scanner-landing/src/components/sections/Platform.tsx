"use client";

import { motion } from "framer-motion";
import {
  Radar,
  Brain,
  Network,
  Workflow,
  BarChart3,
  Lock,
} from "lucide-react";

const platformFeatures = [
  {
    icon: Radar,
    title: "Multi-Engine Scanning",
    description:
      "Единый интерфейс для Nmap, Nuclei, Semgrep, Trivy и других сканеров. Запускайте сканирование любой сложности из одной точки управления с автоматической корреляцией результатов.",
    color: "accent",
  },
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    description:
      "Интеллектуальная корреляция и приоритизация находок с помощью ML-моделей. Платформа понимает контекст, связывает уязвимости в цепочки атак и предлагает оптимальные пути ремедиации.",
    color: "cyan",
  },
  {
    icon: Network,
    title: "Knowledge Graph",
    description:
      "Граф знаний безопасности на базе Neo4j — визуализируйте связи между активами, уязвимостями и путями атак. Находите скрытые векторы, которые не видны в плоских отчётах.",
    color: "purple",
  },
  {
    icon: Workflow,
    title: "Automated Workflows",
    description:
      "Настраиваемые пайплайны анализа: от сканирования до JIRA-тикета. Интеграция с CI/CD, автоматическая триадж и эскалация по правилам, которые вы определяете.",
    color: "amber",
  },
  {
    icon: BarChart3,
    title: "Risk Quantification",
    description:
      "Количественная оценка риска для каждого актива и проекта. Дашборды с трендами, SLA-метрики и Executive Summary для руководства — от технических данных к бизнес-решениям.",
    color: "accent",
  },
  {
    icon: Lock,
    title: "Enterprise Security",
    description:
      "SSO через Keycloak, Auth0, Azure AD. RBAC с гранулярными правами, аудит-лог, шифрование данных. Соответствие SOC 2, ISO 27001, GDPR из коробки.",
    color: "red",
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  accent: { bg: "bg-accent-muted", text: "text-accent", border: "border-accent-border" },
  cyan: { bg: "bg-cyan-muted", text: "text-cyan", border: "border-[rgba(0,212,255,0.2)]" },
  purple: { bg: "bg-purple-muted", text: "text-purple", border: "border-[rgba(168,85,247,0.2)]" },
  amber: { bg: "bg-amber-muted", text: "text-amber", border: "border-[rgba(255,184,0,0.2)]" },
  red: { bg: "bg-red-muted", text: "text-red", border: "border-[rgba(255,68,68,0.2)]" },
};

export function Platform() {
  return (
    <section id="platform" className="relative py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto"
        >
          <span className="text-sm font-medium text-accent uppercase tracking-wider">
            Platform
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Единая платформа
            <br />
            <span className="text-gradient-accent">безопасности</span>
          </h2>
          <p className="mt-6 text-lg text-muted-2 leading-relaxed">
            Security Intelligence Platform объединяет сканирование, анализ, корреляцию и
            ремедиацию в единый рабочий процесс. От обнаружения до исправления — без разрывов
            между инструментами.
          </p>
        </motion.div>

        {/* Feature grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {platformFeatures.map((feature, i) => {
            const colors = colorMap[feature.color];
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`group relative p-6 rounded-2xl border ${colors.border} bg-surface hover:bg-surface-2 transition-all duration-300`}
              >
                <div
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${colors.bg} ${colors.text}`}
                >
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-muted-2 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
