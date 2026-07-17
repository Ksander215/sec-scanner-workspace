"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  CheckCircle2,
  Loader2,
  Clock,
  Lightbulb,
  ThumbsUp,
  Filter,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { roadmapItems, type RoadmapStatus, type RoadmapItem } from "@/lib/demo-data";

type StatusFilter = RoadmapStatus | "all";

const statusConfig: Record<RoadmapStatus, { label: string; icon: React.ElementType; color: string; bg: string; badge: "low" | "info" | "medium" | "category" }> = {
  completed: { label: "Completed", icon: CheckCircle2, color: "#00ff88", bg: "rgba(0,255,136,0.08)", badge: "low" },
  "in-progress": { label: "In Progress", icon: Loader2, color: "#00d4ff", bg: "rgba(0,212,255,0.08)", badge: "info" },
  planned: { label: "Planned", icon: Clock, color: "#ffb800", bg: "rgba(255,184,0,0.08)", badge: "medium" },
  "community-idea": { label: "Community Ideas", icon: Lightbulb, color: "#a855f7", bg: "rgba(168,85,247,0.08)", badge: "category" },
};

function RoadmapCard({ item, expanded, onToggle }: { item: RoadmapItem; expanded: boolean; onToggle: () => void }) {
  const config = statusConfig[item.status];
  const Icon = config.icon;

  return (
    <div
      className="rounded-xl border transition-all duration-300"
      style={{ background: config.bg, borderColor: expanded ? config.color : "rgba(30,30,46,0.8)" }}
    >
      <button onClick={onToggle} className="w-full p-5 text-left">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <Badge variant={config.badge}>
                <Icon className={`w-3 h-3 mr-1 ${item.status === "in-progress" ? "animate-spin" : ""}`} style={{ color: config.color }} />
                {config.label}
              </Badge>
              <span className="text-xs px-2 py-0.5 rounded-md bg-surface-2 text-muted-2 border border-border">
                {item.category}
              </span>
            </div>
            <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
            {!expanded && (
              <p className="text-xs text-muted-2 mt-1 line-clamp-1">{item.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1 text-xs text-muted-2">
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>{item.upvotes}</span>
            </div>
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-3">
          <p className="text-sm text-muted-2 leading-relaxed">{item.description}</p>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-2">Target: <span style={{ color: config.color }}>{item.target}</span></span>
            <span className="text-muted-2">Category: {item.category}</span>
            <span className="text-muted-2">Upvotes: {item.upvotes}</span>
          </div>
          {item.status === "community-idea" && (
            <Button size="sm" variant="outline">
              <ThumbsUp className="w-3.5 h-3.5" />
              Upvote this idea
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function InteractiveRoadmapPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const filtered = roadmapItems
    .filter((item) => statusFilter === "all" || item.status === statusFilter)
    .sort((a, b) => b.upvotes - a.upvotes);

  const statusCounts = {
    all: roadmapItems.length,
    completed: roadmapItems.filter((i) => i.status === "completed").length,
    "in-progress": roadmapItems.filter((i) => i.status === "in-progress").length,
    planned: roadmapItems.filter((i) => i.status === "planned").length,
    "community-idea": roadmapItems.filter((i) => i.status === "community-idea").length,
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            Interactive Roadmap
          </h1>
          <p className="text-sm text-muted-2 mt-1">See what we&apos;re building, what&apos;s next, and suggest features</p>

          {/* Status filter */}
          <div className="flex items-center gap-1 mt-4 overflow-x-auto pb-1">
            {(Object.entries(statusConfig) as [RoadmapStatus, typeof statusConfig[RoadmapStatus]][])
              .concat([["all" as StatusFilter, { label: "All", icon: Filter, color: "#e8e8ed", bg: "", badge: "default" as const }]] as any)
              .sort((a, b) => {
                const order = ["all", "in-progress", "planned", "completed", "community-idea"];
                return order.indexOf(a[0]) - order.indexOf(b[0]);
              })
              .map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all shrink-0 ${
                    statusFilter === key ? "text-background" : "text-muted-2 hover:text-foreground bg-surface-2 border border-border"
                  }`}
                  style={statusFilter === key ? { background: cfg.color === "#e8e8ed" ? "#00ff88" : cfg.color } : {}}
                >
                  <cfg.icon className={`w-3.5 h-3.5 ${key === "in-progress" && statusFilter === key ? "animate-spin" : ""}`} />
                  {cfg.label}
                  <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    statusFilter === key ? "bg-black/20 text-background" : "bg-surface text-muted-2"
                  }`}>
                    {statusCounts[key as keyof typeof statusCounts]}
                  </span>
                </button>
              ))}
          </div>
        </div>
      </div>

      <Container className="py-6">
        <div className="max-w-3xl mx-auto space-y-3">
          {filtered.map((item) => (
            <RoadmapCard
              key={item.id}
              item={item}
              expanded={expandedItem === item.id}
              onToggle={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
            />
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-sm text-muted-2">No items match the current filter.</p>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
