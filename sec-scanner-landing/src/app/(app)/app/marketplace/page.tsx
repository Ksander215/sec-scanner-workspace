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
  ExternalLink,
} from "lucide-react";
import { marketplaceItems, type MarketplaceItem } from "@/lib/demo-data";

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

const categoryLabels: Record<string, string> = {
  plugins: "Plugins",
  rules: "Rules",
  dashboards: "Dashboards",
  templates: "Templates",
  "ai-prompts": "AI Prompts",
  integrations: "Integrations",
  connectors: "Connectors",
  themes: "Themes",
};

export default function MarketplacePreviewPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"rating" | "installs">("installs");
  const [installing, setInstalling] = useState<string | null>(null);
  const [installed, setInstalled] = useState<Set<string>>(new Set());

  const filtered = marketplaceItems
    .filter((item) => activeCategory === "all" || item.category === activeCategory)
    .filter(
      (item) =>
        !search ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => (sortBy === "rating" ? b.rating - a.rating : b.installs - a.installs));

  const handleInstall = (id: string) => {
    if (installed.has(id)) {
      setInstalled(prev => { const next = new Set(prev); next.delete(id); return next; });
      return;
    }
    setInstalling(id);
    setTimeout(() => {
      setInstalling(null);
      setInstalled(prev => new Set(prev).add(id));
    }, 1500);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Puzzle className="w-5 h-5 text-accent" />
                Marketplace
              </h1>
              <p className="text-sm text-muted-2 mt-1">Browse and install extensions for the Security Intelligence Platform</p>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search marketplace..."
                  className="pl-9 pr-3 py-1.5 text-xs bg-surface-2 border border-border rounded-lg text-foreground placeholder:text-muted focus:outline-none focus:border-accent/40 w-56"
                />
              </div>

              {/* Sort */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-2 border border-border">
                <button
                  onClick={() => setSortBy("installs")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    sortBy === "installs" ? "bg-accent text-background" : "text-muted-2 hover:text-foreground"
                  }`}
                >
                  Popular
                </button>
                <button
                  onClick={() => setSortBy("rating")}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    sortBy === "rating" ? "bg-accent text-background" : "text-muted-2 hover:text-foreground"
                  }`}
                >
                  Top Rated
                </button>
              </div>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-1 mt-4 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCategory("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all shrink-0 ${
                activeCategory === "all" ? "bg-accent text-background" : "text-muted-2 hover:text-foreground bg-surface-2 border border-border"
              }`}
            >
              All
            </button>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all shrink-0 ${
                  activeCategory === key ? "bg-accent text-background" : "text-muted-2 hover:text-foreground bg-surface-2 border border-border"
                }`}
              >
                {(() => {
                  const Icon = categoryIcons[key];
                  return Icon ? <Icon className="w-3 h-3" /> : null;
                })()}
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Container className="py-6">
        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-muted-2">{filtered.length} extensions</span>
        </div>

        {/* Marketplace grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const Icon = categoryIcons[item.category];
            const isInstalling = installing === item.id;
            const isInstalled = installed.has(item.id);

            return (
              <div
                key={item.id}
                className="p-5 rounded-xl bg-surface border border-border hover:border-border-light transition-all duration-300 group"
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
                      <span className="text-xs text-muted-2">by {item.author}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-muted-2 leading-relaxed mb-3">{item.description}</p>

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
                    <span>{item.license}</span>
                  </div>
                  <Button
                    size="sm"
                    variant={isInstalled ? "outline" : isInstalling ? "secondary" : "primary"}
                    onClick={() => handleInstall(item.id)}
                    disabled={isInstalling}
                  >
                    {isInstalling ? "Installing..." : isInstalled ? "Installed ✓" : "Install"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </div>
  );
}
