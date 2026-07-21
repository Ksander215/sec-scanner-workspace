/**
 * CenterDetail - shared component for /app/architecture/{sip|ais|cto|aio}
 */

"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useI18n } from "@/lib/i18n-context";
import { Container } from "@/components/ui/Container";
import {
  getArchitectureRegistry,
  getCenter,
  getCommunicationsFor,
  getCenterScoreColor,
  getCenterScoreBg,
  type CenterId,
} from "@/lib/architecture-registry";
import {
  ShieldCheck,
  Sparkles,
  Brain,
  Cpu,
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  Target,
  Activity,
  Database,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

const CENTER_ICON_MAP: Record<string, React.ElementType> = {
  ShieldCheck,
  Sparkles,
  Brain,
  Cpu,
};

export function CenterDetail({ centerId }: { centerId: CenterId }) {
  const { t } = useI18n();
  const registry = getArchitectureRegistry();
  const center = getCenter(centerId);

  if (!center) {
    return (
      <Container>
        <div className="text-center py-12 text-muted-2">Center {centerId} not found</div>
      </Container>
    );
  }

  const Icon = CENTER_ICON_MAP[center.icon] || ShieldCheck;
  const { incoming, outgoing } = getCommunicationsFor(centerId);
  const explainabilityExamples = registry.explainability.examples.filter((e) => e.center === centerId);

  return (
    <Container>
      <div className="max-w-7xl mx-auto space-y-6 py-6">
        <Link
          href="/app/architecture"
          className="inline-flex items-center gap-1 text-xs text-muted-2 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          {t("architecture.backToMap")}
        </Link>

        {/* Header */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${center.color} flex items-center justify-center shrink-0`}>
              <Icon className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-foreground">
                  {center.id === "AI_CTO" ? "AI CTO" : center.id}
                </h1>
                <span className="text-xs text-muted-2 uppercase tracking-wider">{center.name}</span>
              </div>
              <p className="text-sm text-muted-2 mb-3">{center.mission}</p>
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-2 uppercase tracking-wider">
                      {t("architecture.readiness")}
                    </span>
                    <span className={`text-lg font-bold tabular-nums ${getCenterScoreColor(center.score)}`}>
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
                <div className="text-[10px] text-muted-2">
                  <div>{t("architecture.owner")}: <span className="text-foreground/80">{center.owner}</span></div>
                  <div>{center.modules.length} {t("architecture.modules")}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Responsibilities */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-foreground">{t("architecture.responsibilities")}</span>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {center.responsibilities.map((r, i) => (
              <li key={i} className="text-xs text-foreground/70 flex items-start gap-2">
                <span className="text-violet-500 mt-0.5">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Modules */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-foreground">
              {t("architecture.modules")} ({center.modules.length})
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {center.modules.map((m) => (
              <div key={m.id} className="p-3 rounded-lg bg-surface-2/50 border border-border">
                <div className="flex items-center justify-between mb-1">
                  <code className="text-[10px] font-mono text-muted-2">{m.id}</code>
                  <span className={`text-sm font-bold tabular-nums ${getCenterScoreColor(m.readiness)}`}>
                    {m.readiness}%
                  </span>
                </div>
                <div className="text-sm font-medium text-foreground mb-2">{m.name}</div>
                <div className="w-full h-1 rounded-full bg-foreground/5 overflow-hidden mb-2">
                  <div className={`h-full ${getCenterScoreBg(m.readiness)}`} style={{ width: `${m.readiness}%` }} />
                </div>
                {m.features.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {m.features.map((f) => (
                      <code key={f} className="px-1.5 py-0.5 rounded bg-foreground/5 text-[9px] text-muted-2">{f}</code>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-foreground">{t("architecture.kpis")}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {center.kpis.map((kpi, i) => (
              <div key={i} className="p-3 rounded-lg bg-surface-2/50 border border-border">
                <div className="text-[10px] text-muted-2 mb-1 truncate">{kpi.name}</div>
                <div className="text-lg font-bold tabular-nums text-foreground">{kpi.value}</div>
                <div className="text-[10px] text-muted-2 mt-1">
                  {t("architecture.target")}: <span className="text-foreground/70">{kpi.target}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inputs / Outputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold text-foreground">{t("architecture.inputs")}</span>
            </div>
            <ul className="space-y-1">
              {center.inputs.map((input, i) => (
                <li key={i} className="text-xs text-foreground/70 flex items-start gap-2">
                  <ArrowRight className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                  <span>{input}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-foreground">{t("architecture.outputs")}</span>
            </div>
            <ul className="space-y-1">
              {center.outputs.map((output, i) => (
                <li key={i} className="text-xs text-foreground/70 flex items-start gap-2">
                  <ArrowRight className="w-3 h-3 text-blue-500 mt-0.5 shrink-0" />
                  <span>{output}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Communication links */}
        {(incoming.length > 0 || outgoing.length > 0) && (
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 mb-4">
              <ArrowLeftRight className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-semibold text-foreground">{t("architecture.communications")}</span>
            </div>
            <div className="space-y-3">
              {outgoing.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold tracking-wider text-foreground/40 uppercase mb-2">
                    {t("architecture.outgoing")}
                  </div>
                  <div className="space-y-1">
                    {outgoing.map((link, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-surface-2/50 text-xs">
                        <span className="font-mono font-bold text-violet-500">{center.id === "AI_CTO" ? "AI CTO" : center.id}</span>
                        <span className="px-2 py-0.5 rounded bg-foreground/5 text-muted-2 text-[10px] uppercase">{link.type}</span>
                        <ArrowRight className="w-3 h-3 text-muted-2" />
                        <span className="font-mono font-bold text-blue-500">{link.to === "AI_CTO" ? "AI CTO" : link.to}</span>
                        <span className="text-muted-2 truncate ml-2">{link.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {incoming.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold tracking-wider text-foreground/40 uppercase mb-2">
                    {t("architecture.incoming")}
                  </div>
                  <div className="space-y-1">
                    {incoming.map((link, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-surface-2/50 text-xs">
                        <span className="font-mono font-bold text-blue-500">{link.from === "AI_CTO" ? "AI CTO" : link.from}</span>
                        <span className="px-2 py-0.5 rounded bg-foreground/5 text-muted-2 text-[10px] uppercase">{link.type}</span>
                        <ArrowRight className="w-3 h-3 text-muted-2" />
                        <span className="font-mono font-bold text-violet-500">{center.id === "AI_CTO" ? "AI CTO" : center.id}</span>
                        <span className="text-muted-2 truncate ml-2">{link.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Explainability (BLOCK 11) */}
        {explainabilityExamples.length > 0 && (
          <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-semibold text-foreground">{t("architecture.explainability")}</span>
            </div>
            <div className="space-y-3">
              {explainabilityExamples.map((ex, i) => (
                <div key={i} className="p-3 rounded-lg bg-surface/70 border border-border">
                  <div className="text-xs text-muted-2 mb-1">
                    <span className="font-semibold">{t("architecture.question")}:</span> "{ex.question}"
                  </div>
                  <div className="text-xs text-foreground/80 mb-2">
                    <span className="font-semibold">{t("architecture.answer")}:</span> {ex.answer}
                  </div>
                  <div className="text-[10px] text-muted-2">
                    <span className="font-semibold">{t("architecture.source")}:</span> <code className="font-mono">{ex.source}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evidence */}
        {center.evidence.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold text-foreground">{t("architecture.evidence")}</span>
            </div>
            <div className="space-y-1">
              {center.evidence.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-400">
                  <ExternalLink className="w-3 h-3" />
                  {url}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Dependencies */}
        {center.dependencies.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-foreground">{t("architecture.dependencies")}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {center.dependencies.map((dep) => (
                <Link
                  key={dep}
                  href={`/app/architecture/${dep === "AI_CTO" ? "cto" : dep.toLowerCase()}`}
                  className="px-3 py-1.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-xs font-mono font-bold hover:bg-violet-500/20 transition-colors"
                >
                  {dep === "AI_CTO" ? "AI CTO" : dep}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
