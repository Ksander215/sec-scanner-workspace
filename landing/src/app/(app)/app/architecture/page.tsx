"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Layers,
  Server,
  ArrowRightLeft,
  Plug,
  Brain,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Code,
  Box,
  Workflow,
} from "lucide-react";
import { architectureLayers, type ArchLayer } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n-context";
import { ContextualHelp } from "@/components/ui/ContextualHelp";
import { SectionFAQ } from "@/components/ui/SectionFAQ";
import { SmartNextStep, RECOMMENDATION_CHAINS } from "@/components/ui/SmartNextStep";
import { DemoBadge } from "@/components/ui/DemoBadge";

const layerIcons: React.ElementType[] = [Server, Workflow, Layers, Box, Plug];

const layerColors = [
  { bg: "rgba(0,212,255,0.06)", border: "rgba(0,212,255,0.2)", text: "#00d4ff" },
  { bg: "rgba(168,85,247,0.06)", border: "rgba(168,85,247,0.2)", text: "#a855f7" },
  { bg: "rgba(0,255,136,0.06)", border: "rgba(0,255,136,0.2)", text: "#00ff88" },
  { bg: "rgba(255,184,0,0.06)", border: "rgba(255,184,0,0.2)", text: "#ffb800" },
  { bg: "rgba(255,68,68,0.06)", border: "rgba(255,68,68,0.2)", text: "#ff4444" },
];

function ArchitectureLayer({
  layer,
  index,
  expanded,
  onToggle,
}: {
  layer: ArchLayer;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const color = layerColors[index];
  const Icon = layerIcons[index];

  return (
    <div className="relative">
      {/* Layer card */}
      <button
        onClick={onToggle}
        className="w-full p-5 rounded-xl border-2 text-left transition-all duration-300 group"
        style={{
          background: expanded ? color.bg.replace("0.06", "0.12") : color.bg,
          borderColor: expanded ? color.text : color.border,
          boxShadow: expanded ? `0 0 30px ${color.text}15` : "none",
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${color.text}15` }}
          >
            <Icon className="w-6 h-6" style={{ color: color.text }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono px-2 py-0.5 rounded-md" style={{ background: `${color.text}15`, color: color.text }}>
                L{index + 1}
              </span>
              <h3 className="text-base font-bold" style={{ color: color.text }}>
                {layer.name}
              </h3>
            </div>
            <p className="text-sm text-muted-2 mt-1 line-clamp-2">{layer.description}</p>
          </div>
          <div className="shrink-0">
            {expanded ? (
              <ChevronDown className="w-5 h-5 text-muted" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted group-hover:text-foreground transition-colors" />
            )}
          </div>
        </div>

        {/* Quick stats when collapsed */}
        {!expanded && (
          <div className="flex items-center gap-3 mt-3 ml-16">
            <span className="text-xs text-muted-2">{layer.classes.length} classes</span>
            <span className="text-xs text-muted-2">·</span>
            <span className="text-xs text-muted-2">{layer.technologies.length} technologies</span>
          </div>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 ml-6 space-y-4 animate-in">
          {/* Main classes */}
          <div className="p-4 rounded-xl bg-surface border border-border">
            <span className="text-xs text-muted uppercase tracking-wider block mb-3">Core Classes</span>
            <div className="flex flex-wrap gap-2">
              {layer.classes.map((cls) => (
                <span
                  key={cls}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-mono"
                  style={{ background: `${color.text}08`, borderColor: `${color.text}20`, color: color.text }}
                >
                  <Code className="w-3 h-3" />
                  {cls}
                </span>
              ))}
            </div>
          </div>

          {/* Technologies */}
          <div className="p-4 rounded-xl bg-surface border border-border">
            <span className="text-xs text-muted uppercase tracking-wider block mb-3">Technologies</span>
            <div className="flex flex-wrap gap-2">
              {layer.technologies.map((tech) => (
                <span key={tech} className="text-xs px-3 py-1.5 rounded-lg bg-surface-2 text-foreground border border-border">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Connections */}
          <div className="p-4 rounded-xl bg-surface border border-border">
            <span className="text-xs text-muted uppercase tracking-wider block mb-3">Connections</span>
            <div className="space-y-2">
              {layer.connections.map((conn) => (
                <div key={conn} className="flex items-center gap-2 text-xs text-muted-2">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-accent" />
                  {conn}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Connector to next layer */}
      {index < architectureLayers.length - 1 && (
        <div className="flex justify-center my-1">
          <div className="w-px h-6" style={{ background: `${color.text}30` }} />
        </div>
      )}
    </div>
  );
}

export default function InteractiveArchitecturePage() {
  const [expandedLayer, setExpandedLayer] = useState<string | null>("domain");
  const { t } = useI18n();

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div id="architecture-header" data-scroll-section={t("scroll.arch.overview")} className="border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-accent" />
            Interactive Architecture
          </h1>
          <p className="text-sm text-muted-2 mt-1">Click each layer to explore its classes, technologies, and connections</p>
          <div className="flex items-center gap-2 mt-2">
            <ContextualHelp section="architecture" />
            <DemoBadge />
          </div>
        </div>
      </div>

      <Container className="py-8">
        <div id="architecture-layers" data-scroll-section={t("scroll.arch.layers")} className="max-w-3xl mx-auto space-y-2">
          {architectureLayers.map((layer, i) => (
            <ArchitectureLayer
              key={layer.id}
              layer={layer}
              index={i}
              expanded={expandedLayer === layer.id}
              onToggle={() => setExpandedLayer(expandedLayer === layer.id ? null : layer.id)}
            />
          ))}
        </div>

        {/* Deployment options */}
        <div id="architecture-deployment" data-scroll-section={t("scroll.arch.deployment")} className="mt-12 max-w-3xl mx-auto p-6 rounded-xl bg-surface border border-border">
          <h3 className="text-lg font-bold text-foreground mb-4">Deployment Options</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { title: "Self-Hosted", desc: "Docker Compose or Kubernetes. Full control, no data leaves your network.", icon: Server },
              { title: "Cloud SaaS", desc: "Managed infrastructure with automatic updates and scaling. Start scanning in minutes.", icon: Brain },
              { title: "Hybrid", desc: "Scanning agents on-premises with cloud management console. Best of both worlds.", icon: ArrowRightLeft },
            ].map((opt) => (
              <div key={opt.title} className="p-4 rounded-lg bg-surface-2 border border-border hover:border-accent/20 transition-colors">
                <opt.icon className="w-5 h-5 text-accent mb-2" />
                <h4 className="text-sm font-semibold text-foreground mb-1">{opt.title}</h4>
                <p className="text-xs text-muted-2">{opt.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/app/demo"
            className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent-hover transition-colors"
          >
            See architecture in action — Try Demo
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </Container>

      <div id="architecture-faq" data-scroll-section={t("scroll.arch.faq")} className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionFAQ section="architecture" />
        <SmartNextStep {...RECOMMENDATION_CHAINS["architecture"]} />
      </div>
    </div>
  );
}
