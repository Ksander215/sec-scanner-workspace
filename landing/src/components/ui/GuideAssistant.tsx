"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n-context";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  CheckCircle2,
  Circle,
  HelpCircle,
  Lightbulb,
  Target,
  Gift,
  MapPin,
  MessageCircle,
  Sparkles,
  Compass,
} from "lucide-react";
import Link from "next/link";
import { VisualFlow } from "./VisualFlow";

/* ─── Page context definitions ────────────────────────────────────────── */
/* Each page gets: explanation, 4 questions answered, visual flow, FAQ, next steps */

interface PageExplanation {
  /** Route prefix to match (e.g. "/app/scanner") */
  route: string;
  /** Section key for ContextualHelp integration */
  section: string;
  /** Dialog greeting key — "Вы открыли раздел X" */
  greetingKey: string;
  /** What is this page? */
  whatKey: string;
  /** Why is it needed? */
  whyKey: string;
  /** What will the user get? */
  resultKey: string;
  /** What to do next? */
  nextActionKey: string;
  /** Visual flow steps for BLOCK 4 */
  flowSteps: { labelKey: string }[];
  /** FAQ keys (question/answer pairs) */
  faqItems: { qKey: string; aKey: string }[];
  /** Progress tracker steps for BLOCK 6 */
  progressSteps: { labelKey: string; href: string }[];
  /** "What changed" message after action (BLOCK 5) */
  actionResultKey?: string;
}

