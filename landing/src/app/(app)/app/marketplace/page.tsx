"use client";

import { useState, useEffect, useMemo } from "react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Search,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Shield,
  Globe,
  Server,
  GitBranch,
  Code,
  Container as ContainerIcon,
  Network,
  Cloud,
  HelpCircle,
  CheckSquare,
  ListChecks,
  FileText,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { marketplaceItems, type MarketplaceItem } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n-context";
import { useToast } from "@/components/ui/Toast";
import {
  isInstalled as engineIsInstalled,
  installPlugin,
  removePlugin,
  getRegistry,
  type RegistryEntry,
  type InstallStatus,
  getInstalledTools,
  MANIFESTS_BY_ID,
  ALL_MANIFESTS,
  BUILTIN_TOOL_IDS,
} from "@/lib/engine";
import { ContextualHelp } from "@/components/ui/ContextualHelp";
import { SectionFAQ } from "@/components/ui/SectionFAQ";
import { SmartNextStep, RECOMMENDATION_CHAINS } from "@/components/ui/SmartNextStep";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { BusinessResult } from "@/components/ui/BusinessResult";
import { VisualFlow } from "@/components/ui/VisualFlow";
import { WhyImportant } from "@/components/ui/WhyImportant";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// ─── Protection Categories ─────────────────────────────────────────────

interface ProtectionCategory {
  id: string;
  icon: React.ElementType;
  labelKey: string;
  descKey: string;
  resultKey: string;
  color: string;
  toolIds: string[];
}

const PROTECTION_CATEGORIES: ProtectionCategory[] = [
  {
    id: "website",
    icon: Globe,
    labelKey: "solutions.cat.website",
    descKey: "solutions.cat.website.desc",
    resultKey: "solutions.cat.website.result",
    color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
    toolIds: ["owasp-zap", "nikto", "nuclei"],
  },
  {
    id: "server",
    icon: Server,
    labelKey: "solutions.cat.server",
    descKey: "solutions.cat.server.desc",
    resultKey: "solutions.cat.server.result",
    color: "from-violet-500/20 to-purple-500/20 border-violet-500/30",
    toolIds: ["nmap", "nuclei", "nikto"],
  },
  {
    id: "repository",
    icon: GitBranch,
    labelKey: "solutions.cat.repository",
    descKey: "solutions.cat.repository.desc",
    resultKey: "solutions.cat.repository.result",
    color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30",
    toolIds: ["semgrep", "trivy"],
  },
  {
    id: "api",
    icon: Code,
    labelKey: "solutions.cat.api",
    descKey: "solutions.cat.api.desc",
    resultKey: "solutions.cat.api.result",
    color: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
    toolIds: ["nuclei", "owasp-zap"],
  },
  {
    id: "docker",
    icon: ContainerIcon,
    labelKey: "solutions.cat.docker",
    descKey: "solutions.cat.docker.desc",
    resultKey: "solutions.cat.docker.result",
    color: "from-sky-500/20 to-blue-500/20 border-sky-500/30",
    toolIds: ["trivy"],
  },
  {
    id: "kubernetes",
    icon: Network,
    labelKey: "solutions.cat.kubernetes",
    descKey: "solutions.cat.kubernetes.desc",
    resultKey: "solutions.cat.kubernetes.result",
    color: "from-indigo-500/20 to-blue-500/20 border-indigo-500/30",
    toolIds: ["trivy", "nmap"],
  },
  {
    id: "cloud",
    icon: Cloud,
    labelKey: "solutions.cat.cloud",
    descKey: "solutions.cat.cloud.desc",
    resultKey: "solutions.cat.cloud.result",
    color: "from-teal-500/20 to-cyan-500/20 border-teal-500/30",
    toolIds: ["nmap", "nuclei"],
  },
  {
    id: "unknown",
    icon: HelpCircle,
    labelKey: "solutions.cat.unknown",
    descKey: "solutions.cat.unknown.desc",
    resultKey: "solutions.cat.unknown.result",
    color: "from-rose-500/20 to-pink-500/20 border-rose-500/30",
    toolIds: [],
  },
];

// ─── Wizard Questions ───────────────────────────────────────────────────

const WIZARD_QUESTIONS = [
  { key: "hasWebsite", labelKey: "solutions.wizard.q1", category: "website" },
  { key: "hasServer", labelKey: "solutions.wizard.q2", category: "server" },
  { key: "hasGit", labelKey: "solutions.wizard.q3", category: "repository" },
  { key: "hasDocker", labelKey: "solutions.wizard.q4", category: "docker" },
];

