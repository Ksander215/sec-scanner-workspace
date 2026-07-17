"use client";

import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { CheckCircle2, Code2, TestTube2, Shield, Unlock, Rocket } from "lucide-react";

const metrics = [
  { value: 20, suffix: "", label: "Modules", color: "text-accent", icon: Shield, description: "Scanning, analysis, correlation, reporting", href: "/app/docs" },
  { value: 370, suffix: "+", label: "Source Files", color: "text-cyan", icon: Code2, description: "Production-grade TypeScript codebase", href: "https://github.com/Ksander215/sec-scanner-workspace", external: true },
  { value: 2350, suffix: "+", label: "Tests", color: "text-amber", icon: TestTube2, description: "Unit, integration, and E2E coverage", href: "https://github.com/Ksander215/sec-scanner-workspace", external: true },
  { value: 0, suffix: "", label: "TS Errors", color: "text-accent", icon: CheckCircle2, description: "Zero TypeScript compilation errors", href: "/app/docs" },
  { value: 100, suffix: "%", label: "Open Source", color: "text-purple", icon: Unlock, description: "MIT licensed, fully transparent", href: "https://github.com/Ksander215/sec-scanner-workspace", external: true },
  { value: 1, suffix: "", label: "Command Install", color: "text-cyan", icon: Rocket, description: "npx sec-scanner scan — ready in 30s", href: "/app/playground" },
];

export function PlatformMetrics() {
  return (
    <section id="metrics" className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-surface/50" />
      <div className="absolute inset-0 grid-bg opacity-30" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Production <span className="text-gradient-accent">by the Numbers</span>
          </h2>
          <p className="mt-4 text-lg text-muted-2 max-w-2xl mx-auto">
            Open source. Production ready. Zero compromises.
          </p>
        </motion.div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {metrics.map((metric, i) => (
            <motion.a
              key={metric.label}
              href={metric.href}
              {...(metric.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="block text-center p-5 rounded-xl bg-surface border border-border hover:border-border-light transition-all duration-300 group cursor-pointer hover:bg-surface-2"
            >
              <div className={`w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center mx-auto mb-3 ${metric.color} group-hover:scale-110 transition-transform`}>
                <metric.icon className="w-5 h-5" />
              </div>
              <div className={`text-3xl sm:text-4xl font-bold ${metric.color}`}>
                <AnimatedCounter value={metric.value} suffix={metric.suffix} duration={2500} />
              </div>
              <div className="mt-1 text-sm font-medium text-foreground group-hover:text-accent transition-colors">{metric.label}</div>
              <div className="mt-0.5 text-[11px] text-muted leading-tight">{metric.description}</div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
