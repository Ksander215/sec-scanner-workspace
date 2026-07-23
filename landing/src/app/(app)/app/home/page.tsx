/**
 * /app/home — Conversation First Experience (CX-002D / Hero V4)
 *
 * Hero = начало диалога, не рекламный экран.
 * Консультант, не продавец.
 * Первые 20-30 секунд — только человеческий язык.
 * После проверки Hero естественно превращается в Security Review.
 */

"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n-context";
import { Container } from "@/components/ui/Container";
import {
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  FileBarChart,
  Radar,
  TrendingUp,
  Clock,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Code,
  Settings,
  Bug,
} from "lucide-react";
import {
  getDemoFindings,
  generateExecutiveSummary,
  getTopActions,
  sortByBusinessImpact,
  getRiskLevelColor,
  type BusinessFinding,
} from "@/lib/findings-translator";

/* --- Live check stages --- */

interface CheckStage {
  label: string;
  status: "pending" | "checking" | "done";
  result?: string;
  severity?: "ok" | "warning" | "critical";
}

const CHECK_STAGES_TEMPLATE: Omit<CheckStage, "status">[] = [
  { label: "SSL сертификат", result: "Истекает через 3 дня", severity: "warning" },
  { label: "DNS записи", result: "SPF отсутствует", severity: "warning" },
  { label: "HTTP заголовки", result: "CSP отсутствует", severity: "critical" },
  { label: "Открытые порты", result: "SSH:22 доступен извне", severity: "warning" },
  { label: "robots.txt", result: "OK", severity: "ok" },
  { label: "AI анализ", result: "Готово", severity: "ok" },
];

/* --- Component --- */

export default function UserHomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <UserHomeContent />
    </Suspense>
  );
}

