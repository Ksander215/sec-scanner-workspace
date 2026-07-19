/**
 * SIP Core Engine — Scanner Engine
 * Orchestrates tool execution: select source → build commands → run →
 * capture stdout/stderr → track progress → save log → parse results → Findings.
 *
 * Scanner no longer knows anything about individual tools.
 * It works only through the Runtime via plugin manifests.
 */

import type { Finding, ScanResult, TimelineEntry, Severity, PluginManifest } from "./types";
import { MANIFESTS_BY_ID, BUILTIN_TOOL_IDS } from "./plugins";
import { isInstalled, updateLastRun } from "./registry";
import { parseOutput } from "./parsers";

// ─── Scan Configuration ───────────────────────────────────────────────────

export interface ScanConfig {
  projectId: string;
  projectName: string;
  sourceType: "git" | "folder" | "docker" | "website" | "api";
  sourceValue: string;
  toolIds: string[];
}

// ─── Pipeline Stage ───────────────────────────────────────────────────────

export type StageType = "init" | "tool" | "correlate" | "graph" | "risk" | "paths" | "recommend" | "report";

export interface PipelineStage {
  id: string;
  label: { ru: string; en: string };
  description: { ru: string; en: string };
  type: StageType;
  toolId?: string;
  estimatedSec: number;
}

// ─── Progress callback ────────────────────────────────────────────────────

export interface StageProgress {
  stageIndex: number;
  stage: PipelineStage;
  status: "pending" | "running" | "completed";
  progress: number;          // 0-100
  stdout: string[];          // live output lines
  timestamp: string;
}

export type ProgressCallback = (update: StageProgress) => void;

// ─── Build pipeline stages from selected tools ────────────────────────────

export function buildPipelineStages(toolIds: string[], locale: "ru" | "en"): PipelineStage[] {
  const isEn = locale === "en";

  const stages: PipelineStage[] = [
    {
      id: "init",
      label: { ru: "Инициализация", en: "Initialize" },
      description: { ru: "Загрузка проекта, подготовка окружения, валидация цели", en: "Load project, prepare environment, validate target" },
      type: "init",
      estimatedSec: 3,
    },
  ];

  for (const toolId of toolIds) {
    const manifest = MANIFESTS_BY_ID[toolId];
    if (!manifest) continue;
    stages.push({
      id: `tool-${toolId}`,
      label: { ru: manifest.name, en: manifest.name },
      description: manifest.description,
      type: "tool",
      toolId,
      estimatedSec: 4 + Math.floor(Math.random() * 3),
    });
  }

  stages.push(
    {
      id: "correlate",
      label: { ru: "Корреляция", en: "Correlation" },
      description: { ru: "Сведение результатов всех сканеров, удаление дубликатов", en: "Merge results from all scanners, remove duplicates" },
      type: "correlate",
      estimatedSec: 3,
    },
    {
      id: "graph",
      label: { ru: "Граф знаний", en: "Knowledge Graph" },
      description: { ru: "Построение графа связей: активы → сервисы → уязвимости → CVE", en: "Build entity graph: assets → services → findings → CVEs" },
      type: "graph",
      estimatedSec: 4,
    },
    {
      id: "risk",
      label: { ru: "Оценка риска", en: "Risk Scoring" },
      description: { ru: "Расчёт оценок на основе CVSS, эксплуатируемости, критичности активов", en: "Compute scores based on CVSS, exploitability, asset criticality" },
      type: "risk",
      estimatedSec: 2,
    },
    {
      id: "paths",
      label: { ru: "Пути атак", en: "Attack Paths" },
      description: { ru: "Трассировка путей атак от внешних сервисов к критичным активам", en: "Trace attack paths from external services to critical assets" },
      type: "paths",
      estimatedSec: 3,
    },
    {
      id: "recommend",
      label: { ru: "Рекомендации", en: "Recommendations" },
      description: { ru: "Приоритизированные шаги по устранению с примерами кода", en: "Prioritized remediation steps with code examples" },
      type: "recommend",
      estimatedSec: 2,
    },
    {
      id: "report",
      label: { ru: "Отчёт", en: "Report" },
      description: { ru: "Компиляция результатов в структурированный отчёт", en: "Compile findings into a structured report" },
      type: "report",
      estimatedSec: 2,
    },
  );

  return stages;
}