// ─── Next Step Chains per category ─────────────────────────────────────

const NEXT_STEP_CHAINS: Record<string, { flowSteps: { labelKey: string }[]; nextHref: string; nextLabelKey: string }> = {
  website: {
    flowSteps: [
      { labelKey: "flow.solutions.select" },
      { labelKey: "flow.solutions.connect" },
      { labelKey: "flow.solutions.scan" },
      { labelKey: "flow.solutions.report" },
      { labelKey: "flow.solutions.fix" },
      { labelKey: "flow.solutions.recheck" },
    ],
    nextHref: "/app/scanner",
    nextLabelKey: "solutions.installed.runScan",
  },
  server: {
    flowSteps: [
      { labelKey: "flow.solutions.select" },
      { labelKey: "flow.solutions.connect" },
      { labelKey: "flow.solutions.scan" },
      { labelKey: "flow.solutions.report" },
      { labelKey: "flow.solutions.fix" },
      { labelKey: "flow.solutions.recheck" },
    ],
    nextHref: "/app/scanner",
    nextLabelKey: "solutions.installed.connectServer",
  },
  repository: {
    flowSteps: [
      { labelKey: "flow.solutions.select" },
      { labelKey: "flow.solutions.connect" },
      { labelKey: "flow.solutions.scan" },
      { labelKey: "flow.solutions.report" },
      { labelKey: "flow.solutions.fix" },
    ],
    nextHref: "/app/repositories",
    nextLabelKey: "solutions.installed.connectRepo",
  },
  api: {
    flowSteps: [
      { labelKey: "flow.solutions.select" },
      { labelKey: "flow.solutions.connect" },
      { labelKey: "flow.solutions.scan" },
      { labelKey: "flow.solutions.report" },
      { labelKey: "flow.solutions.fix" },
    ],
    nextHref: "/app/scanner",
    nextLabelKey: "solutions.installed.runScan",
  },
  docker: {
    flowSteps: [
      { labelKey: "flow.solutions.select" },
      { labelKey: "flow.solutions.connect" },
      { labelKey: "flow.solutions.scan" },
      { labelKey: "flow.solutions.report" },
      { labelKey: "flow.solutions.fix" },
    ],
    nextHref: "/app/scanner",
    nextLabelKey: "solutions.installed.runScan",
  },
  kubernetes: {
    flowSteps: [
      { labelKey: "flow.solutions.select" },
      { labelKey: "flow.solutions.connect" },
      { labelKey: "flow.solutions.scan" },
      { labelKey: "flow.solutions.report" },
      { labelKey: "flow.solutions.fix" },
    ],
    nextHref: "/app/scanner",
    nextLabelKey: "solutions.installed.runScan",
  },
  cloud: {
    flowSteps: [
      { labelKey: "flow.solutions.select" },
      { labelKey: "flow.solutions.connect" },
      { labelKey: "flow.solutions.scan" },
      { labelKey: "flow.solutions.report" },
      { labelKey: "flow.solutions.fix" },
    ],
    nextHref: "/app/scanner",
    nextLabelKey: "solutions.installed.runScan",
  },
};

// ─── Tool business descriptions ────────────────────────────────────────

const TOOL_BUSINESS_INFO: Record<string, { checksKey: string; getsKey: string; techName: string; icon: React.ElementType }> = {
  "nmap": { checksKey: "solutions.tool.nmap.checks", getsKey: "solutions.tool.nmap.gets", techName: "Nmap", icon: Shield },
  "nuclei": { checksKey: "solutions.tool.nuclei.checks", getsKey: "solutions.tool.nuclei.gets", techName: "Nuclei", icon: Shield },
  "trivy": { checksKey: "solutions.tool.trivy.checks", getsKey: "solutions.tool.trivy.gets", techName: "Trivy", icon: Shield },
  "semgrep": { checksKey: "solutions.tool.semgrep.checks", getsKey: "solutions.tool.semgrep.gets", techName: "Semgrep", icon: Shield },
  "owasp-zap": { checksKey: "solutions.tool.zap.checks", getsKey: "solutions.tool.zap.gets", techName: "OWASP ZAP", icon: Shield },
  "nikto": { checksKey: "solutions.tool.nikto.checks", getsKey: "solutions.tool.nikto.gets", techName: "Nikto", icon: Shield },
};

