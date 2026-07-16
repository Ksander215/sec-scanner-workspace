"use client";

import { motion } from "framer-motion";

const capabilities = [
  {
    category: "Scanning Engines",
    items: [
      { name: "Nmap", desc: "Network discovery & port scanning" },
      { name: "Nuclei", desc: "Template-based vulnerability scanner" },
      { name: "Semgrep", desc: "Static analysis with custom rules" },
      { name: "Trivy", desc: "Container & IaC scanner" },
      { name: "OWASP ZAP", desc: "Dynamic application security testing" },
      { name: "Bandit", desc: "Python security linter" },
    ],
  },
  {
    category: "Intelligence",
    items: [
      { name: "CVE Database", desc: "Real-time vulnerability feeds" },
      { name: "Attack Path Analysis", desc: "Graph-based threat modeling" },
      { name: "Risk Scoring", desc: "CVSS + custom risk models" },
      { name: "Correlation Engine", desc: "Cross-scan deduplication" },
      { name: "Threat Intel", desc: "IOC & threat feed integration" },
      { name: "Compliance Mapping", desc: "OWASP, CIS, NIST, PCI DSS" },
    ],
  },
  {
    category: "Integrations",
    items: [
      { name: "CI/CD", desc: "GitHub Actions, GitLab CI, Jenkins" },
      { name: "Issue Trackers", desc: "JIRA, Linear, GitHub Issues" },
      { name: "Notifications", desc: "Slack, Telegram, Email, Webhooks" },
      { name: "Cloud Providers", desc: "AWS, Azure, GCP security hubs" },
      { name: "SSO Providers", desc: "Keycloak, Auth0, Azure AD, Okta" },
      { name: "SIEM", desc: "Splunk, ELK, QRadar forwarding" },
    ],
  },
  {
    category: "Platform",
    items: [
      { name: "REST API", desc: "Full programmatic control" },
      { name: "CLI", desc: "Terminal-first workflow" },
      { name: "SDK", desc: "TypeScript & Python clients" },
      { name: "Webhooks", desc: "Event-driven automation" },
      { name: "GraphQL", desc: "Flexible data querying" },
      { name: "Plugin System", desc: "Custom scanners & reporters" },
    ],
  },
];

export function Capabilities() {
  return (
    <section id="capabilities" className="relative py-24 sm:py-32 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto"
        >
          <span className="text-sm font-medium text-cyan uppercase tracking-wider">
            Capabilities
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Полный спектр
            <br />
            <span className="text-gradient-accent">возможностей</span>
          </h2>
          <p className="mt-6 text-lg text-muted-2 leading-relaxed">
            От сканирования сетевой инфраструктуры до анализа кода и контейнеров — платформа
            покрывает все векторы атак с глубокой интеграцией в ваши процессы.
          </p>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          {capabilities.map((cat, ci) => (
            <motion.div
              key={cat.category}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: ci * 0.1 }}
              className="rounded-2xl border border-border bg-background p-6"
            >
              <h3 className="text-lg font-semibold text-foreground mb-4">
                {cat.category}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cat.items.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-surface-2 transition-colors group"
                  >
                    <div className="mt-0.5 w-2 h-2 rounded-full bg-accent shrink-0 group-hover:scale-125 transition-transform" />
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {item.name}
                      </div>
                      <div className="text-xs text-muted">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
