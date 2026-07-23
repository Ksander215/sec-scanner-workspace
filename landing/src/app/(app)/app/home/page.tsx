/**
 * /app/home - User Home (PX-005 Hero V3)
 *
 * Hero V3 отвечает на 5 вопросов за 5 секунд:
 *   1. Что это? → "AI Security Advisor для вашего бизнеса"
 *   2. Для кого? → "Для компаний без security-команды"
 *   3. Что получу? → "Понимание безопасности без инженера"
 *   4. Почему доверять? → "AI переводит техническое на язык бизнеса"
 *   5. Что делать дальше? → "Введите адрес сайта → проверка за 2 минуты"
 *
 * First Value: вводит домен → AI начинает проверку → получает рекомендацию за 2 минуты.
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
} from "lucide-react";
import {
  getDemoFindings,
  generateExecutiveSummary,
  getTopActions,
  sortByBusinessImpact,
  getRiskLevelColor,
  type BusinessFinding,
} from "@/lib/findings-translator";

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
  const [domain, setDomain] = useState("");
  const [checking, setChecking] = useState(false);
  const [findings, setFindings] = useState<BusinessFinding[] | null>(null);
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auto-fill domain from landing page query param and auto-check
  useEffect(() => {
    const domainParam = searchParams.get("domain");
    if (domainParam && !domain && !findings && !checking) {
      setDomain(domainParam);
      // Auto-trigger check after short delay
      setTimeout(() => {
        setChecking(true);
        setTimeout(() => {
          setChecking(false);
          setFindings(getDemoFindings(domainParam));
        }, 3000);
      }, 500);
    }
  }, [searchParams, domain, findings, checking]);

  const handleCheck = () => {
    if (!domain.trim()) return;
    setChecking(true);
    setFindings(null);
    // EP-001: Result = Security Review format (demo data, honestly marked)
    // EP-004 will replace with real backend check
    setTimeout(() => {
      setChecking(false);
      setFindings(getDemoFindings(domain));
    }, 3000);
  };

  const executiveSummary = findings ? generateExecutiveSummary(findings, domain) : "";
  const topActions = findings ? getTopActions(findings, 5) : [];
  const sortedFindings = findings ? sortByBusinessImpact(findings) : [];
  const critical = findings?.filter((f) => f.businessRiskLevel === "Критический").length || 0;
  const totalFixTime = findings?.reduce((s, f) => {
    const m = f.fixTime.match(/(\d+)/);
    return s + (m ? parseInt(m[1]) : 0);
  }, 0) || 0;

  const toggleTechnical = (id: string) => {
    setShowTechnical((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyDeveloperTask = (finding: BusinessFinding) => {
    const task = `**${finding.developerTask.title}**\n\n${finding.developerTask.description}\n\n**Priority:** ${finding.developerTask.priority}\n**Estimate:** ${finding.developerTask.estimate}\n**Labels:** ${finding.developerTask.labels.join(", ")}`;
    navigator.clipboard.writeText(task);
    setCopiedId(finding.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Container>
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        {/* PX-002: Hero V2 — From Product to Desire */}
        <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-cyan-500/5 p-8">
          {/* BLOCK 1: Эмоциональный триггер */}
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-2">
              {t("home.heroV2.headline")}
            </h1>
            <p className="text-sm text-muted-2">
              {t("home.heroV2.subheadline")}
            </p>
          </div>

          {/* BLOCK 2: Визуальная карточка — что увидит пользователь */}
          <div className="rounded-xl border border-border bg-surface/80 p-5 mb-6 max-w-md">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">example.com</div>
                <div className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Риск: Высокий</div>
              </div>
            </div>
            <div className="space-y-1.5 mb-3">
              <div className="flex items-center gap-2 text-xs text-foreground/70">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                SSL сертификат истекает через 3 дня
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground/70">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                SSH порт открыт для всех
              </div>
              <div className="flex items-center gap-2 text-xs text-foreground/70">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Заголовки безопасности отсутствуют
              </div>
            </div>
            <div className="pt-2 border-t border-border">
              <div className="flex items-center gap-1.5 text-[11px] text-violet-500">
                <Sparkles className="w-3 h-3" />
                <span>AI рекомендует: начните с SSL — это 15 минут</span>
              </div>
            </div>
          </div>

          {/* BLOCK 3: Момент доверия */}
          <div className="flex items-center gap-4 text-[11px] text-muted-2 mb-4">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-500" />
              {t("home.heroV2.trust1")}
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              {t("home.heroV2.trust2")}
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-500" />
              {t("home.heroV2.trust3")}
            </span>
          </div>

          {/* BLOCK 4: Усиленный CTA + domain input */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-2" />
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCheck()}
                  placeholder={t("home.firstValue.placeholder")}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-2 focus:border-violet-500/50 focus:outline-none transition-colors"
                  disabled={checking}
                />
              </div>
              <button
                onClick={handleCheck}
                disabled={!domain.trim() || checking}
                className={`px-5 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                  domain.trim() && !checking
                    ? "bg-violet-600 text-white hover:bg-violet-700"
                    : "bg-surface-2 text-muted-2 cursor-not-allowed"
                }`}
              >
                {checking ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Radar className="w-4 h-4" />
                    </motion.div>
                    {t("home.firstValue.checking")}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    {t("home.heroV2.cta")}
                  </>
                )}
              </button>
            </div>

            {/* BLOCK 5: First Success Preview */}
            {!checking && !findings && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-muted-2">{t("home.heroV2.preview")}:</span>
                {["AI Summary", "Критичные риски", "План исправлений", "Отчёт PDF"].map((item) => (
                  <span key={item} className="px-2 py-0.5 rounded-md bg-foreground/5 text-[10px] text-foreground/50">
                    {item}
                  </span>
                ))}
              </div>
            )}

            {/* Examples */}
            {!checking && !findings && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-muted-2">{t("home.firstValue.examples")}:</span>
                {["example.com", "mycompany.ru", "test.site"].map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setDomain(ex)}
                    className="px-2 py-0.5 rounded-md bg-foreground/5 text-[11px] text-foreground/60 hover:bg-foreground/10 transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}

            {/* AI check result */}
            <AnimatePresence>
              {checking && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4"
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Sparkles className="w-5 h-5 text-violet-500" />
                    </motion.div>
                    <div className="text-sm text-foreground/80">
                      {t("home.firstValue.aiWorking")}
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 ml-8">
                    <div className="text-xs text-muted-2 flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {t("home.firstValue.step1")}
                    </div>
                    <div className="text-xs text-muted-2 flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {t("home.firstValue.step2")}
                    </div>
                    <div className="text-xs text-muted-2 flex items-center gap-2">
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>
                        <Radar className="w-3 h-3 text-violet-500" />
                      </motion.div>
                      {t("home.firstValue.step3")}
                    </div>
                  </div>
                </motion.div>
              )}

              {findings && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border bg-surface p-5 space-y-4"
                >
                  {/* Demo badge — CX-001 improvement #1 */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                      {t("home.result.demo")}
                    </span>
                    <span className="text-[10px] text-muted-2">
                      {t("home.result.demoNote")}
                    </span>
                  </div>

                  {/* EP-001: AI Executive Summary (First Value) */}
                  <div className="flex items-start gap-3 pb-3 border-b border-border">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] font-bold tracking-wider text-violet-500 uppercase mb-1">
                        {t("securityReview.aiSummary")}
                      </div>
                      <p className="text-sm text-foreground/90 leading-relaxed">
                        {executiveSummary}
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                          <span className="text-foreground/70">{critical} {t("securityReview.critical")}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-foreground/70">~{totalFixTime} {t("securityReview.hours")}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* EP-003: Top Actions (бизнес-приоритет, не CVSS) */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-3.5 h-3.5 text-violet-500" />
                      <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                        {t("securityReview.topActions")}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {topActions.map((finding, i) => (
                        <div
                          key={finding.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${
                            finding.businessRiskLevel === "Критический"
                              ? "border-red-500/20 bg-red-500/5"
                              : finding.businessRiskLevel === "Высокий"
                              ? "border-orange-500/20 bg-orange-500/5"
                              : "border-amber-500/20 bg-amber-500/5"
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            finding.businessRiskLevel === "Критический" ? "bg-red-500/20 text-red-500" :
                            finding.businessRiskLevel === "Высокий" ? "bg-orange-500/20 text-orange-500" :
                            "bg-amber-500/20 text-amber-500"
                          }`}>{i + 1}</span>
                          <span className="text-foreground/80 flex-1 truncate">{finding.businessTitle}</span>
                          <span className="text-muted-2 shrink-0 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {finding.fixTime}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* All Findings — раскрывающийся список */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileBarChart className="w-3.5 h-3.5 text-violet-500" />
                      <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                        {t("securityReview.allFindings")} ({findings.length})
                      </span>
                    </div>
                    <div className="space-y-1">
                      {sortedFindings.map((finding) => {
                        const expanded = expandedFinding === finding.id;
                        const showTech = showTechnical.has(finding.id);
                        const copied = copiedId === finding.id;
                        const riskColor = getRiskLevelColor(finding.businessRiskLevel);
                        return (
                          <div key={finding.id} className="rounded-lg border border-border overflow-hidden">
                            <button
                              onClick={() => setExpandedFinding(expanded ? null : finding.id)}
                              className="w-full p-2.5 flex items-start gap-2 hover:bg-surface-2/50 transition-colors text-left"
                            >
                              {expanded ? <ChevronDown className="w-3 h-3 text-muted-2 shrink-0 mt-0.5" /> : <ChevronRight className="w-3 h-3 text-muted-2 shrink-0 mt-0.5" />}
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${riskColor}`}>
                                {finding.businessRiskLevel}
                              </span>
                              <span className="text-xs font-medium text-foreground flex-1">{finding.businessTitle}</span>
                              <span className="text-[10px] text-muted-2 shrink-0">{finding.fixTime}</span>
                            </button>
                            <AnimatePresence>
                              {expanded && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border">
                                  <div className="p-3 space-y-2">
                                    <div className="flex items-start gap-2">
                                      <span className="text-[9px] font-bold uppercase tracking-wider text-violet-500 mt-0.5 w-20 shrink-0">{t("securityReview.whatHappened")}</span>
                                      <span className="text-xs text-foreground/80">{finding.businessTitle}</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="text-[9px] font-bold uppercase tracking-wider text-red-500 mt-0.5 w-20 shrink-0">{t("securityReview.whyDangerous")}</span>
                                      <span className="text-xs text-foreground/80">{finding.businessImpact}</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-500 mt-0.5 w-20 shrink-0">{t("securityReview.whatToDo")}</span>
                                      <span className="text-xs text-foreground/80">{finding.nextStep}</span>
                                    </div>
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

                  {/* CTA: Pricing (после получения ценности) */}
                  <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <Link href="/app/pricing" className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {t("home.result.upgrade")}
                    </Link>
                    <Link href="/app/security-review" className="px-3 py-1.5 rounded-lg bg-surface-2 text-foreground/70 text-xs font-medium hover:bg-foreground/5 transition-colors">
                      {t("securityReview.title")}
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Examples */}
            {!checking && !findings && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-muted-2">{t("home.firstValue.examples")}:</span>
                {["example.com", "mycompany.ru", "test.site"].map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setDomain(ex)}
                    className="px-2 py-0.5 rounded-md bg-foreground/5 text-[11px] text-foreground/60 hover:bg-foreground/10 transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AI Assistant — главный интерфейс (BLOCK 5) */}
        <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-foreground">{t("home.ai.title")}</span>
          </div>
          <p className="text-xs text-muted-2 mb-4">{t("home.ai.subtitle")}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { text: t("home.ai.prompt1"), icon: Radar, href: "/app/security-review" },
              { text: t("home.ai.prompt2"), icon: TrendingUp, href: "/app/security-review" },
              { text: t("home.ai.prompt3"), icon: AlertCircle, href: "/app/security-review" },
              { text: t("home.ai.prompt4"), icon: FileBarChart, href: "/app/reports" },
            ].map((p, i) => {
              const Icon = p.icon;
              return (
                <Link
                  key={i}
                  href={p.href}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-surface/50 border border-border/50 hover:border-violet-500/20 transition-colors group"
                >
                  <Icon className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                  <span className="text-xs text-foreground/70 flex-1">{p.text}</span>
                  <ArrowRight className="w-3 h-3 text-muted-2 group-hover:text-violet-500 transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <QuickLink href="/app/scans" label={t("home.quick.scans")} icon={Radar} />
          <QuickLink href="/app/findings" label={t("home.quick.findings")} icon={AlertCircle} />
          <QuickLink href="/app/reports" label={t("home.quick.reports")} icon={FileBarChart} />
          <QuickLink href="/app/settings" label={t("home.quick.settings")} icon={Lock} />
        </div>

        {/* Trust indicators */}
        <div className="flex items-center justify-center gap-6 py-4 text-[11px] text-muted-2">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-emerald-500" />
            {t("home.trust.encrypted")}
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            {t("home.trust.aiPowered")}
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-emerald-500" />
            {t("home.trust.fast")}
          </div>
        </div>
      </div>
    </Container>
  );
}

function QuickLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 p-3 rounded-lg bg-surface border border-border hover:border-violet-500/20 transition-colors"
    >
      <Icon className="w-4 h-4 text-muted-2 shrink-0" />
      <span className="text-xs text-foreground/80">{label}</span>
    </Link>
  );
}
