/**
 * /app/security-review - Human First Security Center (PX-004)
 *
 * Главная идея: любая техническая информация сначала переводится на язык бизнеса.
 *
 * Структура:
 * 1. AI Executive Summary (2-3 предложения)
 * 2. 3-5 ключевых действий, отсортированных по бизнес-эффекту
 * 3. Каждая проблема: что произошло → чем грозит → время → следующий шаг
 * 4. Технические детали (CVE, CVSS, порты) — в раскрывающемся блоке
 * 5. "Скопировать задачу разработчику" — готовое описание для Jira/GitHub/Linear
 * 6. "Объяснить проще" — AI переформулирование
 */

"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n-context";
import { Container } from "@/components/ui/Container";
import {
  getDemoFindings,
  generateExecutiveSummary,
  getTopActions,
  sortByBusinessImpact,
  getRiskLevelColor,
  type BusinessFinding,
} from "@/lib/findings-translator";
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Lightbulb,
  FileBarChart,
  ShieldCheck,
  TrendingUp,
  Code,
  ExternalLink,
} from "lucide-react";

export default function SecurityReviewPage() {
  const { t } = useI18n();
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [simplifiedIds, setSimplifiedIds] = useState<Set<string>>(new Set());

  const findings = useMemo(() => getDemoFindings("example.com"), []);
  const sortedFindings = useMemo(() => sortByBusinessImpact(findings), [findings]);
  const topActions = useMemo(() => getTopActions(findings, 5), [findings]);
  const executiveSummary = useMemo(() => generateExecutiveSummary(findings, "example.com"), [findings]);

  const critical = findings.filter((f) => f.businessRiskLevel === "Критический").length;
  const high = findings.filter((f) => f.businessRiskLevel === "Высокий").length;
  const totalFixTime = findings.reduce((s, f) => {
    const m = f.fixTime.match(/(\d+)/);
    return s + (m ? parseInt(m[1]) : 0);
  }, 0);

  const toggleTechnical = (id: string) => {
    setShowTechnical((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSimplified = (id: string) => {
    setSimplifiedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyDeveloperTask = (finding: BusinessFinding) => {
    const task = `**${finding.developerTask.title}**

${finding.developerTask.description}

**Priority:** ${finding.developerTask.priority}
**Estimate:** ${finding.developerTask.estimate}
**Labels:** ${finding.developerTask.labels.join(", ")}

---
Source: SIP Security Review
Finding ID: ${finding.id}
Technical: ${finding.technicalTitle}${finding.cve ? ` (${finding.cve})` : ""}`;

    navigator.clipboard.writeText(task);
    setCopiedId(finding.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Container>
      <div className="max-w-5xl mx-auto space-y-6 py-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                {t("securityReview.title")}
              </h1>
              <p className="text-sm text-muted-2">{t("securityReview.subtitle")}</p>
            </div>
            {/* CX-001: Demo badge */}
            <span className="px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">
              Demo
            </span>
          </div>
        </div>

        {/* AI Executive Summary (2-3 предложения) */}
        <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-bold tracking-wider text-violet-500 uppercase mb-1">
                {t("securityReview.aiSummary")}
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {executiveSummary}
              </p>
              <div className="mt-3 flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-foreground/70">{critical} {t("securityReview.critical")}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-foreground/70">{high} {t("securityReview.high")}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-foreground/70">~{totalFixTime} {t("securityReview.hours")}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Top 3-5 Actions (по бизнес-эффекту, не по CVSS) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-violet-500" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              {t("securityReview.topActions")}
            </h2>
          </div>
          <div className="space-y-2">
            {topActions.map((finding, i) => (
              <div
                key={finding.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  finding.businessRiskLevel === "Критический"
                    ? "border-red-500/20 bg-red-500/5"
                    : finding.businessRiskLevel === "Высокий"
                    ? "border-orange-500/20 bg-orange-500/5"
                    : "border-amber-500/20 bg-amber-500/5"
                }`}
              >
                <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                  finding.businessRiskLevel === "Критический" ? "bg-red-500/20 text-red-500" :
                  finding.businessRiskLevel === "Высокий" ? "bg-orange-500/20 text-orange-500" :
                  "bg-amber-500/20 text-amber-500"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{finding.businessTitle}</div>
                  <div className="text-[11px] text-muted-2">{finding.expectedBenefit}</div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-2 shrink-0">
                  <Clock className="w-3 h-3" />
                  {finding.fixTime}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All Findings — детальный список */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileBarChart className="w-4 h-4 text-violet-500" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              {t("securityReview.allFindings")} ({findings.length})
            </h2>
          </div>
          <div className="space-y-2">
            {sortedFindings.map((finding) => {
              const expanded = expandedFinding === finding.id;
              const showTech = showTechnical.has(finding.id);
              const simplified = simplifiedIds.has(finding.id);
              const copied = copiedId === finding.id;
              const riskColor = getRiskLevelColor(finding.businessRiskLevel);

              return (
                <div
                  key={finding.id}
                  className="rounded-xl border border-border bg-surface overflow-hidden"
                >
                  {/* Header — бизнес-информация первой */}
                  <button
                    onClick={() => setExpandedFeature(expandedFinding === finding.id ? null : finding.id)}
                    className="w-full p-4 flex items-start gap-3 hover:bg-surface-2/50 transition-colors text-left"
                  >
                    {expanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-2 shrink-0 mt-1" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-2 shrink-0 mt-1" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${riskColor}`}>
                          {finding.businessRiskLevel}
                        </span>
                        <span className="text-sm font-semibold text-foreground">{finding.businessTitle}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {finding.fixTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> {finding.expectedBenefit.split(".")[0]}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded — бизнес-перевод + технические детали */}
                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border"
                      >
                        <div className="p-4 space-y-4">
                          {/* Что произошло → Чем грозит → Что делать → Время */}
                          <div className="space-y-3">
                            <BusinessRow
                              label={t("securityReview.whatHappened")}
                              value={finding.businessTitle}
                              color="text-violet-500"
                            />
                            <BusinessRow
                              label={t("securityReview.whyDangerous")}
                              value={simplified ? finding.simpleExplanation : finding.businessImpact}
                              color="text-red-500"
                            />
                            <BusinessRow
                              label={t("securityReview.whatToDo")}
                              value={finding.nextStep}
                              color="text-emerald-500"
                            />
                            <BusinessRow
                              label={t("securityReview.timeNeeded")}
                              value={`${finding.fixTime} (${finding.fixEffort})`}
                              color="text-amber-500"
                            />
                            <BusinessRow
                              label={t("securityReview.expectedBenefit")}
                              value={finding.expectedBenefit}
                              color="text-blue-500"
                            />
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border">
                            {/* Скопировать задачу разработчику */}
                            <button
                              onClick={() => copyDeveloperTask(finding)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                copied
                                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                  : "bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20"
                              }`}
                            >
                              {copied ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  {t("securityReview.copied")}
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  {t("securityReview.copyTask")}
                                </>
                              )}
                            </button>

                            {/* Объяснить проще */}
                            <button
                              onClick={() => toggleSimplified(finding.id)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                simplified
                                  ? "bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400"
                                  : "bg-surface-2 border border-border text-foreground/70 hover:bg-foreground/5"
                              }`}
                            >
                              <Lightbulb className="w-3 h-3" />
                              {simplified ? t("securityReview.simplified") : t("securityReview.explainSimpler")}
                            </button>

                            {/* Показать технические детали */}
                            <button
                              onClick={() => toggleTechnical(finding.id)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                showTech
                                  ? "bg-foreground/10 text-foreground"
                                  : "bg-surface-2 border border-border text-muted-2 hover:text-foreground"
                              }`}
                            >
                              <Code className="w-3 h-3" />
                              {t("securityReview.technicalDetails")}
                            </button>
                          </div>

                          {/* Technical details (скрыты по умолчанию) */}
                          <AnimatePresence>
                            {showTech && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-3 rounded-lg bg-surface-2/50 border border-border space-y-2">
                                  <div className="text-[10px] font-bold tracking-wider text-foreground/40 uppercase">
                                    {t("securityReview.technicalInfo")}
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                    {finding.cve && (
                                      <div>
                                        <span className="text-muted-2">CVE: </span>
                                        <code className="text-foreground/80 font-mono">{finding.cve}</code>
                                      </div>
                                    )}
                                    {finding.cvss && (
                                      <div>
                                        <span className="text-muted-2">CVSS: </span>
                                        <span className="text-foreground/80 font-bold">{finding.cvss}</span>
                                      </div>
                                    )}
                                    {finding.port && (
                                      <div>
                                        <span className="text-muted-2">Port: </span>
                                        <code className="text-foreground/80 font-mono">{finding.port}</code>
                                      </div>
                                    )}
                                    {finding.service && (
                                      <div>
                                        <span className="text-muted-2">Service: </span>
                                        <code className="text-foreground/80 font-mono">{finding.service}</code>
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-muted-2 text-xs">Technical title: </span>
                                    <code className="text-foreground/60 text-xs font-mono">{finding.technicalTitle}</code>
                                  </div>
                                  <div>
                                    <span className="text-muted-2 text-xs">Severity: </span>
                                    <span className="text-foreground/60 text-xs uppercase">{finding.severity}</span>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer — commercial UX */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">
                {t("securityReview.commercialTitle")}
              </div>
              <p className="text-xs text-muted-2 mt-0.5">
                {t("securityReview.commercialDesc")}
              </p>
            </div>
            <a
              href="/app/pricing"
              className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-colors flex items-center gap-1 shrink-0"
            >
              {t("securityReview.tryPro")}
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </Container>
  );

  function setExpandedFeature(id: string | null) {
    setExpandedFinding(id);
  }
}

/* --- Helper component --- */

function BusinessRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={`text-[10px] font-bold uppercase tracking-wider ${color} mt-0.5 w-32 shrink-0`}>
        {label}
      </span>
      <span className="text-xs text-foreground/80 flex-1">{value}</span>
    </div>
  );
}
