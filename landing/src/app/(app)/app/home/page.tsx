/**
 * /app/home - User Home (EP-001 BLOCK 4)
 *
 * Не Dashboard. Не Command Center. Именно Home.
 * Только ответы на 4 вопроса:
 *   1. Что происходит?
 *   2. Что делать?
 *   3. Что проверить?
 *   4. Что рекомендует AI?
 *
 * Никаких внутренних процентов SIP.
 * Никаких Architecture Ready.
 * Никаких Evolution.
 */

"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useI18n } from "@/lib/i18n-context";
import { Container } from "@/components/ui/Container";
import {
  ShieldCheck,
  Zap,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  FileBarChart,
  Radar,
  Activity,
} from "lucide-react";

export default function UserHomePage() {
  const { t } = useI18n();

  return (
    <Container>
      <div className="max-w-5xl mx-auto space-y-6 py-6">
        {/* Hero */}
        <div className="rounded-xl border border-violet-500/15 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">
                {t("home.hero.title")}
              </h1>
              <p className="text-sm text-muted-2">
                {t("home.hero.subtitle")}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-muted-2">{t("home.hero.live")}</span>
            </div>
          </div>
        </div>

        {/* Section 1: Что происходит? */}
        <Section
          title={t("home.section.whatsHappening")}
          icon={Activity}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatusCard
              label={t("home.status.security")}
              value={t("home.status.good")}
              color="text-emerald-500"
              bg="bg-emerald-500/10"
              icon={ShieldCheck}
            />
            <StatusCard
              label={t("home.status.lastScan")}
              value={t("home.status.never")}
              color="text-amber-500"
              bg="bg-amber-500/10"
              icon={Radar}
            />
            <StatusCard
              label={t("home.status.findings")}
              value="0"
              color="text-emerald-500"
              bg="bg-emerald-500/10"
              icon={CheckCircle2}
            />
          </div>
        </Section>

        {/* Section 2: Что делать? */}
        <Section
          title={t("home.section.whatToDo")}
          icon={Zap}
        >
          <div className="space-y-2">
            <ActionCard
              href="/app/scanner"
              icon={Radar}
              title={t("home.action.scan.title")}
              desc={t("home.action.scan.desc")}
              cta={t("home.action.scan.cta")}
              primary
            />
            <ActionCard
              href="/app/reports"
              icon={FileBarChart}
              title={t("home.action.report.title")}
              desc={t("home.action.report.desc")}
              cta={t("home.action.report.cta")}
            />
            <ActionCard
              href="/app/marketplace"
              icon={Sparkles}
              title={t("home.action.marketplace.title")}
              desc={t("home.action.marketplace.desc")}
              cta={t("home.action.marketplace.cta")}
            />
          </div>
        </Section>

        {/* Section 3: Что проверить? */}
        <Section
          title={t("home.section.whatToCheck")}
          icon={AlertCircle}
        >
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground mb-1">
                  {t("home.check.title")}
                </div>
                <p className="text-xs text-muted-2 mb-3">
                  {t("home.check.desc")}
                </p>
                <Link
                  href="/app/scanner"
                  className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:gap-2 transition-all"
                >
                  {t("home.check.cta")}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </Section>

        {/* Section 4: Что рекомендует AI? */}
        <Section
          title={t("home.section.aiRecommendations")}
          icon={Sparkles}
        >
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">
                  {t("home.ai.title")}
                </div>
                <p className="text-xs text-muted-2 mt-0.5">
                  {t("home.ai.subtitle")}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <AIRecommendation
                text={t("home.ai.rec1")}
                href="/app/scanner"
              />
              <AIRecommendation
                text={t("home.ai.rec2")}
                href="/app/marketplace"
              />
              <AIRecommendation
                text={t("home.ai.rec3")}
                href="/app/reports"
              />
            </div>

            <div className="mt-4 pt-4 border-t border-violet-500/15">
              <p className="text-[11px] text-muted-2 text-center">
                {t("home.ai.footer")}
              </p>
            </div>
          </div>
        </Section>

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <QuickLink href="/app/scans" label={t("home.quick.scans")} icon={Radar} />
          <QuickLink href="/app/findings" label={t("home.quick.findings")} icon={AlertCircle} />
          <QuickLink href="/app/reports" label={t("home.quick.reports")} icon={FileBarChart} />
          <QuickLink href="/app/settings" label={t("home.quick.settings")} icon={ShieldCheck} />
        </div>
      </div>
    </Container>
  );
}

/* --- Helpers --- */

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-violet-500" />
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function StatusCard({
  label,
  value,
  color,
  bg,
  icon: Icon,
}: {
  label: string;
  value: string;
  color: string;
  bg: string;
  icon: React.ElementType;
}) {
  return (
    <div className={`p-4 rounded-xl ${bg} border border-border`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-[10px] text-muted-2 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function ActionCard({
  href,
  icon: Icon,
  title,
  desc,
  cta,
  primary = false,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  desc: string;
  cta: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 p-4 rounded-xl border transition-colors group ${
        primary
          ? "border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10"
          : "border-border bg-surface hover:border-violet-500/20"
      }`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
        primary ? "bg-violet-500/20" : "bg-surface-2"
      }`}>
        <Icon className={`w-5 h-5 ${primary ? "text-violet-500" : "text-muted-2"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="text-xs text-muted-2">{desc}</div>
      </div>
      <span className={`text-xs font-medium ${primary ? "text-violet-600 dark:text-violet-400" : "text-muted-2"} group-hover:gap-2 inline-flex items-center gap-1 transition-all`}>
        {cta}
        <ArrowRight className="w-3 h-3" />
      </span>
    </Link>
  );
}

function AIRecommendation({ text, href }: { text: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 p-2 rounded-lg bg-surface/50 hover:bg-surface border border-border/50 hover:border-violet-500/20 transition-colors group"
    >
      <Sparkles className="w-3 h-3 text-violet-500 shrink-0" />
      <span className="text-xs text-foreground/80 flex-1">{text}</span>
      <ArrowRight className="w-3 h-3 text-muted-2 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
    </Link>
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

// Note: Activity icon imported but not used in JSX directly — kept for future use
void Activity;
