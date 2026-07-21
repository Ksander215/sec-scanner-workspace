/**
 * /app/architecture - Unified AI Architecture Dashboard (INT-048 BLOCK 6)
 *
 * Big map showing 4 AI centers: SIP, AIS, AI CTO, AIO.
 * Click on a center to navigate to its detailed page.
 * Includes: Communication Graph, Responsibility Matrix, AI Routing, Future Agents.
 */

"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useI18n } from "@/lib/i18n-context";
import { Container } from "@/components/ui/Container";
import {
  getArchitectureRegistry,
  getAllCenters,
  getOverallArchitectureScore,
  getCenterScoreColor,
  getCenterScoreBg,
  type CenterId,
} from "@/lib/architecture-registry";
import {
  ShieldCheck,
  Sparkles,
  Brain,
  Cpu,
  ArrowRight,
  ArrowLeftRight,
  Network,
  Bot,
  GitBranch,
  TrendingUp,
} from "lucide-react";

const CENTER_ICON_MAP: Record<string, React.ElementType> = {
  ShieldCheck,
  Sparkles,
  Brain,
  Cpu,
};

export default function ArchitecturePage() {
  const { t } = useI18n();
  const registry = getArchitectureRegistry();
  const centers = getAllCenters();
  const overallScore = getOverallArchitectureScore();

  return (
    <Container>
      <div className="max-w-7xl mx-auto space-y-6 py-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Network className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {t("architecture.title")}
              </h1>
              <p className="text-sm text-muted-2">{t("architecture.subtitle")}</p>
            </div>
          </div>
        </div>

        {/* Overall score */}
        <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">
              {t("architecture.overallScore")}
            </span>
            <span className={`text-3xl font-bold tabular-nums ${getCenterScoreColor(overallScore)}`}>
              {overallScore}%
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-foreground/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${overallScore}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full ${getCenterScoreBg(overallScore)}`}
            />
          </div>
        </div>

        {/* 4 AI Centers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {centers.map((center) => {
            const Icon = CENTER_ICON_MAP[center.icon] || Network;
            return (
              <Link
                key={center.id}
                href={`/app/architecture/${center.id === "AI_CTO" ? "cto" : center.id.toLowerCase()}`}
                className="block rounded-xl border border-border bg-surface p-5 hover:border-violet-500/30 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${center.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-bold text-foreground">{center.id === "AI_CTO" ? "AI CTO" : center.id}</h2>
                      <span className="text-[10px] text-muted-2 uppercase tracking-wider">{center.name}</span>
                    </div>
                    <p className="text-xs text-muted-2 line-clamp-2 mb-3">{center.mission}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-muted-2 uppercase tracking-wider">{t("architecture.readiness")}</span>
                          <span className={`text-sm font-bold tabular-nums ${getCenterScoreColor(center.score)}`}>
                            {center.score}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-foreground/5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${center.score}%` }}
                            transition={{ duration: 0.8 }}
                            className={`h-full ${getCenterScoreBg(center.score)}`}
                          />
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-2 group-hover:text-violet-500 transition-colors" />
                    </div>
                    <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-2">
                      <span>{center.modules.length} {t("architecture.modules")}</span>
                      <span>•</span>
                      <span>{center.kpis.length} KPIs</span>
                      <span>•</span>
                      <span>{center.dependencies.length} deps</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Communication Graph (BLOCK 8) */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <ArrowLeftRight className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-foreground">
              {t("architecture.communicationGraph")}
            </span>
          </div>
          <div className="space-y-2">
            {registry.communicationGraph.map((link, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-2 rounded-lg bg-surface-2/50 border border-border text-xs"
              >
                <span className="font-mono font-bold text-violet-500">{link.from === "AI_CTO" ? "AI CTO" : link.from}</span>
                <span className="px-2 py-0.5 rounded bg-foreground/5 text-foreground/60 text-[10px] uppercase tracking-wider">
                  {link.type}
                </span>
                <ArrowRight className="w-3 h-3 text-muted-2" />
                <span className="font-mono font-bold text-blue-500">{link.to === "AI_CTO" ? "AI CTO" : link.to}</span>
                <span className="text-muted-2 ml-2 truncate">{link.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Routing (BLOCK 10) */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-foreground">
              {t("architecture.aiRouting")}
            </span>
          </div>
          <p className="text-xs text-muted-2 mb-3">{registry.aiRouting.description}</p>
          <div className="space-y-2">
            {registry.aiRouting.rules.map((rule, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-surface-2/50 border border-border">
                <code className="text-[10px] text-muted-2 font-mono px-2 py-0.5 rounded bg-foreground/5">
                  /{rule.pattern}/
                </code>
                <ArrowRight className="w-3 h-3 text-muted-2" />
                <span className="font-mono font-bold text-violet-500 text-xs">
                  {rule.center === "AI_CTO" ? "AI CTO" : rule.center}
                </span>
                <span className="text-xs text-muted-2 truncate">"{rule.example}"</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[11px] text-muted-2">
            {t("architecture.fallback")}: <span className="font-mono font-bold">{registry.aiRouting.fallback === "AI_CTO" ? "AI CTO" : registry.aiRouting.fallback}</span>
          </div>
        </div>

        {/* Future AI Agents (BLOCK 12) */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-foreground">
              {t("architecture.futureAgents")}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {registry.futureAgents.map((agent) => (
              <div key={agent.id} className="p-3 rounded-lg bg-surface-2/50 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Bot className="w-4 h-4 text-violet-500" />
                  <span className="text-sm font-semibold text-foreground">{agent.name}</span>
                  <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider bg-foreground/5 text-muted-2">
                    {agent.status}
                  </span>
                </div>
                <p className="text-xs text-muted-2 mb-2">{agent.description}</p>
                <div className="flex items-center gap-1 text-[10px] text-muted-2">
                  <span>{t("architecture.owner")}:</span>
                  <span className="font-mono font-bold text-violet-500">
                    {agent.center === "AI_CTO" ? "AI CTO" : agent.center}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unified Terminology (BLOCK 13) */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-foreground">
              {t("architecture.unifiedTerminology")}
            </span>
          </div>
          <div className="space-y-2">
            {Object.entries(registry.unifiedTerminology).map(([term, definition]) => (
              <div key={term} className="flex items-start gap-3 text-xs">
                <code className="font-mono font-bold text-violet-500 shrink-0 w-24">{term.replace("_", " ")}</code>
                <span className="text-foreground/70">{definition}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}
