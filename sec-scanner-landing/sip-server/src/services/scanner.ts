/**
 * SIP Server — Scanner Engine (Orchestrator)
 * Orchestrates tool execution through the Plugin Runtime.
 *
 * Pipeline: select data source → form commands → launch processes →
 *           capture stdout/stderr → track progress → save logs →
 *           return exit codes → pass to parsers → unify findings.
 */

import type { ScanConfig, ScanResult, Finding, TimelineEntry, Severity, StageProgress } from "../types";
import { executeTool, killAllScanProcesses, getApplicableTools } from "../plugins/runtime";
import { MANIFESTS_BY_ID, BUILTIN_TOOL_IDS } from "../plugins/manifests";
import { parseOutput } from "../parsers";
import type { ServerResponse } from "http";

// ─── Active scans ─────────────────────────────────────────────────────────

const activeScans = new Map<string, {
  config: ScanConfig;
  cancelled: boolean;
}>();

export function isScanActive(scanId: string): boolean {
  return activeScans.has(scanId);
}

export function cancelScan(scanId: string): boolean {
  const scan = activeScans.get(scanId);
  if (scan) {
    scan.cancelled = true;
    killAllScanProcesses(scanId);
    activeScans.delete(scanId);
    return true;
  }
  return false;
}

// ─── Execute full scan pipeline ───────────────────────────────────────────

