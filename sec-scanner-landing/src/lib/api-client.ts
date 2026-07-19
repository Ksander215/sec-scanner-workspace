/**
 * SIP API Client — Frontend-to-Backend Communication
 *
 * This module provides the interface between the SIP frontend (Next.js)
 * and the SIP Backend API Server (Express.js).
 *
 * When the backend is available, real tool execution happens server-side.
 * When the backend is unavailable, falls back to the client-side engine.
 */

import type {
  Finding,
  ScanResult,
  Project,
  PluginManifest,
  InstallStatus,
} from "./engine/types";
import type {
  ScanConfig,
  StageProgress,
} from "./engine/scanner";

// ─── Configuration ────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_SIP_API_URL || "http://localhost:3001/api";

let _backendAvailable: boolean | null = null;

/** Check if the backend API server is available */
export async function isBackendAvailable(): Promise<boolean> {
  if (_backendAvailable !== null) return _backendAvailable;

  try {
    const response = await fetch(`${API_BASE}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    _backendAvailable = response.ok;
  } catch {
    _backendAvailable = false;
  }

  return _backendAvailable;
}

/** Reset backend availability check */
export function resetBackendCheck(): void {
  _backendAvailable = null;
}

// ─── Scanner API ──────────────────────────────────────────────────────────

export interface ScanStartResponse {
  scanId: string;
  status: string;
  config: ScanConfig;
}

/** Start a scan via backend API */
export async function startScan(config: ScanConfig): Promise<ScanStartResponse> {
  const response = await fetch(`${API_BASE}/scans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/** Start a scan with SSE progress streaming */
export function startScanStream(
  config: ScanConfig,
  onInit: (data: { scanId: string }) => void,
  onStage: (progress: StageProgress) => void,
  onStdout: (data: { toolId: string; line: string; timestamp: string }) => void,
  onComplete: (result: ScanResult) => void,
  onError: (error: { message: string; result?: ScanResult }) => void,
): AbortController {
  const controller = new AbortController();

  // Use fetch with SSE via EventSource-like approach
  const startStream = async () => {
    try {
      const response = await fetch(`${API_BASE}/scans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        body: JSON.stringify(config),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        onError({ message: error.error || `HTTP ${response.status}` });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError({ message: "No response body" });
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEvent = "";
        let currentData = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            currentData = line.slice(6);
          } else if (line === "" && currentEvent && currentData) {
            // Complete event
            try {
              const parsed = JSON.parse(currentData);

              switch (currentEvent) {
                case "init":
                  onInit(parsed);
                  break;
                case "stage":
                  onStage(parsed);
                  break;
                case "stdout":
                  onStdout(parsed);
                  break;
                case "complete":
                  onComplete(parsed);
                  break;
                case "error":
                  onError(parsed);
                  break;
              }
            } catch (err) {
              console.warn("[SIP SSE] Parse error:", err);
            }

            currentEvent = "";
            currentData = "";
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        onError({ message: (err as Error).message });
      }
    }
  };

  startStream();
  return controller;
}

/** Get scan result */
export async function getScanResult(scanId: string): Promise<ScanResult> {
  const response = await fetch(`${API_BASE}/scans/${scanId}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** List scan results */
export async function listScans(): Promise<ScanResult[]> {
  const response = await fetch(`${API_BASE}/scans`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** Cancel a running scan */
export async function cancelScan(scanId: string): Promise<void> {
  await fetch(`${API_BASE}/scans/${scanId}/cancel`, { method: "POST" });
}

// ─── Plugin API ───────────────────────────────────────────────────────────

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description: { ru: string; en: string };
  category: string;
  outputFormat: string;
  cliCommand: string;
  isBuiltin: boolean;
  status: InstallStatus;
  installedAt?: string;
  lastRun?: string;
  health: string;
  versionInstalled?: string;
}

/** List all plugins with registry status */
export async function listPlugins(): Promise<PluginInfo[]> {
  const response = await fetch(`${API_BASE}/plugins`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** Install a plugin */
export async function installPluginApi(id: string): Promise<{ message: string; status: string; version?: string }> {
  const response = await fetch(`${API_BASE}/plugins/${id}/install`, { method: "POST" });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Install failed" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

/** Remove a plugin */
export async function removePluginApi(id: string): Promise<{ message: string; status: string }> {
  const response = await fetch(`${API_BASE}/plugins/${id}/remove`, { method: "POST" });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Remove failed" }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

/** Verify a plugin */
export async function verifyPluginApi(id: string): Promise<{ installed: boolean; version?: string }> {
  const response = await fetch(`${API_BASE}/plugins/${id}/verify`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** Check all tools on server */
export async function checkAllTools(): Promise<Record<string, { installed: boolean; version?: string }>> {
  const response = await fetch(`${API_BASE}/plugins/check-all`, { method: "POST" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// ─── Projects API ─────────────────────────────────────────────────────────

/** List projects */
export async function listProjects(): Promise<Project[]> {
  const response = await fetch(`${API_BASE}/projects`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** Get project */
export async function getProject(id: string): Promise<Project> {
  const response = await fetch(`${API_BASE}/projects/${id}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** Create project */
export async function createProject(name: string, description: string): Promise<Project> {
  const response = await fetch(`${API_BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** Update project */
export async function updateProject(id: string, data: Partial<Project>): Promise<Project> {
  const response = await fetch(`${API_BASE}/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** Delete project */
export async function deleteProject(id: string): Promise<void> {
  await fetch(`${API_BASE}/projects/${id}`, { method: "DELETE" });
}

/** Get project scans */
export async function getProjectScans(projectId: string): Promise<ScanResult[]> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/scans`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// ─── Analysis API ─────────────────────────────────────────────────────────

/** Build knowledge graph */
export async function buildKnowledgeGraph(findings?: Finding[], scanId?: string) {
  const url = scanId
    ? `${API_BASE}/analysis/knowledge-graph/${scanId}`
    : `${API_BASE}/analysis/knowledge-graph`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ findings }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** Build attack paths */
export async function buildAttackPaths(findings?: Finding[], scanId?: string) {
  const url = scanId
    ? `${API_BASE}/analysis/attack-paths/${scanId}`
    : `${API_BASE}/analysis/attack-paths`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ findings }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** Generate recommendations */
export async function generateRecommendations(findings?: Finding[], scanId?: string) {
  const url = scanId
    ? `${API_BASE}/analysis/recommendations/${scanId}`
    : `${API_BASE}/analysis/recommendations`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ findings }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

/** Generate report */
export async function generateReport(
  type: "executive" | "technical" | "compliance",
  format: "json" | "sarif" | "markdown" | "csv" | "html",
  findings?: Finding[],
  riskScore?: number,
  projectName?: string,
  scanId?: string,
) {
  const url = scanId
    ? `${API_BASE}/analysis/report/${scanId}`
    : `${API_BASE}/analysis/report`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, format, findings, riskScore, projectName }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text(); // Returns raw text (JSON, Markdown, CSV, HTML, or SARIF)
}

/** Get latest findings */
export async function getLatestFindings(): Promise<Finding[]> {
  const response = await fetch(`${API_BASE}/analysis/findings/latest`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

// ─── Health ───────────────────────────────────────────────────────────────

export interface HealthResponse {
  status: string;
  version: string;
  uptime: number;
  tools: Record<string, { installed: boolean; version?: string }>;
  timestamp: string;
}

/** Get server health */
export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