function UserHomeContent() {
  const { t } = useI18n();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<"hello" | "domain" | "checking" | "result">("hello");
  const [domain, setDomain] = useState("");
  const [checkStages, setCheckStages] = useState<CheckStage[]>([]);
  const [findings, setFindings] = useState<BusinessFinding[] | null>(null);
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Auto-advance from landing page query param
  useEffect(() => {
    const domainParam = searchParams.get("domain");
    if (domainParam && step === "hello") {
      setDomain(domainParam);
      setStep("domain");
      setTimeout(() => startCheck(domainParam), 600);
    }
  }, [searchParams, step]);

  const startCheck = (domainToCheck: string) => {
    setStep("checking");
    setFindings(null);
    const stages: CheckStage[] = CHECK_STAGES_TEMPLATE.map((s) => ({ ...s, status: "pending" }));
    setCheckStages(stages);

    const animateStages = (index: number) => {
      if (index >= stages.length) {
        setCheckStages((prev) => prev.map((s) => ({ ...s, status: "done" as const })));
        setFindings(getDemoFindings(domainToCheck));
        setStep("result");
        return;
      }
      setCheckStages((prev) => {
        const next = [...prev];
        if (index > 0) next[index - 1].status = "done";
        next[index].status = "checking";
        return next;
      });
      setTimeout(() => animateStages(index + 1), 500);
    };

    setTimeout(() => animateStages(0), 300);
  };

  const securityScore = findings ? Math.max(0, 100 - findings.length * 8 - findings.filter(f => f.businessRiskLevel === "Критический").length * 12) : 0;
  const executiveSummary = findings ? generateExecutiveSummary(findings, domain) : "";
  const topActions = findings ? getTopActions(findings, 3) : [];
  const sortedFindings = findings ? sortByBusinessImpact(findings) : [];
  const critical = findings?.filter((f) => f.businessRiskLevel === "Критический").length || 0;

  const toggleTechnical = (id: string) => {
    setShowTechnical((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyDeveloperTask = (finding: BusinessFinding) => {
    const task = `**${finding.developerTask.title}**\n\n${finding.developerTask.description}\n\n**Priority:** ${finding.developerTask.priority}\n**Estimate:** ${finding.developerTask.estimate}`;
    navigator.clipboard.writeText(task);
    setCopiedId(finding.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Container>
      <div className="max-w-3xl mx-auto py-6">

        {/* === HELLO SCREEN === */}
        {step === "hello" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-tight max-w-2xl mb-4">
              {t("heroV4.hello")}
            </h1>
            <p className="text-xl text-muted-2 mb-12 max-w-xl">
              {t("heroV4.question")}
            </p>
            <button
              onClick={() => setStep("domain")}
              className="px-8 py-3.5 text-base font-medium text-foreground border border-border rounded-xl hover:border-violet-500/40 hover:bg-surface/50 transition-colors"
            >
              {t("heroV4.cta")}
            </button>
            <p className="mt-6 text-xs text-muted-2">
              {t("heroV4.trust")}
            </p>
          </motion.div>
        )}

        {/* === DOMAIN SCREEN === */}
        {step === "domain" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4"
          >
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight mb-3 max-w-lg">
              {t("heroV4.domainTitle")}
            </h2>
            <p className="text-sm text-muted-2 mb-8 max-w-md">
              {t("heroV4.domainSubtitle")}
            </p>
            <div className="flex gap-2 w-full max-w-md">
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && domain.trim() && startCheck(domain)}
                placeholder={t("heroV4.domainPlaceholder")}
                className="flex-1 px-4 py-3.5 rounded-xl bg-surface border border-border text-base text-foreground placeholder:text-muted-2 focus:border-violet-500/40 focus:outline-none transition-colors"
                autoFocus
              />
              <button
                onClick={() => domain.trim() && startCheck(domain)}
                disabled={!domain.trim()}
                className={`px-6 py-3.5 rounded-xl text-base font-medium transition-all whitespace-nowrap ${
                  domain.trim()
                    ? "bg-foreground text-background hover:opacity-80"
                    : "bg-surface-2 text-muted-2 cursor-not-allowed"
                }`}
              >
                {t("heroV4.domainCta")}
              </button>
            </div>
            <div className="flex items-center gap-4 mt-4 text-[11px] text-muted-2">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {t("heroV4.trustTime")}</span>
              <span>{t("heroV4.trustNoreg")}</span>
              <span>{t("heroV4.trustDomain")}</span>
            </div>
          </motion.div>
        )}

        {/* === CHECKING SCREEN === */}
        {step === "checking" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-[70vh] flex flex-col items-center justify-center px-4"
          >
            <div className="w-full max-w-md">
              <div className="text-center mb-8">
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                  <Radar className="w-8 h-8 text-violet-500 mx-auto mb-3" />
                </motion.div>
                <p className="text-sm text-muted-2">
                  {t("heroV4.checking")} <span className="text-foreground font-medium">{domain}</span>
                </p>
              </div>
              <div className="space-y-1.5">
                {checkStages.map((stage, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: stage.status !== "pending" ? 1 : 0.3, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-center gap-3 p-2 rounded-lg text-sm transition-colors ${
                      stage.status === "done" && stage.severity === "critical"
                        ? "text-red-500"
                        : stage.status === "done" && stage.severity === "warning"
                        ? "text-amber-500"
                        : stage.status === "done"
                        ? "text-emerald-500"
                        : "text-muted-2"
                    }`}
                  >
                    <div className="w-4 h-4 shrink-0">
                      {stage.status === "checking" && (
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                          <Radar className="w-4 h-4" />
                        </motion.div>
                      )}
                      {stage.status === "done" && stage.severity === "ok" && <CheckCircle2 className="w-4 h-4" />}
                      {stage.status === "done" && stage.severity === "warning" && <AlertCircle className="w-4 h-4" />}
                      {stage.status === "done" && stage.severity === "critical" && <AlertCircle className="w-4 h-4" />}
                    </div>
                    <span className="flex-1">{stage.label}</span>
                    {stage.status === "done" && stage.result && (
                      <span className="text-xs">{stage.result}</span>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* === RESULT SCREEN (Security Review inline) === */}
        {step === "result" && findings && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Demo badge */}
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                {t("home.result.demo")}
              </span>
              <span className="text-[10px] text-muted-2">{t("home.result.demoNote")}</span>
            </div>

            {/* Security Score */}
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-foreground">Security Score</span>
                <span className={`text-4xl font-bold tabular-nums ${securityScore < 50 ? "text-red-500" : securityScore < 75 ? "text-amber-500" : "text-emerald-500"}`}>
                  {securityScore}<span className="text-lg text-muted-2">/100</span>
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-foreground/5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${securityScore}%` }}
                  transition={{ duration: 1 }}
                  className={`h-full ${securityScore < 50 ? "bg-red-500" : securityScore < 75 ? "bg-amber-500" : "bg-emerald-500"}`}
                />
              </div>
            </div>

            {/* AI Executive Summary */}
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-start gap-3 pb-3 border-b border-border">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-bold tracking-wider text-violet-500 uppercase mb-1">{t("securityReview.aiSummary")}</div>
                  <p className="text-sm text-foreground/90 leading-relaxed">{executiveSummary}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-red-500" /><span className="text-foreground/70">{critical} {t("securityReview.critical")}</span></span>
                  </div>
                </div>
              </div>

              {/* Top Actions */}
              <div className="pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">{t("securityReview.topActions")}</span>
                </div>
                <div className="space-y-1.5">
                  {topActions.map((finding, i) => (
                    <div key={finding.id} className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${finding.businessRiskLevel === "Критический" ? "border-red-500/20 bg-red-500/5" : finding.businessRiskLevel === "Высокий" ? "border-orange-500/20 bg-orange-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${finding.businessRiskLevel === "Критический" ? "bg-red-500/20 text-red-500" : finding.businessRiskLevel === "Высокий" ? "bg-orange-500/20 text-orange-500" : "bg-amber-500/20 text-amber-500"}`}>{i + 1}</span>
                      <span className="text-foreground/80 flex-1 truncate">{finding.businessTitle}</span>
                      <span className="text-muted-2 shrink-0 flex items-center gap-1"><Clock className="w-3 h-3" /> {finding.fixTime}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* All Findings */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileBarChart className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">{t("securityReview.allFindings")} ({findings.length})</span>
              </div>
              <div className="space-y-1">
                {sortedFindings.map((finding) => {
                  const expanded = expandedFinding === finding.id;
                  const showTech = showTechnical.has(finding.id);
                  const copied = copiedId === finding.id;
                  const riskColor = getRiskLevelColor(finding.businessRiskLevel);
                  return (
                    <div key={finding.id} className="rounded-lg border border-border overflow-hidden">
                      <button onClick={() => setExpandedFinding(expanded ? null : finding.id)} className="w-full p-2.5 flex items-start gap-2 hover:bg-surface-2/50 transition-colors text-left">
                        {expanded ? <ChevronDown className="w-3 h-3 text-muted-2 shrink-0 mt-0.5" /> : <ChevronRight className="w-3 h-3 text-muted-2 shrink-0 mt-0.5" />}
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${riskColor}`}>{finding.businessRiskLevel}</span>
                        <span className="text-xs font-medium text-foreground flex-1">{finding.businessTitle}</span>
                        <span className="text-[10px] text-muted-2 shrink-0">{finding.fixTime}</span>
                      </button>
                      <AnimatePresence>
                        {expanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border">
                            <div className="p-3 space-y-2">
                              <div className="flex items-start gap-2"><span className="text-[9px] font-bold uppercase tracking-wider text-violet-500 mt-0.5 w-20 shrink-0">{t("securityReview.whatHappened")}</span><span className="text-xs text-foreground/80">{finding.businessTitle}</span></div>
                              <div className="flex items-start gap-2"><span className="text-[9px] font-bold uppercase tracking-wider text-red-500 mt-0.5 w-20 shrink-0">{t("securityReview.whyDangerous")}</span><span className="text-xs text-foreground/80">{finding.businessImpact}</span></div>
                              <div className="flex items-start gap-2"><span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500 mt-0.5 w-20 shrink-0">{t("securityReview.whatToDo")}</span><span className="text-xs text-foreground/80">{finding.nextStep}</span></div>
                              <div className="flex items-center gap-2 pt-1.5 border-t border-border">
                                <button onClick={() => copyDeveloperTask(finding)} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium ${copied ? "bg-emerald-500/10 text-emerald-600" : "bg-violet-500/10 text-violet-600"} transition-colors`}>
                                  {copied ? <><Check className="w-2.5 h-2.5" /> {t("securityReview.copied")}</> : <><Copy className="w-2.5 h-2.5" /> {t("securityReview.copyTask")}</>}
                                </button>
                                <button onClick={() => toggleTechnical(finding.id)} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium ${showTech ? "bg-foreground/10 text-foreground" : "bg-surface-2 text-muted-2"} transition-colors`}>
                                  <Code className="w-2.5 h-2.5" /> {t("securityReview.technicalDetails")}
                                </button>
                              </div>
                              {showTech && (
                                <div className="p-2 rounded-md bg-surface-2/50 border border-border text-[10px] space-y-1">
                                  {finding.cve && <div><span className="text-muted-2">CVE: </span><code className="text-foreground/80">{finding.cve}</code></div>}
                                  {finding.cvss && <div><span className="text-muted-2">CVSS: </span><span className="text-foreground/80 font-bold">{finding.cvss}</span></div>}
                                  {finding.port && <div><span className="text-muted-2">Port: </span><code className="text-foreground/80">{finding.port}</code></div>}
                                  <div><span className="text-muted-2">Technical: </span><code className="text-foreground/60">{finding.technicalTitle}</code></div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Advanced Analysis */}
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full p-3 flex items-center gap-2 hover:bg-surface-2/50 transition-colors">
                <Settings className="w-4 h-4 text-muted-2" />
                <span className="text-sm font-medium text-foreground/80 flex-1 text-left">{t("ife.advanced.title")}</span>
                <ChevronDown className={`w-4 h-4 text-muted-2 transition-transform ${showAdvanced ? "" : "rotate-180"}`} />
              </button>
              {showAdvanced && (
                <div className="p-3 border-t border-border space-y-2">
                  <p className="text-xs text-muted-2 mb-2">{t("ife.advanced.desc")}</p>
                  <Link href="/app/scanner" className="flex items-center gap-2 p-2 rounded-lg bg-surface-2/50 border border-border hover:border-violet-500/20 transition-colors">
                    <Radar className="w-4 h-4 text-violet-500" />
                    <span className="text-xs text-foreground/80 flex-1">{t("ife.advanced.scanner")}</span>
                    <ArrowRight className="w-3 h-3 text-muted-2" />
                  </Link>
                  <Link href="/app/findings" className="flex items-center gap-2 p-2 rounded-lg bg-surface-2/50 border border-border hover:border-violet-500/20 transition-colors">
                    <Bug className="w-4 h-4 text-violet-500" />
                    <span className="text-xs text-foreground/80 flex-1">{t("ife.advanced.findings")}</span>
                    <ArrowRight className="w-3 h-3 text-muted-2" />
                  </Link>
                </div>
              )}
            </div>

            {/* CTA + restart */}
            <div className="flex items-center gap-2 pt-2">
              <Link href="/app/pricing" className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> {t("home.result.upgrade")}
              </Link>
              <Link href="/app/security-review" className="px-4 py-2 rounded-lg bg-surface-2 text-foreground/70 text-xs font-medium hover:bg-foreground/5 transition-colors">
                {t("securityReview.title")}
              </Link>
              <button onClick={() => { setStep("hello"); setDomain(""); setFindings(null); }} className="ml-auto px-3 py-2 text-xs text-muted-2 hover:text-foreground transition-colors">
                {t("ife.restart")}
              </button>
            </div>
          </motion.div>
        )}

      </div>
    </Container>
  );
}