export async function executeScanPipeline(
  config: ScanConfig,
  scanId: string,
  res: ServerResponse,
): Promise<ScanResult> {
  const startedAt = new Date().toISOString();
  const allFindings: Finding[] = [];
  const timeline: TimelineEntry[] = [];
  const allStdout: string[] = [];
  const allStderr: string[] = [];
  let overallExitCode = 0;

  // Register active scan
  activeScans.set(scanId, { config, cancelled: false });

  // SSE helper
  const sendSSE = (event: string, data: unknown) => {
    if (!res.writableEnded) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  };

  try {
    // ─── Stage 0: Init ────────────────────────────────────────────────
    sendSSE("stage", {
      stageIndex: 0,
      stageLabel: "Initialize",
      status: "running",
      progress: 0,
      stdout: [`$ sip init --project "${config.projectName}"`, `Target: ${config.sourceValue}`, `Source: ${config.sourceType}`],
      timestamp: new Date().toISOString(),
    } as StageProgress);

    timeline.push({
      timestamp: new Date().toISOString(),
      event: "Started: Initialize",
      detail: `Project: ${config.projectName}, Target: ${config.sourceValue}`,
    });

    await delay(500);

    sendSSE("stage", {
      stageIndex: 0,
      stageLabel: "Initialize",
      status: "completed",
      progress: 100,
      stdout: ["Environment ready"],
      timestamp: new Date().toISOString(),
    } as StageProgress);

    // ─── Stages 1..N: Execute each tool ───────────────────────────────
    for (let i = 0; i < config.toolIds.length; i++) {
      const scan = activeScans.get(scanId);
      if (!scan || scan.cancelled) {
        throw new Error("Scan cancelled");
      }

      const toolId = config.toolIds[i];
      const manifest = MANIFESTS_BY_ID[toolId];
      if (!manifest) continue;

      const stageIndex = i + 1;
      const stdoutLines: string[] = [];

      sendSSE("stage", {
        stageIndex,
        stageLabel: manifest.name,
        status: "running",
        progress: 0,
        stdout: [],
        timestamp: new Date().toISOString(),
      } as StageProgress);

      timeline.push({
        timestamp: new Date().toISOString(),
        event: `Started: ${manifest.name}`,
        detail: manifest.description.en,
        tool: toolId,
      });

      // Execute tool via Plugin Runtime
      const result = await executeTool(scanId, toolId, config.sourceType, config.sourceValue, {
        onStdout: (line) => {
          stdoutLines.push(line);
          sendSSE("stdout", { toolId, line, timestamp: new Date().toISOString() });
        },
        onStderr: (line) => {
          allStderr.push(`[${toolId}] ${line}`);
        },
        onProgress: (percent) => {
          sendSSE("stage", {
            stageIndex,
            stageLabel: manifest.name,
            status: "running",
            progress: percent,
            stdout: stdoutLines.slice(-5),
            timestamp: new Date().toISOString(),
          } as StageProgress);
        },
      });

      allStdout.push(...stdoutLines);
      if (result.exitCode !== 0 && result.exitCode !== -1) {
        // Non-zero exit but not crash — may still have useful output
      }
      if (result.error) {
        allStderr.push(`[${toolId}] ERROR: ${result.error}`);
      }
      if (result.exitCode === -1) {
        overallExitCode = 1; // Mark as partially failed
      }

      // Parse tool output into Findings
      if (result.stdout) {
        const toolFindings = parseOutput(toolId, result.stdout, config.sourceValue);
        allFindings.push(...toolFindings);
      }

      sendSSE("stage", {
        stageIndex,
        stageLabel: manifest.name,
        status: "completed",
        progress: 100,
        stdout: stdoutLines.slice(-5),
        timestamp: new Date().toISOString(),
      } as StageProgress);

      timeline.push({
        timestamp: new Date().toISOString(),
        event: `Completed: ${manifest.name}`,
        detail: `${allFindings.filter(f => f.tool === toolId).length} findings`,
        tool: toolId,
      });
    }

    // ─── Stage N+1: Correlate ─────────────────────────────────────────
    const correlateStageIndex = config.toolIds.length + 1;
    sendSSE("stage", {
      stageIndex: correlateStageIndex,
      stageLabel: "Correlation",
      status: "running",
      progress: 0,
      stdout: [],
      timestamp: new Date().toISOString(),
    } as StageProgress);

    const uniqueFindings = deduplicateFindings(allFindings);
    await delay(500);

    sendSSE("stage", {
      stageIndex: correlateStageIndex,
      stageLabel: "Correlation",
      status: "completed",
      progress: 100,
      stdout: [`${allFindings.length - uniqueFindings.length} duplicates merged`],
      timestamp: new Date().toISOString(),
    } as StageProgress);

    // ─── Stage N+2: Risk Scoring ──────────────────────────────────────
    const riskStageIndex = correlateStageIndex + 1;
    const riskScore = calculateRiskScore(uniqueFindings);

    sendSSE("stage", {
      stageIndex: riskStageIndex,
      stageLabel: "Risk Scoring",
      status: "completed",
      progress: 100,
      stdout: [`Risk score: ${riskScore}/100`],
      timestamp: new Date().toISOString(),
    } as StageProgress);

    // ─── Final result ─────────────────────────────────────────────────
    const result: ScanResult = {
      id: scanId,
      projectId: config.projectId,
      projectName: config.projectName,
      sourceType: config.sourceType,
      sourceValue: config.sourceValue,
      tools: config.toolIds,
      status: "completed",
      startedAt,
      completedAt: new Date().toISOString(),
      findings: uniqueFindings,
      riskScore,
      timeline,
      stdout: allStdout,
      stderr: allStderr,
      exitCode: overallExitCode,
    };

    // Send final result
    sendSSE("complete", result);

    return result;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    const result: ScanResult = {
      id: scanId,
      projectId: config.projectId,
      projectName: config.projectName,
      sourceType: config.sourceType,
      sourceValue: config.sourceValue,
      tools: config.toolIds,
      status: errorMessage === "Scan cancelled" ? "cancelled" : "failed",
      startedAt,
      completedAt: new Date().toISOString(),
      findings: allFindings,
      riskScore: calculateRiskScore(allFindings),
      timeline,
      stdout: allStdout,
      stderr: [...allStderr, errorMessage],
      exitCode: 1,
    };

    sendSSE("error", { message: errorMessage, result });

    return result;
  } finally {
    activeScans.delete(scanId);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deduplicateFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.tool}:${f.title}:${f.asset}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function calculateRiskScore(findings: Finding[]): number {
  if (findings.length === 0) return 0;

  const severityWeights: Record<Severity, number> = {
    critical: 30,
    high: 20,
    medium: 10,
    low: 5,
    info: 1,
  };

  let totalWeight = 0;
  for (const f of findings) {
    totalWeight += severityWeights[f.severity] * (f.cvss / 10);
  }

  const maxPossible = findings.length * 30;
  return Math.min(100, Math.round((totalWeight / maxPossible) * 100 * 2));
}
