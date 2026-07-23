/**
 * /app/home - Interactive First Experience (EP-005)
 *
 * Hero перестаёт быть рекламным блоком и становится первым экраном приложения.
 * Пользователь начинает пользоваться продуктом в первые секунды.
 *
 * Flow: Question → Role → Think → Domain → Live Check → Security Review → Advanced
 *
 * TTFV target: ≤45 секунд, ≤2 кликов, 1 экран.
 */

"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useI18n } from "@/lib/i18n-context";
import { Container } from "@/components/ui/Container";
import {
  ShieldCheck,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  FileBarChart,
  Radar,
  Search,
  Zap,
  TrendingUp,
  Lock,
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

  // Flow state: welcome → role → think → domain → checking → result
  const [step, setStep] = useState<"welcome" | "role" | "think" | "domain" | "checking" | "result">("welcome");
  const [role, setRole] = useState<string | null>(null);
  const [thinkAnswer, setThinkAnswer] = useState<string | null>(null);
  const [domain, setDomain] = useState("");
  const [checkStages, setCheckStages] = useState<CheckStage[]>([]);
  const [findings, setFindings] = useState<BusinessFinding[] | null>(null);
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Auto-advance from domain param (landing page → /app/home?domain=xxx)
  useEffect(() => {
    const domainParam = searchParams.get("domain");
    if (domainParam && step === "welcome") {
      setDomain(domainParam);
      setStep("domain");
      // Auto-start check after 800ms
      setTimeout(() => startCheck(domainParam), 800);
    }
  }, [searchParams, step]);

  const startCheck = (domainToCheck: string) => {
    setStep("checking");
    setFindings(null);
    const stages: CheckStage[] = CHECK_STAGES_TEMPLATE.map((s) => ({ ...s, status: "pending" }));
    setCheckStages(stages);

    // Use setTimeout chain instead of setInterval for cleaner cleanup
    const animateStages = (index: number) => {
      if (index >= stages.length) {
        // All stages done — show results
        setCheckStages((prev) => prev.map((s) => ({ ...s, status: "done" as const })));
        setFindings(getDemoFindings(domainToCheck));
        setStep("result");
        return;
      }

      // Mark current stage as checking
      setCheckStages((prev) => {
        const next = [...prev];
        if (index > 0) {
          next[index - 1].status = "done";
        }
        next[index].status = "checking";
        return next;
      });

      // Schedule next stage
      setTimeout(() => animateStages(index + 1), 500);
    };

    // Start animation after 300ms
    setTimeout(() => animateStages(0), 300);
  };

  // Compute Security Score
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
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        <AnimatePresence mode="wait">

          {/* BLOCK 1: Hero V5 — Friendly First Impression (50/50 split) */}
          {step === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="pt-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center min-h-[60vh]">

                {/* LEFT: Conversation (50%) */}
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-tight mb-4">
                    {t("heroV5.headline")}
                  </h1>
                  <p className="text-base text-muted-2 mb-6 leading-relaxed">
                    {t("heroV5.subheadline")}
                  </p>

                  {/* Input */}
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && domain.trim() && startCheck(domain)}
                      placeholder={t("heroV5.placeholder")}
                      className="flex-1 px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-2 focus:border-violet-500/40 focus:outline-none transition-colors"
                    />
                    <button
                      onClick={() => domain.trim() ? startCheck(domain) : setStep("role")}
                      className="px-5 py-3 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity whitespace-nowrap"
                    >
                      {t("heroV5.cta")}
                    </button>
                  </div>

                  {/* Trust badges */}
                  <div className="flex items-center gap-3 text-[11px] text-muted-2">
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {t("heroV5.free")}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-emerald-500" /> {t("heroV5.minute")}</span>
                    <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-emerald-500" /> {t("heroV5.clear")}</span>
                  </div>
                </div>

                {/* RIGHT: Live animation (50%) */}
                <div className="hidden md:block">
                  <HeroLiveAnimation t={t} />
                </div>
              </div>
            </motion.div>
          )}

          {/* BLOCK 2: Role selection */}
          {step === "role" && (
            <motion.div
              key="role"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto pt-8"
            >
              <h2 className="text-2xl font-bold text-foreground tracking-tight mb-2 text-center">
                {t("ife.role.title")}
              </h2>
              <p className="text-sm text-muted-2 mb-6 text-center">
                {t("ife.role.subtitle")}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { id: "executive", icon: TrendingUp, label: t("ife.role.executive"), desc: t("ife.role.executiveDesc") },
                  { id: "developer", icon: Code, label: t("ife.role.developer"), desc: t("ife.role.developerDesc") },
                  { id: "security", icon: ShieldCheck, label: t("ife.role.security"), desc: t("ife.role.securityDesc") },
                ].map((r) => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.id}
                      onClick={() => { setRole(r.id); setStep("think"); }}
                      className="p-4 rounded-xl border border-border bg-surface hover:border-violet-500/30 transition-colors text-left group"
                    >
                      <Icon className="w-6 h-6 text-violet-500 mb-2" />
                      <div className="text-sm font-semibold text-foreground">{r.label}</div>
                      <div className="text-[11px] text-muted-2 mt-0.5">{r.desc}</div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* BLOCK 3: Think question */}
          {step === "think" && (
            <motion.div
              key="think"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto pt-8"
            >
              <h2 className="text-2xl font-bold text-foreground tracking-tight mb-2 text-center">
                {t("ife.think.title")}
              </h2>
              <p className="text-sm text-muted-2 mb-6 text-center">
                {t("ife.think.subtitle")}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { id: "minute", label: t("ife.think.minute") },
                  { id: "hour", label: t("ife.think.hour") },
                  { id: "day", label: t("ife.think.day") },
                  { id: "unknown", label: t("ife.think.unknown") },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => { setThinkAnswer(opt.id); setStep("domain"); }}
                    className="p-3 rounded-xl border border-border bg-surface hover:border-violet-500/30 transition-colors text-center"
                  >
                    <span className="text-sm font-medium text-foreground/80">{opt.label}</span>
                  </button>
                ))}
              </div>
              <p className="mt-4 text-center text-[11px] text-muted-2">
                {t("ife.think.hint")}
              </p>
            </motion.div>
          )}

          {/* BLOCK 4: Domain input */}
          {step === "domain" && (
            <motion.div
              key="domain"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto pt-8"
            >
              <h2 className="text-2xl font-bold text-foreground tracking-tight mb-2 text-center">
                {t("ife.domain.title")}
              </h2>
              <p className="text-sm text-muted-2 mb-6 text-center">
                {t("ife.domain.subtitle")}
              </p>
              <div className="flex gap-2 max-w-lg mx-auto">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-2" />
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && domain.trim() && startCheck(domain)}
                    placeholder={t("ife.domain.placeholder")}
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-surface border border-border text-base text-foreground placeholder:text-muted-2 focus:border-violet-500/50 focus:outline-none transition-colors shadow-lg"
                    autoFocus
                  />
                </div>
                <button
                  onClick={() => domain.trim() && startCheck(domain)}
                  disabled={!domain.trim()}
                  className={`px-6 py-3.5 rounded-xl text-base font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                    domain.trim()
                      ? "bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-500/20"
                      : "bg-surface-2 text-muted-2 cursor-not-allowed"
                  }`}
                >
                  {t("ife.domain.cta")}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-muted-2">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-emerald-500" /> {t("ife.trust.time")}</span>
                <span className="flex items-center gap-1"><Lock className="w-3 h-3 text-emerald-500" /> {t("ife.trust.noreg")}</span>
                <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500" /> {t("ife.trust.domain")}</span>
              </div>
              <div className="flex items-center gap-2 justify-center mt-3">
                <span className="text-[11px] text-muted-2">{t("ife.domain.examples")}:</span>
                {["example.com", "mycompany.ru"].map((ex) => (
                  <button key={ex} onClick={() => setDomain(ex)} className="px-2 py-0.5 rounded-md bg-foreground/5 text-[11px] text-foreground/60 hover:bg-foreground/10 transition-colors">{ex}</button>
                ))}
              </div>
            </motion.div>
          )}

          {/* BLOCK 5: Live check animation */}
          {step === "checking" && (
            <motion.div
              key="checking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-lg mx-auto pt-8"
            >
              <div className="text-center mb-6">
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                  <Radar className="w-10 h-10 text-violet-500 mx-auto mb-3" />
                </motion.div>
                <h2 className="text-xl font-bold text-foreground">
                  {t("ife.checking.title")} <span className="text-violet-500">{domain}</span>
                </h2>
              </div>
              <div className="space-y-2">
                {checkStages.map((stage, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: stage.status !== "pending" ? 1 : 0.3, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                      stage.status === "done" && stage.severity === "critical"
                        ? "border-red-500/20 bg-red-500/5"
                        : stage.status === "done" && stage.severity === "warning"
                        ? "border-amber-500/20 bg-amber-500/5"
                        : stage.status === "done"
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-border bg-surface"
                    }`}
                  >
                    <div className="w-5 h-5 shrink-0">
                      {stage.status === "checking" && (
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                          <Radar className="w-5 h-5 text-violet-500" />
                        </motion.div>
                      )}
                      {stage.status === "done" && stage.severity === "ok" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                      {stage.status === "done" && stage.severity === "warning" && <AlertCircle className="w-5 h-5 text-amber-500" />}
                      {stage.status === "done" && stage.severity === "critical" && <AlertCircle className="w-5 h-5 text-red-500" />}
                    </div>
                    <span className={`text-sm flex-1 ${stage.status === "pending" ? "text-muted-2" : "text-foreground/80"}`}>
                      {stage.label}
                    </span>
                    {stage.status === "done" && stage.result && (
                      <span className={`text-xs font-medium ${
                        stage.severity === "critical" ? "text-red-500" :
                        stage.severity === "warning" ? "text-amber-500" :
                        "text-emerald-500"
                      }`}>
                        {stage.result}
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* BLOCK 6: Security Review (inline result) */}
          {step === "result" && findings && (
            <motion.div
              key="result"
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
              <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-foreground">Security Score</span>
                  <span className={`text-4xl font-bold tabular-nums ${securityScore < 50 ? "text-red-500" : securityScore < 75 ? "text-amber-500" : "text-emerald-500"}`}>
                    {securityScore}<span className="text-lg text-muted-2">/100</span>
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-foreground/5 overflow-hidden">
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

              {/* Advanced Analysis (Scanner lives here) */}
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

              {/* CTA: Pricing */}
              <div className="flex items-center gap-2 pt-2">
                <Link href="/app/pricing" className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> {t("home.result.upgrade")}
                </Link>
                <Link href="/app/security-review" className="px-4 py-2 rounded-lg bg-surface-2 text-foreground/70 text-xs font-medium hover:bg-foreground/5 transition-colors">
                  {t("securityReview.title")}
                </Link>
                <button onClick={() => { setStep("welcome"); setDomain(""); setFindings(null); }} className="ml-auto px-3 py-2 text-xs text-muted-2 hover:text-foreground transition-colors">
                  {t("ife.restart")}
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </Container>
  );
}

/* ─── Hero Live Animation — циклическая демо-анимация ────────────────── */

function HeroLiveAnimation({ t }: { t: (key: string) => string }) {
  const [phase, setPhase] = useState<"checking" | "score" | "summary" | "recommendations">("checking");

  useEffect(() => {
    const cycle = () => {
      setPhase("checking");
      setTimeout(() => setPhase("score"), 5000);
      setTimeout(() => setPhase("summary"), 8000);
      setTimeout(() => setPhase("recommendations"), 11000);
      // Loop back after 14s
      setTimeout(() => cycle(), 14000);
    };
    cycle();
  }, []);

  return (
    <div className="relative rounded-2xl border border-border bg-surface/60 backdrop-blur-sm p-5 overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-violet-500/5 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-cyan-500/5 blur-3xl" />

      <div className="relative z-10">
        {/* Phase: Checking */}
        {phase === "checking" && (
          <div className="space-y-2.5">
            <div className="text-[10px] font-bold tracking-wider text-muted-2 uppercase mb-3">
              {t("heroV5.animChecking")}
            </div>
            {[
              { label: "SSL", delay: 0 },
              { label: "DNS", delay: 0.5 },
              { label: "Headers", delay: 1.0 },
              { label: "Ports", delay: 1.5 },
              { label: "AI Analysis", delay: 2.0 },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: item.delay, duration: 0.4 }}
                className="flex items-center gap-2.5 text-sm"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: item.delay + 0.3, type: "spring", stiffness: 200 }}
                  className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                </motion.div>
                <span className="text-foreground/70">{item.label}</span>
                <span className="text-[10px] text-emerald-500 ml-auto">{t("heroV5.animDone")}</span>
              </motion.div>
            ))}
          </div>
        )}

        {/* Phase: Security Score */}
        {phase === "score" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
            <div className="text-[10px] font-bold tracking-wider text-muted-2 uppercase mb-2">Security Score</div>
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 150 }}
              className="text-5xl font-bold text-emerald-500 mb-3"
            >
              87
            </motion.div>
            <div className="w-full h-2.5 rounded-full bg-foreground/5 overflow-hidden mx-auto max-w-[200px]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "87%" }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full"
              />
            </div>
          </motion.div>
        )}

        {/* Phase: AI Summary */}
        {phase === "summary" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="text-[10px] font-bold tracking-wider text-violet-500 uppercase">AI Executive Summary</span>
            </div>
            <p className="text-xs text-foreground/70 leading-relaxed">
              {t("heroV5.animSummary")}
            </p>
          </motion.div>
        )}

        {/* Phase: Recommendations */}
        {phase === "recommendations" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
            <div className="text-[10px] font-bold tracking-wider text-muted-2 uppercase mb-2">
              {t("heroV5.animRecommendations")}
            </div>
            {[
              { label: "CSP", delay: 0 },
              { label: "HSTS", delay: 0.2 },
              { label: "Security Headers", delay: 0.4 },
            ].map((rec) => (
              <motion.div
                key={rec.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: rec.delay, duration: 0.3 }}
                className="flex items-center gap-2 text-xs"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="text-foreground/70">{rec.label}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
