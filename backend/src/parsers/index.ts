/**
 * SIP Server — Parser Framework
 * Each tool has its own parser that returns unified Finding[].
 * No NmapFinding, TrivyFinding, etc. — only Findings.
 */

import type { Finding, Severity } from "../types";

// ─── Parser interface ─────────────────────────────────────────────────────

export interface ToolParser {
  parse(rawOutput: string, asset: string): Finding[];
  toolId: string;
}

// ─── Nmap Parser ──────────────────────────────────────────────────────────

export const nmapParser: ToolParser = {
  toolId: "nmap",
  parse(rawOutput: string, asset: string): Finding[] {
    const findings: Finding[] = [];
    let findingIdx = 0;

    try {
      // Try XML parse
      const portRegex = /portid="(\d+)".*?<state\s+state="(\w+)".*?<service\s+name="([^"]*)"(?:\s+product="([^"]*)")?(?:\s+version="([^"]*)")?/g;
      let match;
      while ((match = portRegex.exec(rawOutput)) !== null) {
        const [, port, state, service, product, version] = match;
        if (state === "open") {
          findingIdx++;
          const svcDetail = [product, version].filter(Boolean).join(" ") || service;
          findings.push({
            id: `FND-NMAP-${String(findingIdx).padStart(3, "0")}`,
            tool: "nmap",
            asset,
            severity: isHighRiskPort(parseInt(port)) ? "high" : "info",
            title: `Open port ${port}/${service}${svcDetail !== service ? ` (${svcDetail})` : ""}`,
            description: `Port ${port} is open running ${svcDetail}. ${isHighRiskPort(parseInt(port)) ? "This port is commonly targeted in attacks." : ""}`,
            cvss: isHighRiskPort(parseInt(port)) ? 7.0 : 0.0,
            evidence: `${port}/tcp open ${service} ${svcDetail}`,
            recommendation: isHighRiskPort(parseInt(port))
              ? `Restrict access to port ${port}. Use firewall rules to limit exposure. Consider moving ${service} to a non-standard port.`
              : `Verify that port ${port} (${service}) needs to be publicly accessible.`,
            references: [],
            status: "open",
            discoveredAt: new Date().toISOString(),
            metadata: { port, service, product: product || "", version: version || "" },
          });
        }
      }
    } catch {
      // Fallback: try text format
      const textRegex = /(\d+)\/(tcp|udp)\s+(\w+)\s+(\S+)(?:\s+(.+))?/g;
      let textMatch;
      while ((textMatch = textRegex.exec(rawOutput)) !== null) {
        const [, port, proto, state, service, version] = textMatch;
        if (state === "open") {
          findingIdx++;
          findings.push({
            id: `FND-NMAP-${String(findingIdx).padStart(3, "0")}`,
            tool: "nmap",
            asset,
            severity: isHighRiskPort(parseInt(port)) ? "high" : "info",
            title: `Open port ${port}/${proto} ${service}`,
            description: `Port ${port}/${proto} is open running ${service}.`,
            cvss: isHighRiskPort(parseInt(port)) ? 7.0 : 0.0,
            evidence: `${port}/${proto} open ${service} ${version || ""}`,
            recommendation: `Verify that port ${port} needs to be publicly accessible.`,
            references: [],
            status: "open",
            discoveredAt: new Date().toISOString(),
          });
        }
      }
    }

    return findings;
  },
};

function isHighRiskPort(port: number): boolean {
  const highRisk = [23, 445, 1433, 3306, 5432, 6379, 9200, 27017, 3389, 5900];
  return highRisk.includes(port);
}

// ─── Nuclei Parser ────────────────────────────────────────────────────────

