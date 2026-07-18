"use client";

import { useState } from "react";
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
} from "lucide-react";
import { marketplaceItems, type MarketplaceItem } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n-context";
import { useToast } from "@/components/ui/Toast";

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

export default function MarketplacePreviewPage() {
  const { t, locale } = useI18n();
  const { addToast } = useToast();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [sortBy, setSortBy] = useState<"rating" | "installs">("installs");
  const [installing, setInstalling] = useState<string | null>(null);
  const [installed, setInstalled] = useState<Set<string>>(new Set(["nucleus-engine", "owasp-rules"]));
  const [detailItem, setDetailItem] = useState<MarketplaceItem | null>(null);

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

  const filtered = marketplaceItems
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

  const handleInstall = (item: MarketplaceItem) => {
    if (installed.has(item.id)) {
      // Uninstall
      setInstalled(prev => { const next = new Set(prev); next.delete(item.id); return next; });
      addToast({
        type: "success",
        title: locale === "ru" ? "Инструмент удалён" : "Tool removed",
        description: `${item.name} ${locale === "ru" ? "удалён из проекта" : "removed from project"}`,
      });
      return;
    }
    setInstalling(item.id);
    setTimeout(() => {
      setInstalling(null);
      setInstalled(prev => new Set(prev).add(item.id));
      addToast({
        type: "success",
        title: locale === "ru" ? "Инструмент установлен" : "Tool installed",
        description: `${item.name} ${locale === "ru" ? "установлен в проект «Демо-проект»" : "installed to project \"Demo Project\""} (${locale === "ru" ? "Демонстрационная установка" : "Demo installation"})`,
      });
    }, 1500);
  };

  // Detail panel
  if (detailItem) {
    const Icon = categoryIcons[detailItem.category];
    const isInstalled = installed.has(detailItem.id);
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
              >
                {isInstalled
                  ? (locale === "ru" ? "Установлено ✓" : "Installed ✓")
                  : (locale === "ru" ? "Установить" : "Install")}
              </Button>
            </div>

            <p className="text-sm text-muted-2 leading-relaxed mb-6">{detailItem.description}</p>

            {/* Demo installation banner */}
            <div className="mb-6 p-3 rounded-lg bg-amber/10 border border-amber/20 flex items-center gap-2.5 text-sm">
              <span className="text-amber font-medium">{locale === "ru" ? "⚠ Демонстрационная установка" : "⚠ Demo installation"}</span>
              <span className="text-muted-2">— {locale === "ru" ? "изменения сохраняются только в текущей сессии" : "changes are saved in current session only"}</span>
            </div>

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
                  <span className="text-xs text-muted-2">{locale === "ru" ? "Проект" : "Project"}</span>
                  <p className="text-sm text-foreground font-medium mt-0.5">{locale === "ru" ? "Демо-проект" : "Demo Project"}</p>
                </div>
                <div className="p-3 rounded-lg bg-surface-2 border border-border">
                  <span className="text-xs text-muted-2">{locale === "ru" ? "Как использовать" : "How to use"}</span>
                  <p className="text-sm text-foreground font-mono mt-0.5">sip run --plugin {detailItem.id}</p>
                </div>
                <div className="p-3 rounded-lg bg-surface-2 border border-border">
                  <span className="text-xs text-muted-2">{locale === "ru" ? "Версия" : "Version"}</span>
                  <p className="text-sm text-foreground font-medium mt-0.5">v{detailItem.version}</p>
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
                <div className="grid sm:grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-surface border border-border">
                    <span className="text-xs text-muted-2">{locale === "ru" ? "Версия" : "Version"}</span>
                    <p className="text-sm text-foreground font-medium mt-0.5">v{detailItem.version}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface border border-border">
                    <span className="text-xs text-muted-2">{locale === "ru" ? "Автор" : "Author"}</span>
                    <p className="text-sm text-foreground font-medium mt-0.5">{detailItem.author}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface border border-border">
                    <span className="text-xs text-muted-2">{locale === "ru" ? "Добавлен в Pipeline" : "Added to Pipeline"}</span>
                    <p className="text-sm text-accent font-medium mt-0.5">{locale === "ru" ? "Да ✓" : "Yes ✓"}</p>
                  </div>
                </div>
                {/* Next step CTA */}
                <div className="p-3 rounded-lg bg-surface border border-accent/30 flex items-center gap-3">
                  <Play className="w-4 h-4 text-accent shrink-0" />
                  <div className="flex-1">
                    <span className="text-sm text-foreground">{locale === "ru" ? "Теперь используйте инструмент при следующем сканировании." : "Now use this tool in your next scan."}</span>
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
              const isInstalling = installing === item.id;
              const isInstalled = installed.has(item.id);

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
                      variant={isInstalled ? "outline" : isInstalling ? "secondary" : "primary"}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInstall(item);
                      }}
                      disabled={isInstalling}
                    >
                      {isInstalling
                        ? t("common.installing")
                        : isInstalled
                        ? t("common.installed") + " ✓"
                        : t("common.install")}
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