const PAGE_CONTEXTS: PageExplanation[] = [
  {
    route: "/app/dashboard",
    section: "dashboard",
    greetingKey: "assistant.greeting.dashboard",
    whatKey: "assistant.what.dashboard",
    whyKey: "assistant.why.dashboard",
    resultKey: "assistant.result.dashboard",
    nextActionKey: "assistant.next.dashboard",
    flowSteps: [
      { labelKey: "assistant.flow.dashboard.projects" },
      { labelKey: "assistant.flow.dashboard.scan" },
      { labelKey: "assistant.flow.dashboard.findings" },
      { labelKey: "assistant.flow.dashboard.score" },
      { labelKey: "assistant.flow.dashboard.control" },
    ],
    faqItems: [
      { qKey: "faq.dashboard.q1", aKey: "faq.dashboard.a1" },
      { qKey: "faq.dashboard.q2", aKey: "faq.dashboard.a2" },
      { qKey: "faq.dashboard.q3", aKey: "faq.dashboard.a3" },
      { qKey: "faq.dashboard.q4", aKey: "faq.dashboard.a4" },
      { qKey: "faq.dashboard.q5", aKey: "faq.dashboard.a5" },
    ],
    progressSteps: [
      { labelKey: "assistant.progress.createProject", href: "/app/projects" },
      { labelKey: "assistant.progress.firstScan", href: "/app/scanner" },
      { labelKey: "assistant.progress.reviewFindings", href: "/app/findings" },
      { labelKey: "assistant.progress.getReport", href: "/app/reports" },
    ],
  },
  {
    route: "/app/scanner",
    section: "scanner",
    greetingKey: "assistant.greeting.scanner",
    whatKey: "assistant.what.scanner",
    whyKey: "assistant.why.scanner",
    resultKey: "assistant.result.scanner",
    nextActionKey: "assistant.next.scanner",
    flowSteps: [
      { labelKey: "assistant.flow.scanner.target" },
      { labelKey: "assistant.flow.scanner.check" },
      { labelKey: "assistant.flow.scanner.risks" },
      { labelKey: "assistant.flow.scanner.graph" },
      { labelKey: "assistant.flow.scanner.report" },
      { labelKey: "assistant.flow.scanner.fix" },
    ],
    faqItems: [
      { qKey: "faq.scanner.q1", aKey: "faq.scanner.a1" },
      { qKey: "faq.scanner.q2", aKey: "faq.scanner.a2" },
      { qKey: "faq.scanner.q3", aKey: "faq.scanner.a3" },
      { qKey: "faq.scanner.q5", aKey: "faq.scanner.a5" },
    ],
    progressSteps: [
      { labelKey: "assistant.progress.addTarget", href: "/app/scanner" },
      { labelKey: "assistant.progress.selectTools", href: "/app/scanner" },
      { labelKey: "assistant.progress.runScan", href: "/app/scanner" },
      { labelKey: "assistant.progress.viewResults", href: "/app/findings" },
    ],
    actionResultKey: "assistant.action.scanComplete",
  },
  {
    route: "/app/findings",
    section: "findings",
    greetingKey: "assistant.greeting.findings",
    whatKey: "assistant.what.findings",
    whyKey: "assistant.why.findings",
    resultKey: "assistant.result.findings",
    nextActionKey: "assistant.next.findings",
    flowSteps: [
      { labelKey: "assistant.flow.findings.list" },
      { labelKey: "assistant.flow.findings.priority" },
      { labelKey: "assistant.flow.findings.context" },
      { labelKey: "assistant.flow.findings.assign" },
      { labelKey: "assistant.flow.findings.fix" },
    ],
    faqItems: [
      { qKey: "faq.findings.q1", aKey: "faq.findings.a1" },
      { qKey: "faq.findings.q2", aKey: "faq.findings.a2" },
      { qKey: "faq.findings.q3", aKey: "faq.findings.a3" },
      { qKey: "faq.findings.q5", aKey: "faq.findings.a5" },
    ],
    progressSteps: [
      { labelKey: "assistant.progress.reviewCritical", href: "/app/findings" },
      { labelKey: "assistant.progress.reviewHigh", href: "/app/findings" },
      { labelKey: "assistant.progress.assessRisks", href: "/app/risks" },
      { labelKey: "assistant.progress.generateReport", href: "/app/reports" },
    ],
  },
  {
    route: "/app/risks",
    section: "risks",
    greetingKey: "assistant.greeting.risks",
    whatKey: "assistant.what.risks",
    whyKey: "assistant.why.risks",
    resultKey: "assistant.result.risks",
    nextActionKey: "assistant.next.risks",
    flowSteps: [
      { labelKey: "assistant.flow.risks.vuln" },
      { labelKey: "assistant.flow.risks.asset" },
      { labelKey: "assistant.flow.risks.path" },
      { labelKey: "assistant.flow.risks.recs" },
    ],
    faqItems: [
      { qKey: "faq.risks.q1", aKey: "faq.risks.a1" },
      { qKey: "faq.risks.q2", aKey: "faq.risks.a2" },
      { qKey: "faq.risks.q5", aKey: "faq.risks.a5" },
    ],
    progressSteps: [
      { labelKey: "assistant.progress.reviewCritical", href: "/app/risks" },
      { labelKey: "assistant.progress.createReport", href: "/app/reports" },
      { labelKey: "assistant.progress.setupNotif", href: "/app/notifications" },
    ],
  },
  {
    route: "/app/reports",
    section: "reports",
    greetingKey: "assistant.greeting.reports",
    whatKey: "assistant.what.reports",
    whyKey: "assistant.why.reports",
    resultKey: "assistant.result.reports",
    nextActionKey: "assistant.next.reports",
    flowSteps: [
      { labelKey: "assistant.flow.reports.select" },
      { labelKey: "assistant.flow.reports.generate" },
      { labelKey: "assistant.flow.reports.send" },
    ],
    faqItems: [
      { qKey: "faq.reports.q1", aKey: "faq.reports.a1" },
      { qKey: "faq.reports.q2", aKey: "faq.reports.a2" },
      { qKey: "faq.reports.q3", aKey: "faq.reports.a3" },
    ],
    progressSteps: [
      { labelKey: "assistant.progress.chooseFormat", href: "/app/reports" },
      { labelKey: "assistant.progress.generateReport", href: "/app/reports" },
      { labelKey: "assistant.progress.shareReport", href: "/app/reports" },
    ],
    actionResultKey: "assistant.action.reportReady",
  },
  {
    route: "/app/repositories",
    section: "repositories",
    greetingKey: "assistant.greeting.repositories",
    whatKey: "assistant.what.repositories",
    whyKey: "assistant.why.repositories",
    resultKey: "assistant.result.repositories",
    nextActionKey: "assistant.next.repositories",
    flowSteps: [
      { labelKey: "assistant.flow.repos.github" },
      { labelKey: "assistant.flow.repos.analyze" },
      { labelKey: "assistant.flow.repos.secrets" },
      { labelKey: "assistant.flow.repos.deps" },
      { labelKey: "assistant.flow.repos.results" },
    ],
    faqItems: [
      { qKey: "faq.repositories.q1", aKey: "faq.repositories.a1" },
      { qKey: "faq.repositories.q2", aKey: "faq.repositories.a2" },
      { qKey: "faq.repositories.q3", aKey: "faq.repositories.a3" },
    ],
    progressSteps: [
      { labelKey: "assistant.progress.connectRepo", href: "/app/repositories" },
      { labelKey: "assistant.progress.scanRepo", href: "/app/scanner" },
      { labelKey: "assistant.progress.reviewRepoResults", href: "/app/findings" },
    ],
    actionResultKey: "assistant.action.repoConnected",
  },
  {
    route: "/app/integrations",
    section: "integrations",
    greetingKey: "assistant.greeting.integrations",
    whatKey: "assistant.what.integrations",
    whyKey: "assistant.why.integrations",
    resultKey: "assistant.result.integrations",
    nextActionKey: "assistant.next.integrations",
    flowSteps: [
      { labelKey: "assistant.flow.integrations.select" },
      { labelKey: "assistant.flow.integrations.connect" },
      { labelKey: "assistant.flow.integrations.data" },
      { labelKey: "assistant.flow.integrations.auto" },
    ],
    faqItems: [
      { qKey: "faq.integrations.q1", aKey: "faq.integrations.a1" },
      { qKey: "faq.integrations.q2", aKey: "faq.integrations.a2" },
      { qKey: "faq.integrations.q5", aKey: "faq.integrations.a5" },
    ],
    progressSteps: [
      { labelKey: "assistant.progress.chooseIntegration", href: "/app/integrations" },
      { labelKey: "assistant.progress.connectService", href: "/app/integrations" },
      { labelKey: "assistant.progress.setupNotif", href: "/app/notifications" },
    ],
    actionResultKey: "assistant.action.connected",
  },
  {
    route: "/app/knowledge-graph",
    section: "knowledge-graph",
    greetingKey: "assistant.greeting.knowledgeGraph",
    whatKey: "assistant.what.knowledgeGraph",
    whyKey: "assistant.why.knowledgeGraph",
    resultKey: "assistant.result.knowledgeGraph",
    nextActionKey: "assistant.next.knowledgeGraph",
    flowSteps: [
      { labelKey: "assistant.flow.kg.vuln" },
      { labelKey: "assistant.flow.kg.asset" },
      { labelKey: "assistant.flow.kg.attack" },
      { labelKey: "assistant.flow.kg.recs" },
    ],
    faqItems: [
      { qKey: "faq.knowledgeGraph.q1", aKey: "faq.knowledgeGraph.a1" },
      { qKey: "faq.knowledgeGraph.q2", aKey: "faq.knowledgeGraph.a2" },
    ],
    progressSteps: [
      { labelKey: "assistant.progress.runScan", href: "/app/scanner" },
      { labelKey: "assistant.progress.exploreGraph", href: "/app/demo/knowledge-graph" },
      { labelKey: "assistant.progress.viewAttackPaths", href: "/app/demo/attack-paths" },
    ],
  },
  {
    route: "/app/demo/knowledge-graph",
    section: "knowledge-graph",
    greetingKey: "assistant.greeting.knowledgeGraph",
    whatKey: "assistant.what.knowledgeGraph",
    whyKey: "assistant.why.knowledgeGraph",
    resultKey: "assistant.result.knowledgeGraph",
    nextActionKey: "assistant.next.knowledgeGraph",
    flowSteps: [
      { labelKey: "assistant.flow.kg.vuln" },
      { labelKey: "assistant.flow.kg.asset" },
      { labelKey: "assistant.flow.kg.attack" },
      { labelKey: "assistant.flow.kg.recs" },
    ],
    faqItems: [
      { qKey: "faq.knowledgeGraph.q1", aKey: "faq.knowledgeGraph.a1" },
      { qKey: "faq.knowledgeGraph.q2", aKey: "faq.knowledgeGraph.a2" },
    ],
    progressSteps: [
      { labelKey: "assistant.progress.runScan", href: "/app/scanner" },
      { labelKey: "assistant.progress.exploreGraph", href: "/app/demo/knowledge-graph" },
      { labelKey: "assistant.progress.viewAttackPaths", href: "/app/demo/attack-paths" },
    ],
  },
  {
    route: "/app/attack-paths",
    section: "attack-paths",
    greetingKey: "assistant.greeting.attackPaths",
    whatKey: "assistant.what.attackPaths",
    whyKey: "assistant.why.attackPaths",
    resultKey: "assistant.result.attackPaths",
    nextActionKey: "assistant.next.attackPaths",
    flowSteps: [
      { labelKey: "assistant.flow.ap.vuln" },
      { labelKey: "assistant.flow.ap.chain" },
      { labelKey: "assistant.flow.ap.impact" },
      { labelKey: "assistant.flow.ap.recs" },
    ],
    faqItems: [
      { qKey: "faq.attackPaths.q1", aKey: "faq.attackPaths.a1" },
      { qKey: "faq.attackPaths.q2", aKey: "faq.attackPaths.a2" },
    ],
    progressSteps: [
      { labelKey: "assistant.progress.reviewCritical", href: "/app/risks" },
      { labelKey: "assistant.progress.generateReport", href: "/app/reports" },
    ],
  },
  {
    route: "/app/demo/attack-paths",
    section: "attack-paths",
    greetingKey: "assistant.greeting.attackPaths",
    whatKey: "assistant.what.attackPaths",
    whyKey: "assistant.why.attackPaths",
    resultKey: "assistant.result.attackPaths",
    nextActionKey: "assistant.next.attackPaths",
    flowSteps: [
      { labelKey: "assistant.flow.ap.vuln" },
      { labelKey: "assistant.flow.ap.chain" },
      { labelKey: "assistant.flow.ap.impact" },
      { labelKey: "assistant.flow.ap.recs" },
    ],
    faqItems: [
      { qKey: "faq.attackPaths.q1", aKey: "faq.attackPaths.a1" },
      { qKey: "faq.attackPaths.q2", aKey: "faq.attackPaths.a2" },
    ],
    progressSteps: [
      { labelKey: "assistant.progress.reviewCritical", href: "/app/risks" },
      { labelKey: "assistant.progress.generateReport", href: "/app/reports" },
    ],
  },
  {
    route: "/app/marketplace",
    section: "marketplace",
    greetingKey: "assistant.greeting.marketplace",
    whatKey: "assistant.what.marketplace",
    whyKey: "assistant.why.marketplace",
    resultKey: "assistant.result.marketplace",
    nextActionKey: "assistant.next.marketplace",
    flowSteps: [
      { labelKey: "assistant.flow.mp.browse" },
      { labelKey: "assistant.flow.mp.install" },
      { labelKey: "assistant.flow.mp.configure" },
      { labelKey: "assistant.flow.mp.use" },
    ],
    faqItems: [
      { qKey: "faq.marketplace.q1", aKey: "faq.marketplace.a1" },
      { qKey: "faq.marketplace.q2", aKey: "faq.marketplace.a2" },
    ],
    progressSteps: [
      { labelKey: "assistant.progress.browsePlugins", href: "/app/marketplace" },
      { labelKey: "assistant.progress.installPlugin", href: "/app/marketplace" },
      { labelKey: "assistant.progress.firstScan", href: "/app/scanner" },
    ],
  },
  {
    route: "/app/projects",
    section: "projects",
    greetingKey: "assistant.greeting.projects",
    whatKey: "assistant.what.projects",
    whyKey: "assistant.why.projects",
    resultKey: "assistant.result.projects",
    nextActionKey: "assistant.next.projects",
    flowSteps: [
      { labelKey: "assistant.flow.proj.create" },
      { labelKey: "assistant.flow.proj.add" },
      { labelKey: "assistant.flow.proj.scan" },
      { labelKey: "assistant.flow.proj.report" },
    ],
    faqItems: [
      { qKey: "faq.projects.q1", aKey: "faq.projects.a1" },
      { qKey: "faq.projects.q2", aKey: "faq.projects.a2" },
      { qKey: "faq.projects.q5", aKey: "faq.projects.a5" },
    ],
    progressSteps: [
      { labelKey: "assistant.progress.createProject", href: "/app/projects" },
      { labelKey: "assistant.progress.addResources", href: "/app/projects" },
      { labelKey: "assistant.progress.firstScan", href: "/app/scanner" },
    ],
  },
  {
    route: "/app/workspace",
    section: "workspace",
    greetingKey: "assistant.greeting.workspace",
    whatKey: "assistant.what.workspace",
    whyKey: "assistant.why.workspace",
    resultKey: "assistant.result.workspace",
    nextActionKey: "assistant.next.workspace",
    flowSteps: [
      { labelKey: "assistant.flow.ws.organize" },
      { labelKey: "assistant.flow.ws.monitor" },
      { labelKey: "assistant.flow.ws.respond" },
    ],
    faqItems: [
      { qKey: "faq.workspace.q1", aKey: "faq.workspace.a1" },
      { qKey: "faq.workspace.q2", aKey: "faq.workspace.a2" },
    ],
    progressSteps: [
      { labelKey: "assistant.progress.organizeTeam", href: "/app/workspace" },
      { labelKey: "assistant.progress.setupMonitoring", href: "/app/notifications" },
      { labelKey: "assistant.progress.establishProcess", href: "/app/reports" },
    ],
  },
  {
    route: "/app/architecture",
    section: "architecture",
    greetingKey: "assistant.greeting.architecture",
    whatKey: "assistant.what.architecture",
    whyKey: "assistant.why.architecture",
    resultKey: "assistant.result.architecture",
    nextActionKey: "assistant.next.architecture",
    flowSteps: [
      { labelKey: "assistant.flow.arch.map" },
      { labelKey: "assistant.flow.arch.assets" },
      { labelKey: "assistant.flow.arch.gaps" },
      { labelKey: "assistant.flow.arch.plan" },
    ],
    faqItems: [
      { qKey: "faq.architecture.q1", aKey: "faq.architecture.a1" },
      { qKey: "faq.architecture.q2", aKey: "faq.architecture.a2" },
    ],
    progressSteps: [
      { labelKey: "assistant.progress.reviewArchitecture", href: "/app/architecture" },
      { labelKey: "assistant.progress.exploreGraph", href: "/app/demo/knowledge-graph" },
      { labelKey: "assistant.progress.firstScan", href: "/app/scanner" },
    ],
  },
  {
    route: "/app/notifications",
    section: "notifications",
    greetingKey: "assistant.greeting.notifications",
    whatKey: "assistant.what.notifications",
    whyKey: "assistant.why.notifications",
    resultKey: "assistant.result.notifications",
    nextActionKey: "assistant.next.notifications",
    flowSteps: [
      { labelKey: "assistant.flow.notif.rule" },
      { labelKey: "assistant.flow.notif.channel" },
      { labelKey: "assistant.flow.notif.alert" },
      { labelKey: "assistant.flow.notif.action" },
    ],
    faqItems: [
      { qKey: "faq.notifications.q1", aKey: "faq.notifications.a1" },
      { qKey: "faq.notifications.q2", aKey: "faq.notifications.a2" },
    ],
    progressSteps: [
      { labelKey: "assistant.progress.createRule", href: "/app/notifications" },
      { labelKey: "assistant.progress.connectChannel", href: "/app/integrations" },
      { labelKey: "assistant.progress.testNotif", href: "/app/notifications" },
    ],
    actionResultKey: "assistant.action.configured",
  },
  {
    route: "/app/api-keys",
    section: "api-keys",
    greetingKey: "assistant.greeting.apiKeys",
    whatKey: "assistant.what.apiKeys",
    whyKey: "assistant.why.apiKeys",
    resultKey: "assistant.result.apiKeys",
    nextActionKey: "assistant.next.apiKeys",
    flowSteps: [
      { labelKey: "assistant.flow.api.create" },
      { labelKey: "assistant.flow.api.scope" },
      { labelKey: "assistant.flow.api.use" },
      { labelKey: "assistant.flow.api.rotate" },
    ],
    faqItems: [
      { qKey: "faq.apiKeys.q1", aKey: "faq.apiKeys.a1" },
      { qKey: "faq.apiKeys.q2", aKey: "faq.apiKeys.a2" },
    ],
    progressSteps: [
      { labelKey: "assistant.progress.createKey", href: "/app/api-keys" },
      { labelKey: "assistant.progress.useKey", href: "/app/integrations" },
      { labelKey: "assistant.progress.setupRotation", href: "/app/api-keys" },
    ],
  },
  {
    route: "/app/settings",
    section: "settings",
    greetingKey: "assistant.greeting.settings",
    whatKey: "assistant.what.settings",
    whyKey: "assistant.why.settings",
    resultKey: "assistant.result.settings",
    nextActionKey: "assistant.next.settings",
    flowSteps: [
      { labelKey: "assistant.flow.settings.profile" },
      { labelKey: "assistant.flow.settings.team" },
      { labelKey: "assistant.flow.settings.security" },
      { labelKey: "assistant.flow.settings.appearance" },
    ],
    faqItems: [
      { qKey: "faq.settings.q1", aKey: "faq.settings.a1" },
      { qKey: "faq.settings.q2", aKey: "faq.settings.a2" },
    ],
    progressSteps: [
      { labelKey: "assistant.progress.setupProfile", href: "/app/settings" },
      { labelKey: "assistant.progress.addTeam", href: "/app/settings" },
      { labelKey: "assistant.progress.setupSSH", href: "/app/settings" },
    ],
  },
  {
    route: "/app/pricing",
    section: "pricing",
    greetingKey: "assistant.greeting.pricing",
    whatKey: "assistant.what.pricing",
    whyKey: "assistant.why.pricing",
    resultKey: "assistant.result.pricing",
    nextActionKey: "assistant.next.pricing",
    flowSteps: [
      { labelKey: "assistant.flow.pricing.free" },
      { labelKey: "assistant.flow.pricing.pro" },
      { labelKey: "assistant.flow.pricing.enterprise" },
    ],
    faqItems: [
      { qKey: "faq.pricing.q1", aKey: "faq.pricing.a1" },
      { qKey: "faq.pricing.q2", aKey: "faq.pricing.a2" },
    ],
    progressSteps: [
      { labelKey: "assistant.progress.tryFree", href: "/app/scanner" },
      { labelKey: "assistant.progress.explorePlatform", href: "/app/dashboard" },
    ],
  },
];