// ─── Install Status Indicator ──────────────────────────────────────────

function InstallProgressIndicator({ status }: { status: InstallStatus }) {
  if (status === "not_installed" || status === "installed") return null;
  const steps: InstallStatus[] = ["downloading", "installing", "verifying", "installed"];
  const currentIdx = steps.indexOf(status);
  const labels: Record<string, string> = {
    downloading: "Downloading...",
    installing: "Installing...",
    verifying: "Verifying...",
  };

  return (
    <div className="p-3 rounded-lg bg-cyan-muted border border-cyan/20">
      <div className="flex items-center gap-2 mb-2">
        <Loader2 className="w-4 h-4 text-cyan animate-spin" />
        <span className="text-xs font-medium text-cyan">{labels[status] || status}</span>
      </div>
      <div className="flex gap-1">
        {steps.slice(0, 3).map((step, i) => (
          <div key={step} className={`h-1.5 flex-1 rounded-full transition-all ${
            i < currentIdx ? "bg-accent" : i === currentIdx ? "bg-cyan animate-pulse" : "bg-surface-2"
          }`} />
        ))}
      </div>
    </div>
  );
}

// ─── Tool Health Card ──────────────────────────────────────────────────

function ToolHealthCard({ entry, locale }: { entry: RegistryEntry; locale: string }) {
  const isEn = locale === "en";
  const m = entry.manifest;
  const isBuiltin = BUILTIN_TOOL_IDS.has(m.id);

  return (
    <div className="p-3 rounded-lg bg-surface border border-border">
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-3.5 h-3.5 text-accent" />
        <span className="text-xs font-medium text-foreground">{m.name}</span>
        {isBuiltin && <Badge variant="default" className="text-[9px]">{isEn ? "Built-in" : "Встроен"}</Badge>}
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <span className="text-muted-2">{isEn ? "Status" : "Статус"}</span>
          <div className={`font-medium ${entry.status === "installed" ? "text-accent" : "text-muted-2"}`}>
            {entry.status === "installed" ? (isEn ? "Installed" : "Установлен") : entry.status}
          </div>
        </div>
        <div>
          <span className="text-muted-2">{isEn ? "Version" : "Версия"}</span>
          <div className="font-mono text-foreground">{entry.version || m.version}</div>
        </div>
        <div>
          <span className="text-muted-2">{isEn ? "Health" : "Состояние"}</span>
          <div className={`font-medium ${entry.health === "healthy" ? "text-accent" : entry.health === "error" ? "text-red" : "text-muted-2"}`}>
            {entry.health === "healthy" ? (isEn ? "Healthy" : "Здоров") : entry.health}
          </div>
        </div>
        <div>
          <span className="text-muted-2">{isEn ? "Last Run" : "Последний запуск"}</span>
          <div className="text-foreground font-mono">
            {entry.lastRun ? new Date(entry.lastRun).toLocaleDateString() : (isEn ? "Never" : "Нет")}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export default function SolutionsCenterPage() {
  const { t, locale } = useI18n();
  const { addToast } = useToast();
  const [search, setSearch] = useState("");
  const [installing, setInstalling] = useState<string | null>(null);
  const [installStatuses, setInstallStatuses] = useState<Record<string, InstallStatus>>({});
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [detailItem, setDetailItem] = useState<MarketplaceItem | null>(null);
  const [showToolHealth, setShowToolHealth] = useState(false);
  const [registryEntries, setRegistryEntries] = useState<RegistryEntry[]>([]);

  // INT-034: New state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [wizardActive, setWizardActive] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardAnswers, setWizardAnswers] = useState<boolean[]>([false, false, false, false]);
  const [wizardComplete, setWizardComplete] = useState(false);
  const [recentlyInstalled, setRecentlyInstalled] = useState<string | null>(null);

  // Load installed state from engine registry
  useEffect(() => {
    refreshRegistry();
  }, []);

  const refreshRegistry = () => {
    const entries = getRegistry();
    setRegistryEntries(entries);

    const installedSet = new Set<string>();
    entries.filter(e => e.status === "installed").forEach(e => {
      installedSet.add(e.manifest.id);
    });

    try {
      const raw = localStorage.getItem("sip_marketplace_installed");
      if (raw) {
        const legacyIds: string[] = JSON.parse(raw);
        legacyIds.forEach(id => installedSet.add(id));
      }
    } catch { /* ignore */ }

    setInstalled(installedSet);
  };

  // Combine marketplace items with engine plugin manifests
  const allItems = useMemo(() => [
    ...marketplaceItems,
    ...ALL_MANIFESTS
      .filter(m => !marketplaceItems.some(mi => mi.id === m.id || mi.name === m.name))
      .map(m => ({
        id: m.id,
        name: m.name,
        description: m.description[locale] || m.description.en,
        category: "plugins" as const,
        author: "SIP",
        version: m.version,
        rating: 4.8,
        installs: 15000,
        license: "MIT",
        verified: true,
        tags: [m.category, m.outputFormat],
      })),
  ], [locale]);

  // Get tools for selected category
  const categoryTools = useMemo(() => {
    if (!selectedCategory || selectedCategory === "unknown") return [];
    const cat = PROTECTION_CATEGORIES.find(c => c.id === selectedCategory);
    if (!cat) return [];
    return cat.toolIds
      .map(tid => {
        // Find in allItems
        const direct = allItems.find(i => i.id === tid);
        if (direct) return direct;
        // Check legacy mapping
        const legacyMap: Record<string, string> = {
          "mpl-001": "owasp-zap", "mpl-009": "semgrep", "mpl-010": "nikto",
          "mpl-003": "nmap", "mpl-004": "nuclei", "mpl-005": "trivy",
        };
        for (const [legacyId, engineId] of Object.entries(legacyMap)) {
          if (engineId === tid) {
            return allItems.find(i => i.id === legacyId);
          }
        }
        return undefined;
      })
      .filter(Boolean) as MarketplaceItem[];
  }, [selectedCategory, allItems]);

  // Wizard recommendations based on answers
  const wizardRecommendations = useMemo(() => {
    const toolIds = new Set<string>();
    WIZARD_QUESTIONS.forEach((q, i) => {
      if (wizardAnswers[i]) {
        const cat = PROTECTION_CATEGORIES.find(c => c.id === q.category);
        if (cat) cat.toolIds.forEach(tid => toolIds.add(tid));
      }
    });

    return Array.from(toolIds)
      .map(tid => allItems.find(i => i.id === tid))
      .filter(Boolean) as MarketplaceItem[];
  }, [wizardAnswers, allItems]);

  // Search filtering
  const searchFiltered = useMemo(() => {
    if (!search) return allItems;
    return allItems.filter(
      (item) =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase()) ||
        item.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
    );
  }, [allItems, search]);

  // Check if a marketplace item maps to an engine plugin
  const getEnginePluginId = (itemId: string): string | undefined => {
    if (MANIFESTS_BY_ID[itemId]) return itemId;
    const legacyMap: Record<string, string> = {
      "mpl-001": "owasp-zap", "mpl-009": "semgrep", "mpl-010": "nikto",
      "mpl-003": "nmap", "mpl-004": "nuclei", "mpl-005": "trivy",
    };
    return legacyMap[itemId];
  };

  const handleInstall = async (item: MarketplaceItem) => {
    if (installed.has(item.id)) {
      const engineId = getEnginePluginId(item.id);
      if (engineId) {
        removePlugin(engineId);
      }
      try {
        const raw = localStorage.getItem("sip_marketplace_installed");
        const set = new Set<string>(raw ? JSON.parse(raw) : []);
        set.delete(item.id);
        localStorage.setItem("sip_marketplace_installed", JSON.stringify([...set]));
      } catch { /* ignore */ }

      refreshRegistry();
      addToast({
        type: "success",
        title: locale === "ru" ? "Проверка отключена" : "Check disconnected",
        description: `${item.name} ${locale === "ru" ? "отключена. Сканер больше не будет её использовать." : "disconnected. Scanner will no longer use it."}`,
      });
      return;
    }

    setInstalling(item.id);

    const engineId = getEnginePluginId(item.id);
    if (engineId) {
      await installPlugin(engineId, (status) => {
        setInstallStatuses(prev => ({ ...prev, [item.id]: status }));
      });
    } else {
      await new Promise(resolve => setTimeout(resolve, 1500));
      try {
        const raw = localStorage.getItem("sip_marketplace_installed");
        const set = new Set<string>(raw ? JSON.parse(raw) : []);
        set.add(item.id);
        localStorage.setItem("sip_marketplace_installed", JSON.stringify([...set]));
      } catch { /* ignore */ }
    }

    setInstalling(null);
    setRecentlyInstalled(item.id);
    refreshRegistry();

    // Business-language toast
    const businessMsg = locale === "ru"
      ? `${item.name} подключена. Теперь можно запустить проверку.`
      : `${item.name} connected. You can now run a check.`;

    addToast({
      type: "success",
      title: locale === "ru" ? "Проверка готова к работе" : "Check ready to go",
      description: businessMsg,
    });
  };

  // Handle category selection
  const handleCategorySelect = (catId: string) => {
    if (catId === "unknown") {
      setWizardActive(true);
      setWizardStep(0);
      setWizardAnswers([false, false, false, false]);
      setWizardComplete(false);
      setSelectedCategory(null);
    } else {
      setSelectedCategory(catId);
      setWizardActive(false);
      setWizardComplete(false);
    }
  };

  // Handle wizard answer
  const handleWizardAnswer = (answer: boolean) => {
    const newAnswers = [...wizardAnswers];
    newAnswers[wizardStep] = answer;
    setWizardAnswers(newAnswers);

    if (wizardStep < WIZARD_QUESTIONS.length - 1) {
      setWizardStep(wizardStep + 1);
    } else {
      setWizardComplete(true);
    }
  };

  // Reset category
  const handleResetCategory = () => {
    setSelectedCategory(null);
    setWizardActive(false);
    setWizardComplete(false);
    setRecentlyInstalled(null);
  };

  // ─── Detail View ────────────────────────────────────────────────────
  if (detailItem) {
    const isItemInstalled = installed.has(detailItem.id);
    const status = installStatuses[detailItem.id];
    const engineId = getEnginePluginId(detailItem.id);
    const engineManifest = engineId ? MANIFESTS_BY_ID[engineId] : null;
    const regEntry = engineId ? registryEntries.find(e => e.manifest.id === engineId) : null;
    const bizInfo = TOOL_BUSINESS_INFO[detailItem.id] || TOOL_BUSINESS_INFO[engineId || ""];

    return (
      <div className="min-h-[calc(100vh-4rem)]">
        <Container className="py-8 max-w-3xl">
          <button
            onClick={() => { setDetailItem(null); setRecentlyInstalled(null); }}
            className="flex items-center gap-2 text-sm text-muted-2 hover:text-foreground mb-6 transition-colors"
          >
            ← {t("solutions.card.back")}
          </button>

          <div className="p-6 rounded-2xl bg-surface border border-border">
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-xl bg-accent-muted flex items-center justify-center shrink-0">
                <Shield className="w-7 h-7 text-accent" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground">{detailItem.name}</h1>
                  {detailItem.verified && <CheckCircle2 className="w-4 h-4 text-cyan" />}
                </div>
                <p className="text-sm text-muted-2 mt-1">{detailItem.description}</p>
              </div>
            </div>

            {/* BLOCK 6: What it checks (business language) */}
            {bizInfo && (
              <div className="mb-6 space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border border-blue-500/15">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                    <ListChecks className="w-4 h-4 text-blue-500" />
                    {t("solutions.card.whatChecks")}
                  </h3>
                  <p className="text-sm text-foreground/80">{t(bizInfo.checksKey)}</p>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-500/15">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                    <CheckSquare className="w-4 h-4 text-emerald-500" />
                    {t("solutions.card.whatYouGet")}
                  </h3>
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2 text-sm text-foreground/80">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      {t("solutions.card.result.risks")}
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground/80">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      {t("solutions.card.result.recommendations")}
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground/80">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      {t("solutions.card.result.report")}
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground/80">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      {t("solutions.card.result.priorities")}
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-surface-2 border border-border">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    {t("solutions.card.technologies")}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-xs">{bizInfo.techName}</Badge>
                    {engineManifest && (
                      <Badge variant="category" className="text-xs">{engineManifest.category}</Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Install progress */}
            {status && status !== "not_installed" && status !== "installed" && (
              <div className="mb-6">
                <InstallProgressIndicator status={status} />
              </div>
            )}

            {/* Install / Uninstall button */}
            <div className="flex items-center gap-3 mb-6">
              <Button
                size="md"
                variant={isItemInstalled ? "outline" : "primary"}
                onClick={() => handleInstall(detailItem)}
                disabled={installing === detailItem.id}
                className="flex-1 sm:flex-none"
              >
                {installing === detailItem.id ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {t("solutions.card.connecting")}</>
                ) : isItemInstalled ? (
                  t("solutions.card.connected") + " ✓"
                ) : (
                  <><Sparkles className="w-4 h-4" /> {t("solutions.card.connect")}</>
                )}
              </Button>
              {isItemInstalled && (
                <Button size="md" variant="ghost" onClick={() => handleInstall(detailItem)}>
                  {locale === "ru" ? "Отключить" : "Disconnect"}
                </Button>
              )}
            </div>

            {/* BLOCK 7: Post-install business message */}
            {isItemInstalled && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <BusinessResult type="connected" />
                <div className="mt-3 p-4 rounded-xl bg-accent-muted/30 border border-accent/20">
                  <p className="text-sm text-foreground mb-3">
                    {locale === "ru"
                      ? "Теперь можно подключить цель и выполнить первое сканирование."
                      : "Now you can connect a target and run the first scan."}
                  </p>
                  <Link
                    href="/app/scanner"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors"
                  >
                    {t("solutions.installed.runScan")}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            )}

            {/* Engine technical info (collapsible, secondary) */}
            {engineManifest && (
              <details className="mb-6">
                <summary className="text-xs text-muted-2 cursor-pointer hover:text-foreground transition-colors">
                  {locale === "ru" ? "Техническая информация" : "Technical info"} ↓
                </summary>
                <div className="mt-3 space-y-2">
                  <div className="p-3 rounded-lg bg-surface-2 border border-border">
                    <div className="text-xs font-mono text-muted-2 mb-1">{locale === "ru" ? "Команда" : "Command"}</div>
                    <div className="text-sm font-mono text-foreground">{engineManifest.run.command}</div>
                  </div>
                  {regEntry && <ToolHealthCard entry={regEntry} locale={locale} />}
                </div>
              </details>
            )}

            {/* Meta */}
            <div className="flex items-center gap-4 text-xs text-muted-2">
              <span className="font-mono">v{detailItem.version}</span>
              <span>{detailItem.license}</span>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  // ─── Main List View ─────────────────────────────────────────────────
  const currentCategory = PROTECTION_CATEGORIES.find(c => c.id === selectedCategory);
  const displayTools = selectedCategory
    ? categoryTools
    : wizardComplete
      ? wizardRecommendations
      : searchFiltered;

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* ─── BLOCK 1+2: Header + Protection Categories ──────────────── */}
      <div id="marketplace-header" className="border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Title row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-accent" />
                {t("solutions.title")}
              </h1>
              <p className="text-sm text-muted-2 mt-1">{t("solutions.subtitle")}</p>
              <div className="flex items-center gap-2 mt-2">
                <ContextualHelp section="marketplace" />
                <DemoBadge />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowToolHealth(!showToolHealth)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  showToolHealth ? "bg-accent text-background" : "bg-surface-2 text-muted-2 hover:text-foreground border-border"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                {locale === "ru" ? "Состояние" : "Health"}
              </button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={locale === "ru" ? "Поиск проверок..." : "Search checks..."}
                  className="pl-9 pr-3 py-1.5 text-xs bg-surface-2 border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:border-accent/40 w-56"
                />
              </div>
            </div>
          </div>

          {/* Protection category cards */}
          {!selectedCategory && !wizardActive && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-lg font-semibold text-foreground mb-1">{t("solutions.whatToProtect")}</h2>
              <p className="text-sm text-muted-2 mb-4">{t("solutions.whatToProtect.desc")}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PROTECTION_CATEGORIES.map((cat) => (
                  <motion.button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-4 rounded-xl bg-gradient-to-br ${cat.color} border text-left transition-all hover:shadow-lg group`}
                  >
                    <cat.icon className="w-6 h-6 text-foreground/70 mb-2 group-hover:text-accent transition-colors" />
                    <div className="font-semibold text-sm text-foreground">{t(cat.labelKey)}</div>
                    <div className="text-xs text-muted-2 mt-0.5">{t(cat.descKey)}</div>
                    <div className="text-[11px] text-foreground/50 mt-2 line-clamp-2">{t(cat.resultKey)}</div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Selected category header */}
          {selectedCategory && currentCategory && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={handleResetCategory}
                  className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-muted-2 hover:text-foreground transition-colors"
                >
                  ←
                </button>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentCategory.color} border flex items-center justify-center`}>
                  <currentCategory.icon className="w-5 h-5 text-foreground/70" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{t("solutions.recommended.title")}</h2>
                  <p className="text-xs text-muted-2">{t("solutions.recommended.subtitle")}: {t(currentCategory.labelKey)}</p>
                </div>
              </div>
              <button
                onClick={handleResetCategory}
                className="text-xs text-accent hover:underline"
              >
                {t("solutions.changeCategory")}
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* ─── BLOCK 4: Wizard ─────────────────────────────────────────── */}
      <AnimatePresence>
        {wizardActive && !wizardComplete && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-border bg-gradient-to-br from-rose-500/5 to-pink-500/5"
          >
            <Container className="py-8 max-w-xl text-center">
              <HelpCircle className="w-10 h-10 text-rose-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">{t("solutions.wizard.title")}</h2>
              <p className="text-sm text-muted-2 mb-6">{t("solutions.wizard.subtitle")}</p>

              <div className="text-xs text-muted-2 mb-4">
                {t("solutions.wizard.step")
                  .replace("{current}", String(wizardStep + 1))
                  .replace("{total}", String(WIZARD_QUESTIONS.length))}
              </div>

              <div className="p-6 rounded-xl bg-surface border border-border mb-6">
                <h3 className="text-lg font-semibold text-foreground mb-6">
                  {t(WIZARD_QUESTIONS[wizardStep].labelKey)}
                </h3>
                <div className="flex items-center justify-center gap-4">
                  <Button
                    size="md"
                    variant="primary"
                    onClick={() => handleWizardAnswer(true)}
                    className="px-8"
                  >
                    {locale === "ru" ? "Да" : "Yes"}
                  </Button>
                  <Button
                    size="md"
                    variant="outline"
                    onClick={() => handleWizardAnswer(false)}
                    className="px-8"
                  >
                    {locale === "ru" ? "Нет" : "No"}
                  </Button>
                </div>
              </div>

              {/* Progress dots */}
              <div className="flex items-center justify-center gap-2">
                {WIZARD_QUESTIONS.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i < wizardStep ? "bg-accent" : i === wizardStep ? "bg-accent scale-125" : "bg-surface-2"
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={handleResetCategory}
                className="mt-4 text-xs text-muted-2 hover:text-foreground transition-colors"
              >
                {locale === "ru" ? "Отмена" : "Cancel"}
              </button>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Wizard Results ──────────────────────────────────────────── */}
      <AnimatePresence>
        {wizardComplete && wizardActive && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Container className="py-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{t("solutions.wizard.result.title")}</h2>
                  <p className="text-xs text-muted-2">{t("solutions.wizard.result.subtitle")}</p>
                </div>
                <button
                  onClick={() => { setWizardActive(false); setWizardComplete(false); handleResetCategory(); }}
                  className="flex items-center gap-1.5 text-xs text-muted-2 hover:text-foreground transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t("solutions.wizard.restart")}
                </button>
              </div>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Tool Health Panel ───────────────────────────────────────── */}
      <Container className="py-6">
        {showToolHealth && (
          <div className="mb-6 p-4 rounded-xl bg-surface border border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield className="w-4 h-4 text-accent" />
                {locale === "ru" ? "Состояние проверок" : "Check Health"}
              </h3>
              <span className="text-xs text-muted-2">
                {registryEntries.filter(e => e.status === "installed").length} / {registryEntries.length} {locale === "ru" ? "подключено" : "connected"}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {registryEntries.map(entry => (
                <ToolHealthCard key={entry.manifest.id} entry={entry} locale={locale} />
              ))}
            </div>
          </div>
        )}

        {/* ─── BLOCK 9: Visual Flow (when category selected) ────────── */}
        {selectedCategory && NEXT_STEP_CHAINS[selectedCategory] && (
          <div className="mb-6">
            <VisualFlow steps={NEXT_STEP_CHAINS[selectedCategory].flowSteps} activeStep={0} />
          </div>
        )}

        {/* ─── BLOCK 11: Trust Block ──────────────────────────────────── */}
        {selectedCategory && currentCategory && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-gradient-to-r from-violet-500/5 to-purple-500/5 border border-violet-500/15"
          >
            <h3 className="text-sm font-semibold text-foreground mb-2">{t("solutions.trust.title")}</h3>
            <p className="text-sm text-foreground/70 mb-1">{t("solutions.trust.reason")}</p>
            <p className="text-xs text-muted-2">{t("solutions.trust.coverage")}</p>
          </motion.div>
        )}

        {/* Tools count */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-muted-2">
            {displayTools.length} {locale === "ru" ? "проверок" : "checks"}
          </span>
          {!selectedCategory && !wizardActive && (
            <span className="text-xs text-muted-2">{t("solutions.allTools")}</span>
          )}
        </div>

        {/* No results */}
        {displayTools.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {locale === "ru" ? "Проверки не найдены" : "No checks found"}
            </h3>
            <p className="text-sm text-muted-2">
              {locale === "ru"
                ? "Попробуйте изменить параметры поиска или выбрать другую категорию"
                : "Try changing your search or selecting a different category"}
            </p>
          </div>
        )}

        {/* ─── BLOCK 6: Tool Cards (new generation) ──────────────────── */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayTools.map((item) => {
            const isItemInstalling = installing === item.id;
            const isItemInstalled = installed.has(item.id);
            const status = installStatuses[item.id];
            const engineId = getEnginePluginId(item.id);
            const bizInfo = TOOL_BUSINESS_INFO[item.id] || TOOL_BUSINESS_INFO[engineId || ""];

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-xl bg-surface border border-border hover:border-border-light transition-all duration-300 group cursor-pointer"
                onClick={() => setDetailItem(item)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center">
                      <Shield className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                          {item.name}
                        </h3>
                        {item.verified && <CheckCircle2 className="w-3.5 h-3.5 text-cyan" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Business description */}
                {bizInfo ? (
                  <div className="mb-3">
                    <p className="text-xs text-foreground/80 leading-relaxed mb-2">{t(bizInfo.checksKey)}</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        ✓ {t("solutions.card.result.risks")}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        ✓ {t("solutions.card.result.report")}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-2 leading-relaxed mb-3 line-clamp-2">{item.description}</p>
                )}

                {/* Engine badge */}
                {engineId && (
                  <div className="mb-3">
                    <Badge variant="default" className="text-[9px]">
                      <Shield className="w-2.5 h-2.5 mr-1" />
                      {locale === "ru" ? "Реальный движок" : "Real Engine"}
                    </Badge>
                  </div>
                )}

                {/* Install progress */}
                {status && status !== "not_installed" && status !== "installed" && (
                  <div className="mb-3">
                    <InstallProgressIndicator status={status} />
                  </div>
                )}

                {/* BLOCK 10: BusinessResult on recently installed */}
                {isItemInstalled && recentlyInstalled === item.id && (
                  <div className="mb-3">
                    <BusinessResult type="connected" />
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="text-xs text-muted-2 font-mono">v{item.version}</div>
                  <Button
                    size="sm"
                    variant={isItemInstalled ? "outline" : isItemInstalling ? "secondary" : "primary"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInstall(item);
                    }}
                    disabled={isItemInstalling}
                  >
                    {isItemInstalling ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("solutions.card.connecting")}</>
                    ) : isItemInstalled ? (
                      t("solutions.card.connected") + " ✓"
                    ) : (
                      t("solutions.card.connect")
                    )}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ─── BLOCK 8: Next Step Chain (after installation in category) ── */}
        {selectedCategory && installed.size > 0 && NEXT_STEP_CHAINS[selectedCategory] && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <BusinessResult type="configured" />
            <div className="mt-3 p-4 rounded-xl bg-accent-muted/30 border border-accent/20">
              <p className="text-sm text-foreground mb-3">
                {t("solutions.installed.nowCanScan")}
              </p>
              <Link
                href={NEXT_STEP_CHAINS[selectedCategory].nextHref}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors"
              >
                {t(NEXT_STEP_CHAINS[selectedCategory].nextLabelKey)}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        )}

        {/* Community CTA */}
        <div id="marketplace-community" className="mt-8 p-6 rounded-xl border border-border bg-surface text-center">
          <p className="text-sm text-muted-2">
            {locale === "ru" ? "Есть вопросы? Обсудите в" : "Questions? Discuss in"}{" "}
            <a href="https://t.me/sip_security_platform" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Telegram</a>
            {" · "}
            <a href="https://discord.gg/sip-security" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Discord</a>
            {" · "}
            <a href="https://github.com/Ksander215/sec-scanner-workspace" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">GitHub</a>
          </p>
        </div>

        <div id="marketplace-faq" className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionFAQ section="marketplace" />
          <SmartNextStep {...RECOMMENDATION_CHAINS["marketplace"]} />
        </div>

        {/* INT-035: Why this matters */}
        <div className="mt-4">
          <WhyImportant textKey="confidence.why.marketplace" />
        </div>
      </Container>
    </div>
  );
}
