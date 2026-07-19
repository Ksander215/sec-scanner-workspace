"use client";

import { useState, useEffect } from "react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Search,
  Star,
  Download,
  CheckCircle2,
  Filter,
  Puzzle,
  ShieldCheck,
  LayoutDashboard,
  LayoutTemplate,
  Sparkles,
  Link2,
  Cable,
  Palette,
  Package,
  Trash2,
  RefreshCw,
  Info,
  Play,
  ArrowRight,
  Loader2,
  Wrench,
  Activity,
  Shield,
  Terminal,
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

const categoryIcons: Record<string, React.ElementType> = {
  plugins: Puzzle,
  rules: ShieldCheck,
  dashboards: LayoutDashboard,
  templates: LayoutTemplate,
  "ai-prompts": Sparkles,
  integrations: Link2,
  connectors: Cable,
  themes: Palette,
};

type TabKey = "all" | "installed" | "plugins" | "rules" | "dashboards" | "templates" | "ai-prompts" | "integrations" | "connectors" | "themes";

// ─── Install Status Indicator ─────────────────────────────────────────────

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

// ─── Tool Health Card ─────────────────────────────────────────────────────

function ToolHealthCard({ entry, locale }: { entry: RegistryEntry; locale: string }) {
  const isEn = locale === "en";
  const m = entry.manifest;
  const isBuiltin = BUILTIN_TOOL_IDS.has(m.id);

  return (
    <div className="p-3 rounded-lg bg-surface border border-border">
      <div className="flex items-center gap-2 mb-2">
        <Wrench className="w-3.5 h-3.5 text-accent" />
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

// ─── Main Component ───────────────────────────────────────────────────────

export default function MarketplacePreviewPage() {
  const { t, locale } = useI18n();
  const { addToast } = useToast();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [sortBy, setSortBy] = useState<"rating" | "installs">("installs");
  const [installing, setInstalling] = useState<string | null>(null);
  const [installStatuses, setInstallStatuses] = useState<Record<string, InstallStatus>>({});
  const [installed, setInstalled] = useState<Set<string>>(new Set());
  const [detailItem, setDetailItem] = useState<MarketplaceItem | null>(null);
  const [showToolHealth, setShowToolHealth] = useState(false);
  const [registryEntries, setRegistryEntries] = useState<RegistryEntry[]>([]);

  // Load installed state from engine registry
  useEffect(() => {
    refreshRegistry();
  }, []);

  const refreshRegistry = () => {
    const entries = getRegistry();
    setRegistryEntries(entries);

    // Build installed set: includes engine plugins + legacy marketplace items
    const installedSet = new Set<string>();

    // Add engine-installed plugins (map back to legacy IDs for marketplace display)
    entries.filter(e => e.status === "installed").forEach(e => {
      installedSet.add(e.manifest.id);
    });

    // Also add legacy marketplace items
    try {
      const raw = localStorage.getItem("sip_marketplace_installed");
      if (raw) {
        const legacyIds: string[] = JSON.parse(raw);
        legacyIds.forEach(id => installedSet.add(id));
      }
    } catch { /* ignore */ }

    setInstalled(installedSet);
  };

  const categoryLabels: Record<string, string> = locale === "ru" ? {
    plugins: "Плагины",
    rules: "Правила",
    dashboards: "Дашборды",
    templates: "Шаблоны",
    "ai-prompts": "AI-промпты",
    integrations: "Интеграции",
    connectors: "Коннекторы",
    themes: "Темы",
  } : {
    plugins: "Plugins",
    rules: "Rules",
    dashboards: "Dashboards",
    templates: "Templates",
    "ai-prompts": "AI Prompts",
    integrations: "Integrations",
    connectors: "Connectors",
    themes: "Themes",
  };

  const tabLabels: Record<TabKey, string> = locale === "ru" ? {
    all: "Все",
    installed: "Установленные",
    plugins: "Плагины",
    rules: "Правила",
    dashboards: "Дашборды",
    templates: "Шаблоны",
    "ai-prompts": "AI-промпты",
    integrations: "Интеграции",
    connectors: "Коннекторы",
    themes: "Темы",
  } : {
    all: "All",
    installed: "Installed",
    plugins: "Plugins",
    rules: "Rules",
    dashboards: "Dashboards",
    templates: "Templates",
    "ai-prompts": "AI Prompts",
    integrations: "Integrations",
    connectors: "Connectors",
    themes: "Themes",
  };

  // Combine marketplace items with engine plugin manifests
  const allItems = [
    ...marketplaceItems,
    // Add engine plugins that aren't already in marketplaceItems
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
  ];

  const filtered = allItems
    .filter((item) => {
      if (activeTab === "installed") return installed.has(item.id);
      if (activeTab === "all") return true;
      return item.category === activeTab;
    })
    .filter(
      (item) =>
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase()) ||
        item.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => (sortBy === "rating" ? b.rating - a.rating : b.installs - a.installs));

  // Check if a marketplace item maps to an engine plugin
  const getEnginePluginId = (itemId: string): string | undefined => {
    // Direct match
    if (MANIFESTS_BY_ID[itemId]) return itemId;
    // Legacy mapping
    const legacyMap: Record<string, string> = {
      "mpl-001": "owasp-zap",
      "mpl-009": "semgrep",
      "mpl-010": "nikto",
      "mpl-003": "nmap",
      "mpl-004": "nuclei",
      "mpl-005": "trivy",
    };
    return legacyMap[itemId];
  };

  const handleInstall = async (item: MarketplaceItem) => {
    if (installed.has(item.id)) {
      // Uninstall
      const engineId = getEnginePluginId(item.id);
      if (engineId) {
        removePlugin(engineId);
      }
      // Also remove from legacy
      try {
        const raw = localStorage.getItem("sip_marketplace_installed");
        const set = new Set<string>(raw ? JSON.parse(raw) : []);
        set.delete(item.id);
        localStorage.setItem("sip_marketplace_installed", JSON.stringify([...set]));
      } catch { /* ignore */ }

      refreshRegistry();
      addToast({
        type: "success",
        title: locale === "ru" ? "Инструмент удалён" : "Tool removed",
        description: `${item.name} ${locale === "ru" ? "удалён. Сканер больше не будет его показывать." : "removed. Scanner will no longer show it."}`,
      });
      return;
    }

    setInstalling(item.id);

    const engineId = getEnginePluginId(item.id);
    if (engineId) {
      // Use engine registry for real install flow with progress
      await installPlugin(engineId, (status) => {
        setInstallStatuses(prev => ({ ...prev, [item.id]: status }));
      });
    } else {
      // Non-engine item — legacy install
      await new Promise(resolve => setTimeout(resolve, 1500));
      try {
        const raw = localStorage.getItem("sip_marketplace_installed");
        const set = new Set<string>(raw ? JSON.parse(raw) : []);
        set.add(item.id);
        localStorage.setItem("sip_marketplace_installed", JSON.stringify([...set]));
      } catch { /* ignore */ }
    }

    setInstalling(null);
    refreshRegistry();
    addToast({
      type: "success",
      title: locale === "ru" ? "Инструмент установлен" : "Tool installed",
      description: `${item.name} ${locale === "ru" ? "установлен и доступен в Сканере" : "installed and available in Scanner"}`,
    });
  };

  // Detail panel
  if (detailItem) {
    const Icon = categoryIcons[detailItem.category];
    const isInstalled = installed.has(detailItem.id);
    const status = installStatuses[detailItem.id];
    const engineId = getEnginePluginId(detailItem.id);
    const engineManifest = engineId ? MANIFESTS_BY_ID[engineId] : null;
    const regEntry = engineId ? registryEntries.find(e => e.manifest.id === engineId) : null;

    return (
      <div className="min-h-[calc(100vh-4rem)]">
        <Container className="py-8 max-w-3xl">
          <button
            onClick={() => setDetailItem(null)}
            className="flex items-center gap-2 text-sm text-muted-2 hover:text-foreground mb-6 transition-colors"
          >
            ← {locale === "ru" ? "Назад к каталогу" : "Back to catalog"}
          </button>

          <div className="p-6 rounded-2xl bg-surface border border-border">
            <div className="flex items-start gap-4 mb-6">
              {Icon && (
                <div className="w-14 h-14 rounded-xl bg-accent-muted flex items-center justify-center shrink-0">
                  <Icon className="w-7 h-7 text-accent" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground">{detailItem.name}</h1>
                  {detailItem.verified && <CheckCircle2 className="w-4 h-4 text-cyan" />}
                </div>
                <p className="text-sm text-muted-2">{locale === "ru" ? "от" : "by"} {detailItem.author}</p>
              </div>
              <Button
                size="sm"
                variant={isInstalled ? "outline" : "primary"}
                onClick={() => handleInstall(detailItem)}
                disabled={installing === detailItem.id}
              >
                {installing === detailItem.id ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {locale === "ru" ? "Установка..." : "Installing..."}</>
                ) : isInstalled ? (
                  locale === "ru" ? "Установлено ✓" : "Installed ✓"
                ) : (
                  locale === "ru" ? "Установить" : "Install"
                )}
              </Button>
            </div>

            <p className="text-sm text-muted-2 leading-relaxed mb-6">{detailItem.description}</p>

            {/* Install progress */}
            {status && status !== "not_installed" && status !== "installed" && (
              <div className="mb-6">
                <InstallProgressIndicator status={status} />
              </div>
            )}

            {/* Engine plugin details */}
            {engineManifest && (
              <div className="mb-6 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-accent" />
                  {locale === "ru" ? "Техническая информация" : "Technical Info"}
                </h3>
                <div className="p-3 rounded-lg bg-surface-2 border border-border">
                  <div className="text-xs font-mono text-muted-2 mb-1">{locale === "ru" ? "Команда запуска" : "Run command"}</div>
                  <div className="text-sm font-mono text-foreground">{engineManifest.run.command}</div>
                </div>
                <div className="p-3 rounded-lg bg-surface-2 border border-border">
                  <div className="text-xs font-mono text-muted-2 mb-1">{locale === "ru" ? "Установка" : "Install command"}</div>
                  <div className="text-sm font-mono text-foreground">{engineManifest.install.command}</div>
                </div>
                <div className="p-3 rounded-lg bg-surface-2 border border-border">
                  <div className="text-xs font-mono text-muted-2 mb-1">{locale === "ru" ? "Парсер" : "Parser"}</div>
                  <div className="text-sm text-foreground">{engineManifest.parser} → {locale === "ru" ? "единая модель Findings" : "unified Findings model"}</div>
                </div>
              </div>
            )}

            {/* Tool Health (when installed) */}
            {regEntry && isInstalled && (
              <div className="mb-6">
                <ToolHealthCard entry={regEntry} locale={locale} />
              </div>
            )}

            {/* Install details */}
            <div className="space-y-3 mb-6">
              <h3 className="text-sm font-semibold text-foreground">
                {locale === "ru" ? "Информация об установке" : "Installation Info"}
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-surface-2 border border-border">
                  <span className="text-xs text-muted-2">{locale === "ru" ? "Куда установилось" : "Installed to"}</span>
                  <p className="text-sm text-foreground font-medium mt-0.5">~/.sip/plugins/{detailItem.id}</p>
                </div>
                <div className="p-3 rounded-lg bg-surface-2 border border-border">
                  <span className="text-xs text-muted-2">{locale === "ru" ? "Версия" : "Version"}</span>
                  <p className="text-sm text-foreground font-medium mt-0.5">v{detailItem.version}</p>
                </div>
                <div className="p-3 rounded-lg bg-surface-2 border border-border">
                  <span className="text-xs text-muted-2">{locale === "ru" ? "Парсер" : "Parser"}</span>
                  <p className="text-sm text-foreground font-medium mt-0.5">
                    {engineManifest ? engineManifest.parser : locale === "ru" ? "Общий" : "Generic"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-surface-2 border border-border">
                  <span className="text-xs text-muted-2">{locale === "ru" ? "Автоматически в Сканере" : "Auto in Scanner"}</span>
                  <p className="text-sm text-accent font-medium mt-0.5">{locale === "ru" ? "Да ✓" : "Yes ✓"}</p>
                </div>
              </div>
            </div>

            {/* Post-install status block */}
            {isInstalled && (
              <div className="mb-6 p-4 rounded-xl bg-accent-muted/50 border border-accent/20">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-accent" />
                  <span className="text-sm font-semibold text-foreground">{locale === "ru" ? "Инструмент установлен" : "Tool installed"}</span>
                </div>
                <div className="p-3 rounded-lg bg-surface border border-accent/30 flex items-center gap-3">
                  <Play className="w-4 h-4 text-accent shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm text-foreground">{locale === "ru" ? "Инструмент автоматически доступен в Сканере. Результаты будут приведены к единой модели Findings." : "Tool is automatically available in Scanner. Results will be normalized to the unified Findings model."}</span>
                  </div>
                  <a href="/app/scanner" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors">
                    {locale === "ru" ? "Перейти к сканированию" : "Go to Scanner"} <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* Actions */}
            {isInstalled && (
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <Button size="sm" variant="outline" onClick={() => handleInstall(detailItem)}>
                  <Trash2 className="w-3.5 h-3.5" />
                  {locale === "ru" ? "Удалить" : "Uninstall"}
                </Button>
                <Button size="sm" variant="ghost">
                  <RefreshCw className="w-3.5 h-3.5" />
                  {locale === "ru" ? "Обновить" : "Update"}
                </Button>
              </div>
            )}

            {/* Meta */}
            <div className="flex items-center gap-4 mt-4 text-xs text-muted-2">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-amber" />
                <span>{detailItem.rating}</span>
              </div>
              <div className="flex items-center gap-1">
                <Download className="w-3 h-3" />
                <span>{detailItem.installs.toLocaleString()} {locale === "ru" ? "установок" : "installs"}</span>
              </div>
              <span className="font-mono">v{detailItem.version}</span>
              <span>{detailItem.license}</span>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Puzzle className="w-5 h-5 text-accent" />
                {t("marketplace.title")}
              </h1>
              <p className="text-sm text-muted-2 mt-1">{t("marketplace.subtitle")}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowToolHealth(!showToolHealth)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  showToolHealth ? "bg-accent text-background" : "bg-surface-2 text-muted-2 hover:text-foreground border-border"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                {locale === "ru" ? "Состояние" : "Health"}
              </button>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("marketplace.search")}
                  className="pl-9 pr-3 py-1.5 text-xs bg-surface-2 border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:border-accent/40 w-56"
                />
              </div>

              <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-2 border border-border">
                <button
                  onClick={() => setSortBy("installs")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    sortBy === "installs" ? "bg-accent text-background" : "text-muted-2 hover:text-foreground"
                  }`}
                >
                  {t("common.popular")}
                </button>
                <button
                  onClick={() => setSortBy("rating")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    sortBy === "rating" ? "bg-accent text-background" : "text-muted-2 hover:text-foreground"
                  }`}
                >
                  {t("common.topRated")}
                </button>
              </div>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-1 mt-4 overflow-x-auto pb-1">
            {(Object.keys(tabLabels) as TabKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all shrink-0 ${
                  activeTab === key
                    ? "bg-accent text-background"
                    : "text-muted-2 hover:text-foreground bg-surface-2 border border-border"
                }`}
              >
                {key === "installed" && <Package className="w-3 h-3" />}
                {tabLabels[key]}
                {key === "installed" && installed.size > 0 && (
                  <span className="text-[10px] px-1 py-0.5 rounded bg-accent/20 text-accent font-semibold">
                    {installed.size}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Container className="py-6">
        {/* Tool Health Panel */}
        {showToolHealth && (
          <div className="mb-6 p-4 rounded-xl bg-surface border border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" />
                {locale === "ru" ? "Состояние инструментов" : "Tool Health"}
              </h3>
              <span className="text-xs text-muted-2">
                {registryEntries.filter(e => e.status === "installed").length} / {registryEntries.length} {locale === "ru" ? "установлено" : "installed"}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {registryEntries.map(entry => (
                <ToolHealthCard key={entry.manifest.id} entry={entry} locale={locale} />
              ))}
            </div>
          </div>
        )}

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-muted-2">
            {filtered.length} {t("marketplace.extensions")}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">{t("marketplace.noResults")}</h3>
            <p className="text-sm text-muted-2">
              {locale === "ru"
                ? "Попробуйте изменить параметры поиска или выбрать другую категорию"
                : "Try changing your search or selecting a different category"}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => {
              const Icon = categoryIcons[item.category];
              const isItemInstalling = installing === item.id;
              const isInstalled = installed.has(item.id);
              const status = installStatuses[item.id];
              const engineId = getEnginePluginId(item.id);

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-xl bg-surface border border-border hover:border-border-light transition-all duration-300 group cursor-pointer"
                  onClick={() => setDetailItem(item)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {Icon && (
                        <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center">
                          <Icon className="w-5 h-5 text-accent" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">
                            {item.name}
                          </h3>
                          {item.verified && <CheckCircle2 className="w-3.5 h-3.5 text-cyan" />}
                        </div>
                        <span className="text-xs text-muted-2">{locale === "ru" ? "от" : "by"} {item.author}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-2 leading-relaxed mb-3 line-clamp-2">{item.description}</p>

                  {/* Engine badge */}
                  {engineId && (
                    <div className="mb-3">
                      <Badge variant="default" className="text-[9px]">
                        <Shield className="w-2.5 h-2.5 mr-1" />
                        {locale === "ru" ? "Реальный движок" : "Real Engine"} → Findings
                      </Badge>
                    </div>
                  )}

                  {/* Install progress inline */}
                  {status && status !== "not_installed" && status !== "installed" && (
                    <div className="mb-3">
                      <InstallProgressIndicator status={status} />
                    </div>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-surface-2 text-muted-2 border border-border">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-3 text-xs text-muted-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber" />
                        <span>{item.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        <span>{item.installs.toLocaleString()}</span>
                      </div>
                      <span className="font-mono">v{item.version}</span>
                    </div>
                    <Button
                      size="sm"
                      variant={isInstalled ? "outline" : isItemInstalling ? "secondary" : "primary"}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInstall(item);
                      }}
                      disabled={isItemInstalling}
                    >
                      {isItemInstalling ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("common.installing")}</>
                      ) : isInstalled ? (
                        t("common.installed") + " ✓"
                      ) : (
                        t("common.install")
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Community CTA */}
        <div className="mt-8 p-6 rounded-xl border border-border bg-surface text-center">
          <p className="text-sm text-muted-2">
            {locale === "ru" ? "Есть вопросы? Обсудите в" : "Questions? Discuss in"}{" "}
            <a href="https://t.me/sip_security_platform" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Telegram</a>
            {" · "}
            <a href="https://discord.gg/sip-security" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Discord</a>
            {" · "}
            <a href="https://github.com/Ksander215/sec-scanner-workspace" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">GitHub</a>
          </p>
        </div>
      </Container>
    </div>
  );
}