/* ─── Tab types for the assistant panels ────────────────────────────────── */

type AssistantTab = "explain" | "flow" | "faq" | "progress";

/* ─── Component ────────────────────────────────────────────────────────── */

export function GuideAssistant() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AssistantTab>("explain");
  const [faqOpenItems, setFaqOpenItems] = useState<Set<number>>(new Set());
  const [completedProgress, setCompletedProgress] = useState<Set<number>>(new Set());
  const pathname = usePathname();
  const { t } = useI18n();

  // Find the current page context
  const pageContext = useMemo(() => {
    if (!pathname) return null;
    // Sort by specificity — longest route match first
    const sorted = [...PAGE_CONTEXTS].sort((a, b) => b.route.length - a.route.length);
    return sorted.find((ctx) => pathname === ctx.route || pathname.startsWith(ctx.route + "/")) ?? null;
  }, [pathname]);

  // Don't show on non-app pages
  const isAppPage = pathname?.startsWith("/app");
  if (!isAppPage) return null;

  // Reset tab and FAQ when page changes
  useEffect(() => {
    setActiveTab("explain");
    setFaqOpenItems(new Set());
  }, [pathname]);

  const toggleFaqItem = (index: number) => {
    setFaqOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleProgress = (index: number) => {
    setCompletedProgress((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const tabs: { key: AssistantTab; icon: React.ReactNode; labelKey: string }[] = [
    { key: "explain", icon: <Lightbulb className="w-4 h-4" />, labelKey: "assistant.tab.explain" },
    { key: "flow", icon: <Compass className="w-4 h-4" />, labelKey: "assistant.tab.flow" },
    { key: "faq", icon: <MessageCircle className="w-4 h-4" />, labelKey: "assistant.tab.faq" },
    { key: "progress", icon: <MapPin className="w-4 h-4" />, labelKey: "assistant.tab.progress" },
  ];

  return (
    <>
      {/* ─── Floating button ────────────────────────────────────── */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all flex items-center justify-center group"
        aria-label={t("assistant.buttonLabel")}
      >
        <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
      </motion.button>

      {/* ─── Overlay + Panel ────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-4 top-4 bottom-4 w-[460px] max-w-[calc(100vw-2rem)] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col"
            >
              {/* ─── Header ────────────────────────────────────── */}
              <div className="p-4 border-b border-border bg-gradient-to-r from-violet-500/10 to-indigo-500/10 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">
                        {t("assistant.title")}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {pageContext ? t(pageContext.greetingKey) : t("assistant.subtitle")}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ─── Tab navigation ──────────────────────────────── */}
              {pageContext && (
                <div className="flex border-b border-border flex-shrink-0">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                        activeTab === tab.key
                          ? "text-violet-600 dark:text-violet-400 border-b-2 border-violet-500 bg-violet-500/5"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {tab.icon}
                      {t(tab.labelKey)}
                    </button>
                  ))}
                </div>
              )}

              {/* ─── Content ────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto">
                {!pageContext ? (
                  /* No context — general welcome */
                  <div className="p-5 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {t("assistant.noContext")}
                    </p>
                    <div className="space-y-2">
                      <Link
                        href="/app/dashboard"
                        className="flex items-center gap-2 p-3 rounded-xl hover:bg-muted/80 transition-colors"
                        onClick={() => setOpen(false)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                          <Target className="w-4 h-4" />
                        </div>
                        <span className="text-sm text-foreground">{t("assistant.goDashboard")}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                      </Link>
                      <Link
                        href="/app/scanner"
                        className="flex items-center gap-2 p-3 rounded-xl hover:bg-muted/80 transition-colors"
                        onClick={() => setOpen(false)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <Lightbulb className="w-4 h-4" />
                        </div>
                        <span className="text-sm text-foreground">{t("assistant.goScanner")}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* ─── EXPLAIN TAB ────────────────────────────── */}
                    {activeTab === "explain" && (
                      <div className="p-5 space-y-4">
                        {/* Greeting */}
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/15"
                        >
                          <p className="text-sm text-foreground leading-relaxed">
                            {t(pageContext.greetingKey)}
                          </p>
                        </motion.div>

                        {/* 4 questions (BLOCK 3) */}
                        <div className="space-y-3">
                          {[
                            { icon: <Lightbulb className="w-4 h-4" />, labelKey: "assistant.label.what", contentKey: pageContext.whatKey },
                            { icon: <Target className="w-4 h-4" />, labelKey: "assistant.label.why", contentKey: pageContext.whyKey },
                            { icon: <Gift className="w-4 h-4" />, labelKey: "assistant.label.result", contentKey: pageContext.resultKey },
                            { icon: <ArrowRight className="w-4 h-4" />, labelKey: "assistant.label.next", contentKey: pageContext.nextActionKey },
                          ].map((item, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.08 }}
                              className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                            >
                              <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0 text-violet-600 dark:text-violet-400">
                                {item.icon}
                              </div>
                              <div>
                                <div className="text-xs font-medium text-muted-foreground mb-0.5">
                                  {t(item.labelKey)}
                                </div>
                                <div className="text-sm text-foreground leading-relaxed">
                                  {t(item.contentKey)}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>

                        {/* Action result (BLOCK 5) */}
                        {pageContext.actionResultKey && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
                          >
                            <div className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                              <div>
                                <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-0.5">
                                  {t("assistant.whatChanged")}
                                </div>
                                <div className="text-sm text-emerald-600/80 dark:text-emerald-400/80 leading-relaxed">
                                  {t(pageContext.actionResultKey)}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )}

                    {/* ─── FLOW TAB (BLOCK 4) ────────────────────────── */}
                    {activeTab === "flow" && (
                      <div className="p-5 space-y-5">
                        <p className="text-sm text-muted-foreground">
                          {t("assistant.flowIntro")}
                        </p>

                        {/* Visual flow diagram */}
                        <div className="p-4 rounded-xl border border-border bg-muted/20">
                          <VisualFlow steps={pageContext.flowSteps} />
                        </div>

                        {/* Step-by-step explanation */}
                        <div className="space-y-2">
                          {pageContext.flowSteps.map((step, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="flex items-center gap-3 p-2"
                            >
                              <span className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                {i + 1}
                              </span>
                              <span className="text-sm text-foreground">{t(step.labelKey)}</span>
                              {i < pageContext.flowSteps.length - 1 && (
                                <div className="ml-auto text-muted-foreground">
                                  <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ─── FAQ TAB (BLOCK 7) ──────────────────────────── */}
                    {activeTab === "faq" && (
                      <div className="p-5 space-y-1">
                        <p className="text-sm text-muted-foreground mb-3">
                          {t("assistant.faqIntro")}
                        </p>
                        {pageContext.faqItems.map((faq, i) => (
                          <div key={i} className="rounded-lg overflow-hidden">
                            <button
                              onClick={() => toggleFaqItem(i)}
                              className="w-full flex items-start gap-2 p-3 text-left hover:bg-muted/50 transition-colors"
                            >
                              <HelpCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                              <span className="flex-1 text-sm font-medium text-foreground">
                                {t(faq.qKey)}
                              </span>
                              <ChevronDown
                                className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 mt-0.5 ${
                                  faqOpenItems.has(i) ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                            <AnimatePresence>
                              {faqOpenItems.has(i) && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <p className="px-3 pb-3 pl-9 text-sm text-muted-foreground leading-relaxed">
                                    {t(faq.aKey)}
                                  </p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ─── PROGRESS TAB (BLOCK 6) ────────────────────── */}
                    {activeTab === "progress" && (
                      <div className="p-5 space-y-4">
                        <p className="text-sm text-muted-foreground">
                          {t("assistant.progressIntro")}
                        </p>

                        {/* Progress checklist */}
                        <div className="space-y-2">
                          {pageContext.progressSteps.map((step, i) => {
                            const isCompleted = completedProgress.has(i);
                            return (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                                  isCompleted
                                    ? "bg-emerald-500/5 border border-emerald-500/20"
                                    : "bg-muted/20 border border-border hover:border-violet-500/30"
                                }`}
                              >
                                <button
                                  onClick={() => toggleProgress(i)}
                                  className={`flex-shrink-0 ${
                                    isCompleted
                                      ? "text-emerald-500"
                                      : "text-muted-foreground hover:text-violet-500"
                                  }`}
                                >
                                  {isCompleted ? (
                                    <CheckCircle2 className="w-5 h-5" />
                                  ) : (
                                    <Circle className="w-5 h-5" />
                                  )}
                                </button>
                                <span
                                  className={`flex-1 text-sm ${
                                    isCompleted
                                      ? "text-emerald-700 dark:text-emerald-300 line-through"
                                      : "text-foreground"
                                  }`}
                                >
                                  {t(step.labelKey)}
                                </span>
                                {!isCompleted && (
                                  <Link
                                    href={step.href}
                                    onClick={() => setOpen(false)}
                                    className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
                                  >
                                    {t("assistant.go")} →
                                  </Link>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>

                        {/* Completion message */}
                        {completedProgress.size === pageContext.progressSteps.length && pageContext.progressSteps.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center"
                          >
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                            <div className="font-medium text-sm text-emerald-700 dark:text-emerald-300">
                              {t("assistant.allDone")}
                            </div>
                            <div className="text-sm text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                              {t("assistant.allDoneDesc")}
                            </div>
                          </motion.div>
                        )}

                        {/* Global progress (BLOCK 6 — full user path) */}
                        <div className="mt-4 pt-4 border-t border-border">
                          <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-violet-500" />
                            {t("assistant.yourPath")}
                          </h4>
                          <div className="space-y-1.5">
                            {[
                              { labelKey: "assistant.path.createProject", done: true },
                              { labelKey: "assistant.path.connectRepo", done: true },
                              { labelKey: "assistant.path.setupSSH", done: true },
                              { labelKey: "assistant.path.connectNotifs", done: false },
                              { labelKey: "assistant.path.firstScan", done: false },
                              { labelKey: "assistant.path.firstReport", done: false },
                            ].map((item, i) => (
                              <div key={i} className="flex items-center gap-2 py-1">
                                {item.done ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                ) : (
                                  <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                )}
                                <span
                                  className={`text-sm ${
                                    item.done
                                      ? "text-emerald-700 dark:text-emerald-300"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {item.done ? "✓ " : "⬜ "}{t(item.labelKey)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
