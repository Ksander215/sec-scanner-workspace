"use client";

import { motion } from "framer-motion";

const layers = [
  {
    name: "REST API + CLI",
    desc: "Программный доступ и терминальный интерфейс",
    tech: "Hono, OpenAPI, Commander",
    color: "#00ff88",
  },
  {
    name: "Orchestrator",
    desc: "Координация сканов, workflow и пайплайнов",
    tech: "EventBus, Workers, Cron",
    color: "#00d4ff",
  },
  {
    name: "Domain",
    desc: "Бизнес-логика: findings, risk, knowledge graph",
    tech: "TypeScript, Zod, Contracts",
    color: "#a855f7",
  },
  {
    name: "Persistence",
    desc: "PostgreSQL, Redis, Neo4j — хранение и кэширование",
    tech: "Prisma, pg-pool, neo4j-driver",
    color: "#ffb800",
  },
  {
    name: "Infrastructure",
    desc: "Docker, CI/CD, Monitoring, SSO",
    tech: "Docker Compose, OTEL, Keycloak",
    color: "#ff4444",
  },
];

export function Architecture() {
  return (
    <section id="architecture" className="relative py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto"
        >
          <span className="text-sm font-medium text-purple uppercase tracking-wider">
            Architecture
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Слоистая
            <br />
            <span className="text-gradient-accent">архитектура</span>
          </h2>
          <p className="mt-6 text-lg text-muted-2 leading-relaxed">
            Каждый слой изолирован и заменяем. Domain-driven design обеспечивает
            стабильность бизнес-логики при замене инфраструктурных компонентов.
          </p>
        </motion.div>

        {/* Architecture diagram */}
        <div className="mt-16 max-w-3xl mx-auto">
          <div className="relative flex flex-col gap-3">
            {layers.map((layer, i) => (
              <motion.div
                key={layer.name}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="group relative"
              >
                <div
                  className="rounded-2xl border bg-surface p-5 hover:bg-surface-2 transition-all duration-300"
                  style={{ borderColor: `${layer.color}33` }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: layer.color }}
                      />
                      <div>
                        <h3 className="text-base font-semibold text-foreground">
                          {layer.name}
                        </h3>
                        <p className="text-sm text-muted-2">{layer.desc}</p>
                      </div>
                    </div>
                    <span
                      className="hidden sm:inline-block text-xs font-mono px-2.5 py-1 rounded-lg"
                      style={{
                        backgroundColor: `${layer.color}15`,
                        color: layer.color,
                      }}
                    >
                      {layer.tech}
                    </span>
                  </div>
                </div>
                {/* Connector line */}
                {i < layers.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div
                      className="w-px h-4"
                      style={{
                        background: `linear-gradient(to bottom, ${layer.color}66, ${layers[i + 1].color}66)`,
                      }}
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Tech stack badges */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 flex flex-wrap items-center justify-center gap-3"
        >
          {[
            "TypeScript",
            "Node.js",
            "Bun",
            "PostgreSQL",
            "Redis",
            "Neo4j",
            "Docker",
            "OpenTelemetry",
            "Prisma",
            "Hono",
          ].map((tech) => (
            <span
              key={tech}
              className="px-3 py-1.5 text-xs font-mono text-muted-2 rounded-lg border border-border bg-surface hover:border-accent-border hover:text-accent transition-colors cursor-default"
            >
              {tech}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
