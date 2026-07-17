"use client";

import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

const metrics = [
  { value: 20, suffix: "", label: "Modules", color: "text-accent" },
  { value: 370, suffix: "+", label: "Source Files", color: "text-cyan" },
  { value: 73, suffix: "k", label: "Lines of Code", color: "text-purple" },
  { value: 2350, suffix: "", label: "Tests", color: "text-amber" },
  { value: 0, suffix: "", label: "TypeScript Errors", color: "text-accent" },
  { value: 100, suffix: "%", label: "Open Source", color: "text-accent" },
];

export function PlatformMetrics() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-surface/50" />
      <div className="absolute inset-0 grid-bg opacity-30" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent-border bg-accent-muted text-accent text-xs font-medium tracking-wide uppercase mb-6">
            Built with Quality
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Platform <span className="text-gradient-accent">by the Numbers</span>
          </h2>
          <p className="mt-4 text-lg text-muted-2 max-w-2xl mx-auto">
            Every line of code is open source, thoroughly tested, and production-ready.
            Zero TypeScript errors — because security tools must be reliable.
          </p>
        </motion.div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          {metrics.map((metric, i) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center p-6 rounded-xl bg-surface border border-border hover:border-border-light transition-all duration-300"
            >
              <div className={`text-3xl sm:text-4xl font-bold ${metric.color}`}>
                <AnimatedCounter value={metric.value} suffix={metric.suffix} duration={2500} />
              </div>
              <div className="mt-2 text-xs sm:text-sm text-muted">{metric.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