export const nucleiParser: ToolParser = {
  toolId: "nuclei",
  parse(rawOutput: string, asset: string): Finding[] {
    const findings: Finding[] = [];

    // Nuclei outputs one JSON object per line when -json flag is used
    const lines = rawOutput.split("\n").filter((l) => l.trim());

    // Try to parse as JSON objects (one per line)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.startsWith("{")) continue;

      try {
        const item = JSON.parse(line);
        const info = item.info || {};
        const classification = info.classification || {};
        const severity = normalizeSeverity(String(info.severity || "medium"));
        const cvss = Number(classification.cvss) || severityToCvss(severity);

        findings.push({
          id: `FND-NUCLEI-${String(findings.length + 1).padStart(3, "0")}`,
          tool: "nuclei",
          asset: String(item.host || asset),
          severity,
          title: String(info.name || item.templateID || "Unknown vulnerability"),
          description: String(info.description || `Vulnerability detected by template ${item.templateID}`),
          cvss,
          cwe: classification.cwe ? String(classification.cwe).replace("CWE-", "") : undefined,
          cve: extractCVE(String(item.templateID || "")),
          evidence: String(item.matchedAt || item.extractedResults || ""),
          recommendation: String(info.remediation || "Review and remediate the identified vulnerability."),
          references: Array.isArray(info.reference) ? info.reference.map(String) : [],
          mitre: undefined,
          status: "open",
          discoveredAt: String(item.timestamp || new Date().toISOString()),
        });
      } catch {
        // Not valid JSON on this line, skip
      }
    }

    // Fallback: try parsing entire output as JSON array
    if (findings.length === 0) {
      try {
        const results = JSON.parse(rawOutput);
        const items = Array.isArray(results) ? results : [results];

        items.forEach((item: Record<string, unknown>, idx: number) => {
          const info = item.info as Record<string, unknown> || {};
          const classification = info.classification as Record<string, unknown> || {};
          const severity = normalizeSeverity(String(info.severity || "medium"));
          const cvss = Number(classification.cvss) || severityToCvss(severity);

          findings.push({
            id: `FND-NUCLEI-${String(idx + 1).padStart(3, "0")}`,
            tool: "nuclei",
            asset: String(item.host || asset),
            severity,
            title: String(info.name || item.templateID || "Unknown vulnerability"),
            description: String(info.description || `Vulnerability detected by template ${item.templateID}`),
            cvss,
            cwe: classification.cwe ? String(classification.cwe).replace("CWE-", "") : undefined,
            cve: extractCVE(String(item.templateID || "")),
            evidence: String(item.matchedAt || item.extractedResults || ""),
            recommendation: String(info.remediation || "Review and remediate the identified vulnerability."),
            references: Array.isArray(info.reference) ? info.reference.map(String) : [],
            status: "open",
            discoveredAt: String(item.timestamp || new Date().toISOString()),
          });
        });
      } catch {
        // Final fallback: line-by-line text parsing
        let idx = 0;
        for (const line of lines) {
          const vulnMatch = line.match(/\[([^\]]+)\]\s+(.+?)\s+\[(\w+)\]/);
          if (vulnMatch) {
            idx++;
            const [, template, title, sev] = vulnMatch;
            const severity = normalizeSeverity(sev);
            findings.push({
              id: `FND-NUCLEI-${String(idx).padStart(3, "0")}`,
              tool: "nuclei",
              asset,
              severity,
              title,
              description: `Vulnerability detected by Nuclei template ${template}`,
              cvss: severityToCvss(severity),
              cve: extractCVE(template),
              evidence: line,
              recommendation: "Review and remediate the identified vulnerability.",
              references: [],
              status: "open",
              discoveredAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    return findings;
  },
};

// ─── Trivy Parser ─────────────────────────────────────────────────────────

export const trivyParser: ToolParser = {
  toolId: "trivy",
  parse(rawOutput: string, asset: string): Finding[] {
    const findings: Finding[] = [];

    try {
      const data = JSON.parse(rawOutput);
      const results = data.Results || [];

      results.forEach((result: Record<string, unknown>) => {
        const target = String(result.Target || asset);
        const vulns = (result.Vulnerabilities || []) as Record<string, unknown>[];

        vulns.forEach((vuln: Record<string, unknown>, idx: number) => {
          const severity = normalizeSeverity(String(vuln.Severity || "medium"));
          const cvssData = vuln.CVSS as Record<string, Record<string, Record<string, number>>> | undefined;
          const rawNvdScore = cvssData?.nvd?.V3Score;
          const nvdScore: number = typeof rawNvdScore === "number" ? rawNvdScore : severityToCvss(severity);

          findings.push({
            id: `FND-TRIVY-${String(idx + 1).padStart(3, "0")}`,
            tool: "trivy",
            asset: target,
            severity,
            title: String(vuln.Title || `${vuln.PkgName}: ${vuln.VulnerabilityID}`),
            description: String(vuln.Description || `Vulnerability ${vuln.VulnerabilityID} in ${vuln.PkgName}`),
            cvss: nvdScore,
            cve: String(vuln.VulnerabilityID || ""),
            cwe: Array.isArray(vuln.CWEIDs) && vuln.CWEIDs.length > 0
              ? String(vuln.CWEIDs[0]).replace("CWE-", "")
              : undefined,
            evidence: `${vuln.PkgName} ${vuln.InstalledVersion} → ${vuln.FixedVersion || "no fix"}`,
            recommendation: vuln.FixedVersion
              ? `Upgrade ${vuln.PkgName} from ${vuln.InstalledVersion} to ${vuln.FixedVersion}`
              : `Monitor ${vuln.PkgName} for a fix. Consider removing or replacing the dependency.`,
            references: Array.isArray(vuln.References) ? vuln.References.map(String) : [String(vuln.PrimaryURL || "")],
            status: "open",
            discoveredAt: new Date().toISOString(),
            metadata: {
              target,
              pkgName: String(vuln.PkgName || ""),
              installedVersion: String(vuln.InstalledVersion || ""),
              fixedVersion: String(vuln.FixedVersion || ""),
            },
          });
        });
      });
    } catch {
      // Fallback: text parsing
      const lines = rawOutput.split("\n");
      let idx = 0;
      for (const line of lines) {
        const vulnMatch = line.match(/(CVE-\d{4}-\d+)\s.*?(CRITICAL|HIGH|MEDIUM|LOW)/i);
        if (vulnMatch) {
          idx++;
          const [, cve, sev] = vulnMatch;
          const severity = normalizeSeverity(sev);
          findings.push({
            id: `FND-TRIVY-${String(idx).padStart(3, "0")}`,
            tool: "trivy",
            asset,
            severity,
            title: cve,
            description: `Vulnerability ${cve} detected in dependencies`,
            cvss: severityToCvss(severity),
            cve,
            evidence: line,
            recommendation: "Update the affected dependency to the latest version.",
            references: [],
            status: "open",
            discoveredAt: new Date().toISOString(),
          });
        }
      }
    }

    return findings;
  },
};

// ─── Semgrep Parser ───────────────────────────────────────────────────────

export const semgrepParser: ToolParser = {
  toolId: "semgrep",
  parse(rawOutput: string, asset: string): Finding[] {
    const findings: Finding[] = [];

    try {
      const data = JSON.parse(rawOutput);
      const results = data.results || [];

      results.forEach((item: Record<string, unknown>, idx: number) => {
        const extra = item.extra as Record<string, unknown> || {};
        const metadata = extra.metadata as Record<string, unknown> || {};
        const severity = normalizeSeverity(String(extra.severity || "WARNING"));
        const start = item.start as Record<string, number> || {};

        findings.push({
          id: `FND-SEMGREP-${String(idx + 1).padStart(3, "0")}`,
          tool: "semgrep",
          asset: String(item.path || asset),
          severity,
          title: String(extra.message || item.check_id || "Code issue detected"),
          description: String(extra.message || `Issue detected by rule ${item.check_id}`),
          cvss: severityToCvss(severity),
          cwe: metadata.cwe ? String(metadata.cwe).replace("CWE-", "") : undefined,
          evidence: String(extra.lines || `${item.path}:${start.line || "?"}`),
          recommendation: `Review and fix the code issue at ${item.path}:${start.line || "?"}`,
          references: Array.isArray(metadata.references) ? metadata.references.map(String) : [],
          status: "open",
          discoveredAt: new Date().toISOString(),
          metadata: {
            path: String(item.path || ""),
            line: String(start.line || ""),
            rule: String(item.check_id || ""),
            confidence: String(metadata.confidence || ""),
          },
        });
      });
    } catch {
      // Fallback
      const lines = rawOutput.split("\n");
      let idx = 0;
      for (const line of lines) {
        const match = line.match(/(\S+):\s*(.+)/);
        if (match) {
          idx++;
          findings.push({
            id: `FND-SEMGREP-${String(idx).padStart(3, "0")}`,
            tool: "semgrep",
            asset,
            severity: "medium",
            title: match[1],
            description: match[2],
            cvss: 5.0,
            evidence: line,
            recommendation: "Review and fix the identified code issue.",
            references: [],
            status: "open",
            discoveredAt: new Date().toISOString(),
          });
        }
      }
    }

    return findings;
  },
};

// ─── ZAP Parser ───────────────────────────────────────────────────────────

export const zapParser: ToolParser = {
  toolId: "owasp-zap",
  parse(rawOutput: string, asset: string): Finding[] {
    const findings: Finding[] = [];

    try {
      const data = JSON.parse(rawOutput);
      const sites = data.site || [];

      sites.forEach((site: Record<string, unknown>) => {
        const alerts = (site.alerts || []) as Record<string, unknown>[];

        alerts.forEach((alert: Record<string, unknown>, idx: number) => {
          const riskCode = String(alert.riskcode || "1");
          const severity = riskCodeToSeverity(riskCode);
          const instances = (alert.instances || []) as Record<string, unknown>[];

          findings.push({
            id: `FND-ZAP-${String(idx + 1).padStart(3, "0")}`,
            tool: "owasp-zap",
            asset: String(site["@name"] || asset),
            severity,
            title: String(alert.name || alert.alert || "Vulnerability detected"),
            description: String(alert.desc || "Vulnerability detected by OWASP ZAP"),
            cvss: severityToCvss(severity),
            cwe: alert.cweid ? String(alert.cweid) : undefined,
            evidence: instances.length > 0
              ? `${instances[0].method} ${instances[0].uri} (param: ${instances[0].param})`
              : "",
            recommendation: String(alert.solution || "Review and remediate the identified vulnerability."),
            references: [String(alert.reference || "")].filter(Boolean),
            status: "open",
            discoveredAt: new Date().toISOString(),
            metadata: {
              pluginId: String(alert.pluginid || ""),
              wascId: String(alert.wascid || ""),
              confidence: String(alert.confidence || ""),
            },
          });
        });
      });
    } catch {
      // Fallback
      const lines = rawOutput.split("\n");
      let idx = 0;
      for (const line of lines) {
        const match = line.match(/^(.+?)\s+[-–]\s+(.+)$/);
        if (match) {
          idx++;
          findings.push({
            id: `FND-ZAP-${String(idx).padStart(3, "0")}`,
            tool: "owasp-zap",
            asset,
            severity: "medium",
            title: match[1],
            description: match[2],
            cvss: 5.0,
            evidence: line,
            recommendation: "Review and remediate the identified vulnerability.",
            references: [],
            status: "open",
            discoveredAt: new Date().toISOString(),
          });
        }
      }
    }

    return findings;
  },
};

// ─── Nikto Parser ─────────────────────────────────────────────────────────

export const niktoParser: ToolParser = {
  toolId: "nikto",
  parse(rawOutput: string, asset: string): Finding[] {
    const findings: Finding[] = [];
    let idx = 0;

    // CSV format
    const lines = rawOutput.split("\n");
    for (const line of lines) {
      const csvMatch = line.match(/"([^"]+)"\s*,\s*"([^"]+)"/);
      if (csvMatch) {
        const [, osvdb, detail] = csvMatch;
        if (osvdb.startsWith("OSVDB") || osvdb.startsWith("CVE")) {
          idx++;
          findings.push({
            id: `FND-NIKTO-${String(idx).padStart(3, "0")}`,
            tool: "nikto",
            asset,
            severity: "medium",
            title: `${osvdb}: Web server issue`,
            description: detail,
            cvss: 5.0,
            evidence: line,
            recommendation: "Review and remediate the web server misconfiguration.",
            references: [`https://vulners.com/osvdb/${osvdb}`],
            status: "open",
            discoveredAt: new Date().toISOString(),
          });
        }
      }
    }

    return findings;
  },
};

// ─── Parser Registry ──────────────────────────────────────────────────────

const PARSERS: Record<string, ToolParser> = {
  nmap: nmapParser,
  nuclei: nucleiParser,
  trivy: trivyParser,
  semgrep: semgrepParser,
  zap: zapParser,
  nikto: niktoParser,
};

/** Get parser for a tool */
export function getParser(toolId: string): ToolParser | undefined {
  return PARSERS[toolId];
}

/** Parse raw output using the appropriate parser */
export function parseOutput(toolId: string, rawOutput: string, asset: string): Finding[] {
  const parser = PARSERS[toolId];
  if (!parser) {
    console.warn(`[SIP Parser] No parser found for tool: ${toolId}`);
    return [];
  }
  return parser.parse(rawOutput, asset);
}

/** Register a custom parser */
export function registerParser(parser: ToolParser) {
  PARSERS[parser.toolId] = parser;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function normalizeSeverity(raw: string): Severity {
  const lower = raw.toLowerCase().trim();
  if (lower === "critical" || lower === "error" || lower === "3") return "critical";
  if (lower === "high" || lower === "warning" || lower === "2") return "high";
  if (lower === "medium" || lower === "1") return "medium";
  if (lower === "low" || lower === "info" || lower === "0") return "low";
  return "info";
}

function severityToCvss(severity: Severity): number {
  const map: Record<Severity, number> = {
    critical: 9.5,
    high: 7.5,
    medium: 5.0,
    low: 3.0,
    info: 0.0,
  };
  return map[severity];
}

function extractCVE(text: string): string | undefined {
  const match = text.match(/CVE-\d{4}-\d+/);
  return match ? match[0] : undefined;
}

function riskCodeToSeverity(code: string): Severity {
  switch (code) {
    case "3": return "critical";
    case "2": return "high";
    case "1": return "medium";
    case "0": return "low";
    default: return "info";
  }
}