// ─── Execute scan (simulated with real tool output parsing) ───────────────

export async function executeScan(
  config: ScanConfig,
  locale: "ru" | "en",
  onProgress: ProgressCallback,
): Promise<ScanResult> {
  const isEn = locale === "en";
  const stages = buildPipelineStages(config.toolIds, locale);
  const scanId = `SCAN-${String(Date.now()).slice(-6)}`;
  const startedAt = new Date().toISOString();
  const allFindings: Finding[] = [];
  const timeline: TimelineEntry[] = [];
  const allStdout: string[] = [];
  const allStderr: string[] = [];

  for (let stageIdx = 0; stageIdx < stages.length; stageIdx++) {
    const stage = stages[stageIdx];
    const stageStart = new Date();

    // Notify: stage running
    onProgress({
      stageIndex: stageIdx,
      stage,
      status: "running",
      progress: 0,
      stdout: [],
      timestamp: stageStart.toISOString(),
    });

    timeline.push({
      timestamp: stageStart.toISOString(),
      event: `${isEn ? "Started" : "Начат"}: ${stage.label[locale]}`,
      detail: stage.description[locale],
      tool: stage.toolId,
    });

    // Execute stage with progress updates
    const stageOutput = await executeStage(
      stage,
      config,
      locale,
      (progress, stdout) => {
        onProgress({
          stageIndex: stageIdx,
          stage,
          status: "running",
          progress,
          stdout,
          timestamp: new Date().toISOString(),
        });
      }
    );

    allStdout.push(...stageOutput.stdout);
    allStderr.push(...stageOutput.stderr);

    if (stage.type === "tool" && stage.toolId) {
      // Parse the tool's output into Findings
      const manifest = MANIFESTS_BY_ID[stage.toolId];
      if (manifest) {
        const toolFindings = parseOutput(stage.toolId, manifest.sampleRawOutput, config.sourceValue);
        allFindings.push(...toolFindings);
        updateLastRun(stage.toolId);
      }
    }

    // Notify: stage completed
    onProgress({
      stageIndex: stageIdx,
      stage,
      status: "completed",
      progress: 100,
      stdout: stageOutput.stdout.slice(-5),
      timestamp: new Date().toISOString(),
    });

    timeline.push({
      timestamp: new Date().toISOString(),
      event: `${isEn ? "Completed" : "Завершён"}: ${stage.label[locale]}`,
      detail: stage.type === "tool" && stage.toolId
        ? `${allFindings.filter(f => f.tool === stage.toolId).length} findings`
        : undefined,
      tool: stage.toolId,
    });
  }

  // Deduplicate findings
  const uniqueFindings = deduplicateFindings(allFindings);

  // Calculate risk score
  const riskScore = calculateRiskScore(uniqueFindings);

  return {
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
    exitCode: 0,
  };
}

// ─── Stage execution (simulated) ──────────────────────────────────────────

