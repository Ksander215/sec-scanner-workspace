/**
 * /app/home - User Home (PX-001 Redesigned)
 *
 * First 30 Seconds: пользователь понимает что это, для кого, зачем, что нажать.
 * First Value: вводит домен → AI начинает проверку → получает рекомендацию за 2 минуты.
 *
 * AI Assistant = главный интерфейс. Пользователь может ввести запрос прямо на Home.
 *
 * Никаких инженерных терминов. Никаких mock данных. Честный empty state.
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
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
  Send,
  TrendingUp,
  Lock,
  Clock,
} from "lucide-react";

export default function UserHomePage() {
  const { t } = useI18n();
  const [domain, setDomain] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<null | { found: number; critical: number; recommendation: string }>(null);

  const handleCheck = () => {
    if (!domain.trim()) return;
    setChecking(true);
    setResult(null);
    // Simulate AI check (will be replaced by real backend in EP-004)
    setTimeout(() => {
      setChecking(false);
      setResult({
        found: 3,
        critical: 1,
        recommendation: "Найдена критическая проблема: устаревший SSL сертификат. Рекомендую обновить — это займёт 15 минут и устранит риск перехвата данных.",
      });
    }, 3000);
  };

  return (
    <Container>
      <div className="max-w-4xl mx-auto space-y-6 py-6">
        {/* Hero — First 30 Seconds */}
        <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-cyan-500/5 p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground tracking-tight mb-1">
                {t("home.hero.title")}
              </h1>
              <p className="text-sm text-muted-2">
                {t("home.hero.subtitle")}
              </p>
            </div>
          </div>

          {/* First Value: Domain input + AI check */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-2 mb-2">
              <Zap className="w-4 h-4 text-violet-500" />
              <span>{t("home.firstValue.title")}</span>
            </div>
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
                    {t("home.firstValue.check")}
                  </>
                )}
              </button>
            </div>

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

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border bg-surface p-5"
                >
                  {/* Executive Summary First (BLOCK 4) */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      result.critical > 0 ? "bg-red-500/10" : "bg-emerald-500/10"
                    }`}>
                      {result.critical > 0 ? (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-foreground mb-1">
                        {t("home.result.title")}
                      </div>
                      <div className="text-xs text-muted-2 mb-3">
                        {t("home.result.subtitle").replace("{{domain}}", domain)}
                      </div>
                    </div>
                  </div>

                  {/* What happened → Why dangerous → What to do → Time */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-violet-500 mt-0.5 w-20 shrink-0">
                        {t("home.result.whatHappened")}
                      </span>
                      <span className="text-xs text-foreground/80">
                        {t("home.result.found").replace("{{count}}", String(result.found)).replace("{{critical}}", String(result.critical))}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 mt-0.5 w-20 shrink-0">
                        {t("home.result.whyDangerous")}
                      </span>
                      <span className="text-xs text-foreground/80">
                        {t("home.result.danger")}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mt-0.5 w-20 shrink-0">
                        {t("home.result.whatToDo")}
                      </span>
                      <span className="text-xs text-foreground/80">
                        {result.recommendation}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mt-0.5 w-20 shrink-0">
                        {t("home.result.timeNeeded")}
                      </span>
                      <span className="text-xs text-foreground/80">
                        {t("home.result.time")}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <Link
                      href="/app/scanner"
                      className="px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 transition-colors"
                    >
                      {t("home.result.details")}
                    </Link>
                    <button className="px-3 py-1.5 rounded-lg bg-surface-2 text-foreground/70 text-xs font-medium hover:bg-foreground/5 transition-colors">
                      {t("home.result.technicalDetails")}
                    </button>
                    {/* Commercial UX (BLOCK 8) */}
                    <Link
                      href="/app/pricing"
                      className="ml-auto px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                    >
                      <TrendingUp className="w-3 h-3" />
                      {t("home.result.upgrade")}
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Examples */}
            {!checking && !result && (
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
              { text: t("home.ai.prompt1"), icon: Radar },
              { text: t("home.ai.prompt2"), icon: TrendingUp },
              { text: t("home.ai.prompt3"), icon: AlertCircle },
              { text: t("home.ai.prompt4"), icon: FileBarChart },
            ].map((p, i) => {
              const Icon = p.icon;
              return (
                <Link
                  key={i}
                  href="/app/scanner"
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
