"use client";

import { motion } from "framer-motion";
import { workspaceAssets, type WorkspaceAsset } from "@/lib/portal-data";
import { Database, Server, Globe, Container, Cloud, Mail } from "lucide-react";
import { DemoBadge } from "@/components/ui/DemoBadge";

const typeIcons: Record<string, React.ElementType> = {
  host: Server,
  service: Globe,
  database: Database,
  api: Globe,
  container: Container,
  cloud: Cloud,
};

const typeColors: Record<string, string> = {
  host: "text-cyan",
  service: "text-accent",
  database: "text-purple",
  api: "text-amber",
  container: "text-cyan",
  cloud: "text-accent",
};

const criticalityColors: Record<string, string> = {
  critical: "bg-red-muted text-red",
  high: "bg-amber-muted text-amber",
  medium: "bg-cyan-muted text-cyan",
  low: "bg-surface-2 text-muted",
};

const statusColors: Record<string, string> = {
  active: "bg-accent-muted text-accent",
  inactive: "bg-surface-2 text-muted",
  deprecated: "bg-amber-muted text-amber",
};

export default function WorkspaceAssetsPage() {
  return (
    <div className="animate-page-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Workspace Assets</h1>
        <DemoBadge className="mt-2" />
        <p className="mt-2 text-muted-2">Manage and monitor all assets in your workspace.</p>
      </div>

      <div className="rounded-xl bg-surface border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Asset</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Type</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Criticality</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Findings</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Last Scanned</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {workspaceAssets.map((asset, i) => {
              const Icon = typeIcons[asset.type] || Server;
              const typeColor = typeColors[asset.type] || "text-muted";
              return (
                <motion.tr
                  key={asset.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-surface-2 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${typeColor} shrink-0`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{asset.name}</p>
                        <p className="text-xs text-muted">{asset.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-2 capitalize">{asset.type}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${statusColors[asset.status]}`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${criticalityColors[asset.criticality]}`}>
                      {asset.criticality}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`text-sm font-medium ${asset.findings > 0 ? "text-red" : "text-muted"}`}>
                      {asset.findings}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-sm text-muted-2">{asset.lastScanned}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
