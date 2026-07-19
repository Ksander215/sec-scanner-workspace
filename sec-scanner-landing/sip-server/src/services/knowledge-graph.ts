/**
 * SIP Server — Knowledge Graph Builder
 * Auto-built from Scanner → Assets → Ports → Services → Dependencies → Findings.
 * No mock JSON. Built entirely from real scan results.
 */

import type { Finding, KGNode, KGEdge, Severity } from "../types";

export interface KnowledgeGraph {
  nodes: KGNode[];
  edges: KGEdge[];
}

export function buildKnowledgeGraph(findings: Finding[]): KnowledgeGraph {
  const nodes: KGNode[] = [];
  const edges: KGEdge[] = [];
  const nodeIds = new Set<string>();

  const addNode = (node: KGNode) => {
    if (!nodeIds.has(node.id)) {
      nodeIds.add(node.id);
      nodes.push(node);
    }
  };

  const addEdge = (source: string, target: string, label: string) => {
    const id = `edge-${source}-${target}-${label}`;
    if (!nodeIds.has(id)) {
      nodeIds.add(id);
      edges.push({ id, source, target, label });
    }
  };

  // 1. Extract assets
  const assetNames = new Set<string>();
  for (const f of findings) {
    if (f.asset) assetNames.add(f.asset);
  }

  for (const assetName of assetNames) {
    const assetId = `host-${assetName.replace(/[^a-zA-Z0-9]/g, "-")}`;
    addNode({
      id: assetId,
      type: "host",
      label: assetName,
      detail: extractDomain(assetName),
      nodeType: "host",
    });
  }

  // 2. Extract services/ports from findings metadata
  const serviceMap = new Map<string, { name: string; port?: string; host: string }>();
  for (const f of findings) {
    if (f.metadata?.port && f.metadata?.service) {
      const key = `${f.asset}:${f.metadata.port}`;
      if (!serviceMap.has(key)) {
        serviceMap.set(key, {
          name: f.metadata.service,
          port: f.metadata.port,
          host: f.asset,
        });
      }
    }
  }

  for (const [, svc] of serviceMap) {
    const svcId = `svc-${svc.host.replace(/[^a-zA-Z0-9]/g, "-")}-${svc.port}`;
    const hostId = `host-${svc.host.replace(/[^a-zA-Z0-9]/g, "-")}`;
    addNode({
      id: svcId,
      type: "service",
      label: `${svc.name}:${svc.port}`,
      detail: `${svc.name} on port ${svc.port}`,
      nodeType: "service",
    });
    addEdge(hostId, svcId, "runs");
  }

  // 3. Add findings
  for (const f of findings) {
    const findingId = `finding-${f.id}`;
    addNode({
      id: findingId,
      type: "finding",
      label: truncate(f.title, 40),
      severity: f.severity,
      detail: f.cve || f.cwe || "",
      nodeType: "finding",
    });
    const hostId = `host-${f.asset.replace(/[^a-zA-Z0-9]/g, "-")}`;
    addEdge(hostId, findingId, "has_finding");
  }

  // 4. Add CVEs
  const cveMap = new Map<string, string[]>();
  for (const f of findings) {
    if (f.cve) {
      const existing = cveMap.get(f.cve) || [];
      existing.push(f.id);
      cveMap.set(f.cve, existing);
    }
  }

  for (const [cve, findingIds] of cveMap) {
    const cveId = `cve-${cve.replace(/[^a-zA-Z0-9]/g, "-")}`;
    const severity = getCVESeverity(cve, findings);
    addNode({
      id: cveId,
      type: "cve",
      label: cve,
      severity,
      detail: `CVSS: ${findings.find(f => f.cve === cve)?.cvss || "N/A"}`,
      nodeType: "cve",
    });
    for (const fid of findingIds) {
      addEdge(cveId, `finding-${fid}`, "exploits");
    }
  }

  // 5. Add credentials/secrets findings
  for (const f of findings) {
    if (f.cwe === "798" || f.title.toLowerCase().includes("credential") || f.title.toLowerCase().includes("secret") || f.title.toLowerCase().includes("password")) {
      const credId = `cred-${f.id}`;
      addNode({
        id: credId,
        type: "credential",
        label: truncate(f.title, 30),
        severity: "critical",
        detail: f.evidence,
        nodeType: "credential",
      });
      const hostId = `host-${f.asset.replace(/[^a-zA-Z0-9]/g, "-")}`;
      addEdge(hostId, credId, "authenticates");
      const findingId = `finding-${f.id}`;
      addEdge(findingId, credId, "reveals");
    }
  }

  // 6. Add recommendations
  for (const f of findings) {
    if (f.severity === "critical" || f.severity === "high") {
      const recId = `rec-${f.id}`;
      addNode({
        id: recId,
        type: "recommendation",
        label: truncate(f.recommendation, 40),
        detail: `Fix: ${f.recommendation}`,
        nodeType: "recommendation",
      });
      const findingId = `finding-${f.id}`;
      addEdge(recId, findingId, "remediates");
    }
  }

  // 7. Add dependencies
  for (const f of findings) {
    if (f.metadata?.pkgName) {
      const depId = `dep-${f.metadata.pkgName.replace(/[^a-zA-Z0-9]/g, "-")}`;
      addNode({
        id: depId,
        type: "dependency",
        label: f.metadata.pkgName,
        detail: `${f.metadata.installedVersion || "?"} → ${f.metadata.fixedVersion || "no fix"}`,
        severity: f.severity,
        nodeType: "dependency",
      });
      const findingId = `finding-${f.id}`;
      addEdge(depId, findingId, "affects");
    }
  }

  return { nodes, edges };
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen - 3) + "..." : str;
}

function extractDomain(asset: string): string {
  try {
    if (asset.startsWith("http")) {
      return new URL(asset).hostname;
    }
    return asset;
  } catch {
    return asset;
  }
}

function getCVESeverity(cve: string, findings: Finding[]): Severity {
  const finding = findings.find((f) => f.cve === cve);
  return finding?.severity || "medium";
}
