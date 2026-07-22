/**
 * /app/ceo - CEO Dashboard (EP-001 BLOCK 6)
 *
 * Бизнес-уровень управления. Не технический.
 * Показатели: MRR, ARR, Trials, Activation, Retention, Conversion,
 * Enterprise Pipeline, Revenue, CAC, LTV, Runway.
 *
 * Доступ: только Founder mode.
 */

"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n-context";
import { Container } from "@/components/ui/Container";
import {
  DollarSign,
  Users,
  TrendingUp,
  Target,
  Briefcase,
  Rocket,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";

export default function CEODashboardPage() {
  const { t } = useI18n();

  const revenueMetrics = [
    { label: "MRR", value: "$0", target: "$10k", status: "warning", icon: DollarSign },
    { label: "ARR", value: "$0", target: "$120k", status: "warning", icon: TrendingUp },
    { label: "Revenue (всего)", value: "$0", target: "—", status: "warning", icon: DollarSign },
  ];

  const customerMetrics = [
    { label: "Trials", value: "0", target: "50", status: "warning", icon: Users },
    { label: "Paid customers", value: "0", target: "20", status: "warning", icon: Users },
    { label: "Active users", value: "0", target: "30", status: "warning", icon: Users },
    { label: "Enterprise pipeline", value: "0", target: "5", status: "warning", icon: Briefcase },
  ];

  const conversionMetrics = [
    { label: "Trial → Paid", value: "0%", target: "20%", status: "warning", icon: Target },
    { label: "Activation rate", value: "0%", target: "60%", status: "warning", icon: CheckCircle2 },
    { label: "Retention (30d)", value: "0%", target: "70%", status: "warning", icon: Clock },
    { label: "Visitor → Trial", value: "0%", target: "5%", status: "warning", icon: Target },
  ];

  const unitEconomics = [
    { label: "CAC", value: "$0", target: "$200", status: "warning", icon: DollarSign },
    { label: "LTV", value: "$0", target: "$2,400", status: "warning", icon: DollarSign },
    { label: "LTV/CAC ratio", value: "—", target: ">10", status: "warning", icon: TrendingUp },
    { label: "Runway", value: "∞", target: "18 мес", status: "good", icon: Clock },
  ];

  const businessReadiness = [
    { area: "Product", score: 71, color: "bg-amber-500" },
    { area: "Marketing", score: 15, color: "bg-red-500" },
    { area: "Sales", score: 10, color: "bg-red-500" },
    { area: "Finance", score: 25, color: "bg-red-500" },
    { area: "Team", score: 20, color: "bg-red-500" },
    { area: "Operations", score: 30, color: "bg-amber-500" },
  ];

  const nextMilestones = [
    { date: "Q3 2026", title: "EP-001: Product Packaging", done: true },
    { date: "Q3 2026", title: "EP-002: Auth + Billing", done: false },
    { date: "Q4 2026", title: "First 10 paying customers", done: false },
    { date: "Q4 2026", title: "$5k MRR", done: false },
    { date: "Q1 2027", title: "EP-003: Real Integrations", done: false },
    { date: "Q1 2027", title: "First 100 customers", done: false },
    { date: "Q2 2027", title: "$50k MRR, seed round", done: false },
    { date: "Q3 2027", title: "$150k MRR, enterprise sales", done: false },
    { date: "Q4 2027", title: "$1M ARR", done: false },
  ];

  return (
    <Container>
      <div className="max-w-7xl mx-auto space-y-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{t("ceo.title")}</h1>
              <p className="text-sm text-muted-2">{t("ceo.subtitle")}</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-medium">
              {t("ceo.stage")}: Pre-seed
            </span>
          </div>
        </div>

        {/* Commercial Readiness (BLOCK 14) */}
        <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-semibold text-foreground">{t("ceo.commercialReadiness")}</span>
            </div>
            <span className="text-3xl font-bold text-amber-500 tabular-nums">18%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-foreground/5 overflow-hidden mb-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "18%" }}
              transition={{ duration: 1 }}
              className="h-full bg-gradient-to-r from-red-500 to-amber-500"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <ReadinessScore label="Architecture" value={94} color="text-emerald-500" />
            <ReadinessScore label="Product" value={71} color="text-amber-500" />
            <ReadinessScore label="Business" value={42} color="text-orange-500" />
            <ReadinessScore label="Commercial" value={18} color="text-red-500" />
          </div>
        </div>

        {/* Revenue metrics */}
        <MetricGroup title={t("ceo.revenue")} icon={DollarSign} metrics={revenueMetrics} />

        {/* Customers */}
        <MetricGroup title={t("ceo.customers")} icon={Users} metrics={customerMetrics} />

        {/* Conversion */}
        <MetricGroup title={t("ceo.conversion")} icon={Target} metrics={conversionMetrics} />

        {/* Unit Economics */}
        <MetricGroup title={t("ceo.unitEconomics")} icon={TrendingUp} metrics={unitEconomics} />

        {/* Business Readiness по направлениям */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-foreground">{t("ceo.businessReadiness")}</span>
          </div>
          <div className="space-y-3">
            {businessReadiness.map((b) => (
              <div key={b.area} className="flex items-center gap-3">
                <div className="w-24 text-xs font-medium text-foreground/80">{b.area}</div>
                <div className="flex-1">
                  <div className="w-full h-2 rounded-full bg-foreground/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${b.score}%` }}
                      transition={{ duration: 0.8 }}
                      className={`h-full ${b.color}`}
                    />
                  </div>
                </div>
                <div className={`w-12 text-right text-sm font-bold tabular-nums ${
                  b.score >= 70 ? "text-emerald-500" : b.score >= 40 ? "text-amber-500" : "text-red-500"
                }`}>
                  {b.score}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Milestones */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-foreground">{t("ceo.milestones")}</span>
          </div>
          <div className="space-y-2">
            {nextMilestones.map((m, i) => (
              <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${
                m.done ? "bg-emerald-500/5" : "bg-surface-2/50"
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  m.done ? "bg-emerald-500 text-white" : "bg-foreground/10 text-muted-2"
                }`}>
                  {m.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                </div>
                <div className="flex-1">
                  <div className={`text-sm ${m.done ? "text-foreground line-through opacity-60" : "text-foreground"}`}>
                    {m.title}
                  </div>
                </div>
                <span className="text-[10px] text-muted-2 px-2 py-0.5 rounded bg-foreground/5">{m.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Critical risks */}
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-foreground">{t("ceo.criticalRisks")}</span>
          </div>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-xs text-foreground/70">
              <span className="text-red-500 mt-0.5">⚠</span>
              <span>Нет системы аутентификации — пользователи не могут иметь аккаунты</span>
            </li>
            <li className="flex items-start gap-2 text-xs text-foreground/70">
              <span className="text-red-500 mt-0.5">⚠</span>
              <span>Нет billing системы — невозможно принимать платежи</span>
            </li>
            <li className="flex items-start gap-2 text-xs text-foreground/70">
              <span className="text-red-500 mt-0.5">⚠</span>
              <span>TRUST-002: mock integrations подрывают доверие</span>
            </li>
            <li className="flex items-start gap-2 text-xs text-foreground/70">
              <span className="text-red-500 mt-0.5">⚠</span>
              <span>Backend на INT-036 — отставание 14 этапов</span>
            </li>
          </ul>
        </div>

        {/* BP-001 BLOCK 6: Business расширение — North Star, Pipeline, Forecast, PMF */}

        {/* North Star Metric */}
        <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-foreground">North Star Metric</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-xs text-muted-2">Weekly Active Scans (WAS)</div>
              <div className="text-4xl font-bold text-violet-600 dark:text-violet-400 tabular-nums">0</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-2 uppercase tracking-wider">Цель Q4 2026</div>
              <div className="text-xl font-bold text-foreground">100 WAS</div>
              <div className="text-[10px] text-muted-2 mt-1">Q4 2027: 5000 WAS</div>
            </div>
          </div>
          <div className="text-[11px] text-muted-2 mt-2">
            WAS коррелирует с value delivery и retention. 1000 WAS × $499 × 80% paid = $400k MRR
          </div>
        </div>

        {/* Pipeline */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-foreground">Sales Pipeline</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { stage: "Leads", count: 0, value: "$0" },
              { stage: "Trials", count: 0, value: "$0" },
              { stage: "Demos", count: 0, value: "$0" },
              { stage: "Proposals", count: 0, value: "$0" },
              { stage: "Closed", count: 0, value: "$0" },
            ].map((p) => (
              <div key={p.stage} className="p-3 rounded-lg bg-surface-2/50 border border-border text-center">
                <div className="text-[10px] text-muted-2 uppercase tracking-wider mb-1">{p.stage}</div>
                <div className="text-2xl font-bold text-foreground tabular-nums">{p.count}</div>
                <div className="text-[10px] text-muted-2 mt-1">{p.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Forecast */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-foreground">Revenue Forecast (18 месяцев)</span>
          </div>
          <div className="space-y-2">
            {[
              { q: "Q3 2026", mrr: "$2k", arr: "$24k", clients: 5 },
              { q: "Q4 2026", mrr: "$10k", arr: "$120k", clients: 20 },
              { q: "Q1 2027", mrr: "$30k", arr: "$360k", clients: 60 },
              { q: "Q2 2027", mrr: "$80k", arr: "$960k", clients: 150 },
              { q: "Q3 2027", mrr: "$150k", arr: "$1.8M", clients: 280 },
              { q: "Q4 2027", mrr: "$250k", arr: "$3M", clients: 450 },
            ].map((f) => (
              <div key={f.q} className="flex items-center gap-3 p-2 rounded-lg bg-surface-2/50">
                <div className="w-20 text-xs font-mono text-muted-2">{f.q}</div>
                <div className="flex-1 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-2">MRR: </span>
                    <span className="font-bold text-foreground">{f.mrr}</span>
                  </div>
                  <div>
                    <span className="text-muted-2">ARR: </span>
                    <span className="font-bold text-foreground">{f.arr}</span>
                  </div>
                  <div>
                    <span className="text-muted-2">Clients: </span>
                    <span className="font-bold text-foreground">{f.clients}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Product-Market Fit */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-semibold text-foreground">Product-Market Fit</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-amber-500 tabular-nums">63</span>
              <span className="text-xs text-muted-2">/100 (C+)</span>
            </div>
          </div>
          <div className="w-full h-3 rounded-full bg-foreground/5 overflow-hidden mb-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "63%" }}
              transition={{ duration: 1 }}
              className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            {[
              { dim: "Problem", score: 85 },
              { dim: "Solution", score: 78 },
              { dim: "Market", score: 88 },
              { dim: "Competition", score: 65 },
              { dim: "Differentiation", score: 82 },
              { dim: "Pricing", score: 75 },
              { dim: "Distribution", score: 35 },
              { dim: "Retention", score: 45 },
              { dim: "Network", score: 25 },
              { dim: "Moat", score: 55 },
            ].map((d) => (
              <div key={d.dim} className="p-2 rounded-lg bg-surface-2/50 border border-border text-center">
                <div className="text-[10px] text-muted-2 mb-1">{d.dim}</div>
                <div className={`text-lg font-bold tabular-nums ${
                  d.score >= 80 ? "text-emerald-500" : d.score >= 60 ? "text-amber-500" : "text-red-500"
                }`}>{d.score}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[11px] text-muted-2">
            Сильные: Problem (85), Market (88), Differentiation (82). Слабые: Distribution (35), Network (25). Priority: EP-002 (auth+billing) → EP-003 (real integrations) → distribution push.
          </div>
        </div>

        {/* ICP Distribution */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-foreground">ICP Distribution (целевые клиенты)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {[
              { icp: "Startup Founder", plan: "Pro $499", ltv: "$18k", cac: "$300" },
              { icp: "SMB CTO", plan: "Business $1499", ltv: "$54k", cac: "$800" },
              { icp: "Enterprise CISO", plan: "Enterprise $4999", ltv: "$180k", cac: "$5k" },
              { icp: "Security Agency", plan: "Business $1499", ltv: "$36k", cac: "$400" },
              { icp: "MSP", plan: "Enterprise $4999", ltv: "$180k", cac: "$2k" },
            ].map((c) => (
              <div key={c.icp} className="p-3 rounded-lg bg-surface-2/50 border border-border">
                <div className="text-xs font-semibold text-foreground mb-1">{c.icp}</div>
                <div className="text-[10px] text-muted-2">{c.plan}</div>
                <div className="text-[10px] text-muted-2 mt-1">LTV: <span className="text-emerald-500 font-bold">{c.ltv}</span></div>
                <div className="text-[10px] text-muted-2">CAC: <span className="text-amber-500 font-bold">{c.cac}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Container>
  );
}

function MetricGroup({
  title,
  icon: Icon,
  metrics,
}: {
  title: string;
  icon: React.ElementType;
  metrics: Array<{
    label: string;
    value: string;
    target: string;
    status: string;
    icon: React.ElementType;
  }>;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-violet-500" />
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m) => {
          const MIcon = m.icon;
          const colorClass =
            m.status === "good" ? "text-emerald-500 bg-emerald-500/10" :
            m.status === "warning" ? "text-amber-500 bg-amber-500/10" :
            "text-red-500 bg-red-500/10";
          return (
            <div key={m.label} className="p-3 rounded-lg bg-surface-2/50 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <MIcon className={`w-3.5 h-3.5 ${colorClass.split(" ")[0]}`} />
                <span className="text-[10px] text-muted-2 uppercase tracking-wider">{m.label}</span>
              </div>
              <div className={`text-2xl font-bold tabular-nums ${colorClass.split(" ")[0]}`}>{m.value}</div>
              {m.target !== "—" && (
                <div className="text-[10px] text-muted-2 mt-1">
                  Цель: <span className="text-foreground/70">{m.target}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReadinessScore({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}%</div>
      <div className="text-[10px] text-muted-2 mt-0.5">{label}</div>
    </div>
  );
}