async function executeStage(
  stage: PipelineStage,
  config: ScanConfig,
  locale: "ru" | "en",
  onProgress: (progress: number, stdout: string[]) => void,
): Promise<{ stdout: string[]; stderr: string[] }> {
  const isEn = locale === "en";
  const stdout: string[] = [];
  const stderr: string[] = [];
  const duration = stage.estimatedSec * 1000;
  const steps = 10;
  const stepDuration = duration / steps;

  if (stage.type === "init") {
    stdout.push(`$ sip init --project "${config.projectName}"`);
    stdout.push(isEn ? "Loading project configuration..." : "Загрузка конфигурации проекта...");
    stdout.push(isEn ? `Target: ${config.sourceValue}` : `Цель: ${config.sourceValue}`);
    stdout.push(isEn ? `Source type: ${config.sourceType}` : `Тип источника: ${config.sourceType}`);
    stdout.push(isEn ? "Environment ready" : "Окружение готово");
  } else if (stage.type === "tool" && stage.toolId) {
    const manifest = MANIFESTS_BY_ID[stage.toolId];
    if (manifest) {
      const cmd = manifest.run.command.replace("{target}", config.sourceValue);
      stdout.push(`$ ${cmd}`);

      // Add sample output lines progressively
      const sampleLines = manifest.sampleOutput[locale];
      for (let i = 0; i < sampleLines.length; i++) {
        const progress = ((i + 1) / sampleLines.length) * 90;
        stdout.push(sampleLines[i]);
        onProgress(progress, [...stdout]);
        await delay(stepDuration / sampleLines.length);
      }
    }
  } else if (stage.type === "correlate") {
    stdout.push(isEn ? "Merging results from all scanners..." : "Сведение результатов всех сканеров...");
    stdout.push(isEn ? "4 duplicate findings merged" : "4 дубликата объединено");
    stdout.push(isEn ? "3 new correlations found" : "3 новые корреляции найдены");
    stdout.push(isEn ? "Unique findings identified" : "Уникальные находки определены");
  } else if (stage.type === "graph") {
    stdout.push(isEn ? "Building knowledge graph entities..." : "Построение сущностей графа знаний...");
    stdout.push(isEn ? "34 nodes created" : "34 узла создано");
    stdout.push(isEn ? "29 edges mapped" : "29 связей построено");
    stdout.push(isEn ? "3 critical paths identified" : "3 критических пути выявлено");
  } else if (stage.type === "risk") {
    stdout.push(isEn ? "Calculating risk scores..." : "Расчёт оценок рисков...");
    stdout.push(isEn ? "Overall risk: computed from CVSS + exploitability + asset criticality" : "Общий риск: расчёт по CVSS + эксплуатируемость + критичность активов");
    stdout.push(isEn ? "3 critical-risk assets" : "3 актива с критическим риском");
  } else if (stage.type === "paths") {
    stdout.push(isEn ? "Tracing attack paths..." : "Трассировка путей атак...");
    stdout.push(isEn ? "Path 1: SQLi → DB → Admin panel" : "Путь 1: SQLi → БД → Панель администратора");
    stdout.push(isEn ? "Path 2: XSS → Session hijack" : "Путь 2: XSS → Перехват сессии");
    stdout.push(isEn ? "Path 3: Exposed .git → Source code" : "Путь 3: Открытый .git → Исходный код");
  } else if (stage.type === "recommend") {
    stdout.push(isEn ? "Generating remediation steps..." : "Генерация шагов по устранению...");
    stdout.push(isEn ? "6 recommendations generated" : "6 рекомендаций сгенерировано");
    stdout.push(isEn ? "Top: Parameterize SQL queries" : "Приоритет: Параметризация SQL-запросов");
    stdout.push(isEn ? "Est. remediation: 4 hours" : "Примерное устранение: 4 часа");
  } else if (stage.type === "report") {
    stdout.push(isEn ? "Compiling final report..." : "Компиляция финального отчёта...");
    stdout.push(isEn ? "Executive summary: ready" : "Резюме для руководства: готово");
    stdout.push(isEn ? "Technical details: ready" : "Технические детали: готовы");
    stdout.push(isEn ? "Report compilation complete" : "Компиляция отчёта завершена");
  }

  // Simulate progress
  for (let i = 0; i <= steps; i++) {
    const progress = (i / steps) * 100;
    onProgress(progress, stdout);
    if (i < steps) await delay(stepDuration);
  }

  return { stdout, stderr };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deduplicateFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    // Dedupe by tool + title + asset combination
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

  // Normalize to 0-100
  const maxPossible = findings.length * 30; // all critical × cvss 10
  return Math.min(100, Math.round((totalWeight / maxPossible) * 100 * 2));
}

/** Get available tools (installed + built-in) */
export function getAvailableTools(): PluginManifest[] {
  return Object.values(MANIFESTS_BY_ID).filter((m) => {
    return BUILTIN_TOOL_IDS.has(m.id) || isInstalled(m.id);
  });
}

/** Get tools that could be installed from marketplace */
export function getMarketplaceAvailable(): PluginManifest[] {
  return Object.values(MANIFESTS_BY_ID).filter((m) => {
    return !BUILTIN_TOOL_IDS.has(m.id) && !isInstalled(m.id);
  });
}
