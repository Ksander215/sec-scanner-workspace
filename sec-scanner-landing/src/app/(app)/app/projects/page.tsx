"use client";

import { motion } from "framer-motion";
import { demoProjects } from "@/lib/portal-data";
import { Users, Shield, ArrowRight } from "lucide-react";

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  healthy: { color: "text-accent", bg: "bg-accent-muted", label: "Healthy" },
  warning: { color: "text-amber", bg: "bg-amber-muted", label: "Warning" },
  critical: { color: "text-red", bg: "bg-red-muted", label: "Critical" },
  idle: { color: "text-muted", bg: "bg-surface-2", label: "Idle" },
};

function ScoreRing({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#00ff88" : score >= 60 ? "#ffb800" : "#ff4444";

  return (
    <div className="relative w-16 h-16">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--color-border)" strokeWidth="4" />
        <circle
          cx="32" cy="32" r={radius}
          fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-foreground">{score}</span>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <div className="animate-page-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Projects</h1>
        <p className="mt-2 text-muted-2">Manage security across all your projects.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {demoProjects.map((project, i) => {
          const config = statusConfig[project.status];
          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group p-5 rounded-xl bg-surface border border-border hover:border-border-light transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                <ScoreRing score={project.securityScore} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground group-hover:text-accent transition-colors">
                      {project.name}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${config.bg} ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-2 mt-1 line-clamp-2">{project.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border text-xs text-muted-2">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>{project.assets} assets</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>{project.members} members</span>
                </div>
                <span className="ml-auto">Scanned {project.lastScan}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
