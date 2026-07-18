"use client";

import { useState, useCallback, useEffect } from "react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Play,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Loader2,
  FolderPlus,
  GitBranch,
  Folder,
  Globe,
  Shield,
  ShieldCheck,
  XCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  Store,
  BookOpen,
  Clock,
  BarChart3,
  Zap,
  Radio,
  FileText,
  ArrowRight,
  Plus,
  History,
  RefreshCw,
  Terminal,
  ShieldAlert,
} from "lucide-react";
import { demoFindings, pipelineStages, type PipelineStage, type Severity } from "@/lib/demo-data";
import { demoProjects as portalProjects, type Project } from "@/lib/portal-data";
import { useI18n } from "@/lib/i18n-context";
import { getMarketplaceInstalled, MARKETPLACE_TO_SCANNER, SCANNER_PLUGIN_IDS } from "@/lib/utils";

// ─── Severity helpers ───────────────────────────────────────────────────

const severityIcon: Record<Severity, React.ReactNode> = {
  critical: <XCircle className="w-4 h-4 text-red" />,
  high: <AlertTriangle className="w-4 h-4 text-amber" />,
  medium: <AlertTriangle className="w-4 h-4 text-amber" />,
  low: <Info className="w-4 h-4 text-accent" />,
  info: <Info className="w-4 h-4 text-cyan" />,
};

const severityColors: Record<Severity, string> = {
  critical: "text-red",
  high: "text-amber",
  medium: "text-amber",
  low: "text-accent",
  info: "text-cyan",
};

const severityBg: Record<Severity, string> = {
  critical: "bg-red-muted border-red/20",
  high: "bg-amber-muted border-amber/20",
  medium: "bg-amber-muted border-amber/20",
  low: "bg-accent-muted border-accent/20",
  info: "bg-cyan-muted border-cyan/20",
};

// ─── Scan Tool definition ───────────────────────────────────────────────

interface ScanTool {
  id: string;
  name: string;
  description: { ru: string; en: string };
  installed: boolean;
  inDevelopment?: boolean;
  category: "network" | "web" | "container" | "code" | "api";
  cliCommand: string;
  sampleOutput: { ru: string[]; en: string[] };
}

const scanTools: ScanTool[] = [
  {
    id: "nmap",
    name: "Nmap",
    description: { ru: "Сетевой сканер портов и сервисов", en: "Network port and service scanner" },
    installed: true,
    category: "network",
    cliCommand: "sip scan --engine nmap --target {target} --ports top-1000",
    sampleOutput: {
      ru: ["nmap: Сканирование портов...", "22/tcp  open  ssh     OpenSSH 8.9", "80/tcp  open  http    nginx 1.24", "443/tcp open  https   nginx 1.24", "3306/tcp open  mysql  MySQL 8.0.35", "Обнаружено 4 открытых порта"],
      en: ["nmap: Scanning ports...", "22/tcp  open  ssh     OpenSSH 8.9", "80/tcp  open  http    nginx 1.24", "443/tcp open  https   nginx 1.24", "3306/tcp open  mysql  MySQL 8.0.35", "4 open ports found"],
    },
  },
  {
    id: "nuclei",
    name: "Nuclei",
    description: { ru: "Сканер уязвимостей на основе шаблонов", en: "Template-based vulnerability scanner" },
    installed: true,
    category: "web",
    cliCommand: "sip scan --engine nuclei --target {target} --templates cves,vulnerabilities",
    sampleOutput: {
      ru: ["nuclei: Загрузка 6841 шаблонов...", "[CVE-2024-23956] SQL Injection в /api/v1/users [critical]", "[CVE-2024-11234] XSS в /search [high]", "[misconfig] Отсутствуют заголовки безопасности [medium]", "3 уязвимости обнаружено (1 critical, 1 high, 1 medium)"],
      en: ["nuclei: Loading 6841 templates...", "[CVE-2024-23956] SQL Injection at /api/v1/users [critical]", "[CVE-2024-11234] XSS at /search [high]", "[misconfig] Missing security headers [medium]", "3 vulnerabilities found (1 critical, 1 high, 1 medium)"],
    },
  },
  {
    id: "trivy",
    name: "Trivy",
    description: { ru: "Сканер контейнеров и зависимостей", en: "Container and dependency scanner" },
    installed: true,
    category: "container",
    cliCommand: "sip scan --engine trivy --target {target} --severity CRITICAL,HIGH",
    sampleOutput: {
      ru: ["trivy: Анализ зависимостей и образов...", "CVE-2024-21626 (runc) — CRITICAL — CVSS 9.8", "CVE-2024-23652 (buildkit) — HIGH — CVSS 7.5", "npm/lodash <4.17.21 — Prototype Pollution", "3 уязвимости в зависимостях, 2 в контейнере"],
      en: ["trivy: Analyzing dependencies and images...", "CVE-2024-21626 (runc) — CRITICAL — CVSS 9.8", "CVE-2024-23652 (buildkit) — HIGH — CVSS 7.5", "npm/lodash <4.17.21 — Prototype Pollution", "3 dependency vulnerabilities, 2 container vulnerabilities"],
    },
  },
  {
    id: "owasp-zap",
    name: "OWASP ZAP",
    description: { ru: "Веб-сканер безопасности приложений (DAST)", en: "Web application security scanner (DAST)" },
    installed: false,
    inDevelopment: true,
    category: "web",
    cliCommand: "sip scan --engine zap --target {target} --mode active",
    sampleOutput: {
      ru: ["zap: Активное сканирование...", "SQL Injection подтверждён в /api/v1/users", "Cross-Site Scripting в /search", "Небезопасные Cookie-флаги"],
      en: ["zap: Active scanning...", "SQL Injection confirmed at /api/v1/users", "Cross-Site Scripting at /search", "Insecure cookie flags detected"],
    },
  },
  {
    id: "semgrep",
    name: "Semgrep",
    description: { ru: "Статический анализатор кода (SAST)", en: "Static code analyzer (SAST)" },
    installed: false,
    inDevelopment: true,
    category: "code",
    cliCommand: "sip scan --engine semgrep --target {target} --config auto",
    sampleOutput: {
      ru: ["semgrep: Статический анализ кода...", "sql-injection: Параметр 'id' в SQL-запросе", "xss-reflected: Несанитизированный вывод в /search", "hardcoded-secret: API-ключ в config.py"],
      en: ["semgrep: Static code analysis...", "sql-injection: 'id' param in SQL query", "xss-reflected: Unsanitized output in /search", "hardcoded-secret: API key in config.py"],
    },
  },
  {
    id: "nikto",
    name: "Nikto",
    description: { ru: "Сканер веб-серверов", en: "Web server scanner" },
    installed: false,
    inDevelopment: true,
    category: "web",
    cliCommand: "sip scan --engine nikto --target {target} --tuning 123",
    sampleOutput: {
      ru: ["nikto: Сканирование веб-сервера...", "Server: nginx/1.24.0 — устаревшая версия", "/.git/ — обнаружен Git-репозиторий", "/admin — панель администратора доступна"],
      en: ["nikto: Web server scanning...", "Server: nginx/1.24.0 — outdated version", "/.git/ — Git repository exposed", "/admin — admin panel accessible"],
    },
  },
];

// ─── Data Source options ────────────────────────────────────────────────

interface DataSourceOption {
  id: string;
  name: { ru: string; en: string };
  description: { ru: string; en: string };
  icon: React.ElementType;
  placeholder: { ru: string; en: string };
  color: string;
}

const dataSources: DataSourceOption[] = [
  { id: "git", name: { ru: "Git-репозиторий", en: "Git Repository" }, description: { ru: "Клонировать и просканировать репозиторий", en: "Clone and scan a repository" }, icon: GitBranch, placeholder: { ru: "https://github.com/company/project", en: "https://github.com/company/project" }, color: "text-purple" },
  { id: "folder", name: { ru: "Локальная папка", en: "Local Folder" }, description: { ru: "Указать путь к папке на сервере", en: "Specify a folder path on the server" }, icon: Folder, placeholder: { ru: "/var/www/project", en: "/var/www/project" }, color: "text-amber" },
  { id: "docker", name: { ru: "Docker-образ", en: "Docker Image" }, description: { ru: "Просканировать Docker-образ на уязвимости", en: "Scan a Docker image for vulnerabilities" }, icon: Globe, placeholder: { ru: "nginx:latest", en: "nginx:latest" }, color: "text-cyan" },
  { id: "website", name: { ru: "Веб-сайт / API", en: "Website / API" }, description: { ru: "Указать URL для сканирования", en: "Specify a URL to scan" }, icon: Globe, placeholder: { ru: "https://example.com", en: "https://example.com" }, color: "text-accent" },
  { id: "api", name: { ru: "API-эндпоинт", en: "API Endpoint" }, description: { ru: "Указать API для тестирования", en: "Specify an API to test" }, icon: Radio, placeholder: { ru: "https://api.example.com/v1", en: "https://api.example.com/v1" }, color: "text-amber" },
];

// ─── Scan History (localStorage) ────────────────────────────────────────

interface ScanRecord {
  id: string;
  projectName: string;
  sourceType: string;
  sourceValue: string;
  tools: string[];
  startedAt: string;
  completedAt: string;
  findingsCount: number;
  riskScore: number;
  status: "completed" | "running";
}

const HISTORY_KEY = "sip_scan_history";

function loadHistory(): ScanRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(records: ScanRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(records.slice(0, 20)));
}

// ─── Dynamic pipeline stage builder ─────────────────────────────────────

interface DynamicStage {
  id: string;
  label: { ru: string; en: string };
  description: { ru: string; en: string };
  type: "init" | "tool" | "correlate" | "graph" | "risk" | "paths" | "recommend" | "report";
  toolId?: string;
  estimatedSec: number;
}

function buildStages(tools: Set<string>, isEn: boolean, toolDefs: ScanTool[]): DynamicStage[] {
  const stages: DynamicStage[] = [
    {
      id: "init",
      label: { ru: "Инициализация", en: "Initialize" },
      description: { ru: "Загрузка проекта, подготовка окружения, валидация цели", en: "Load project, prepare environment, validate target" },
      type: "init",
      estimatedSec: 3,
    },
  ];

  const selectedTools = Array.from(tools);
  for (const toolId of selectedTools) {
    const tool = toolDefs.find(t => t.id === toolId);
    if (!tool) continue;
    stages.push({
      id: `tool-${toolId}`,
      label: { ru: tool.name, en: tool.name },
      description: { ru: tool.description.ru, en: tool.description.en },
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

// ─── Pipeline stage component ───────────────────────────────────────────

function PipelineStageCard({
  stage,
  index,
  status,
  progress,
  outputs,
  isLast,
  isEn,
}: {
  stage: DynamicStage;
  index: number;
  status: "pending" | "running" | "completed";
  progress: number;
  outputs: string[];
  isLast: boolean;
  isEn: boolean;
}) {
  const stageIcon: Record<string, React.ReactNode> = {
    init: <Zap className="w-4 h-4" />,
    tool: <Terminal className="w-4 h-4" />,
    correlate: <RefreshCw className="w-4 h-4" />,
    graph: <ShieldCheck className="w-4 h-4" />,
    risk: <BarChart3 className="w-4 h-4" />,
    paths: <AlertTriangle className="w-4 h-4" />,
    recommend: <BookOpen className="w-4 h-4" />,
    report: <FileText className="w-4 h-4" />,
  };

  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
          status === "running" ? "bg-accent text-background" : status === "completed" ? "bg-accent/20 text-accent" : "bg-surface-2 text-muted border border-border"
        }`}>
          {status === "completed" ? <CheckCircle2 className="w-4 h-4" /> : status === "running" ? <Loader2 className="w-4 h-4 animate-spin" /> : stageIcon[stage.type] || index + 1}
        </div>
        {!isLast && (
          <div className={`w-0.5 h-6 mt-1 transition-colors duration-300 ${status === "completed" ? "bg-accent/40" : "bg-border"}`} />
        )}
      </div>

      <div className={`flex-1 p-3 rounded-lg transition-all duration-300 ${
        status === "running" ? "bg-accent-muted border border-accent/30" : status === "completed" ? "bg-surface border border-border" : "bg-surface/50 border border-border/50 opacity-50"
      }`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-medium ${status === "running" ? "text-accent" : status === "completed" ? "text-foreground" : "text-muted"}`}>
            {stage.label[isEn ? "en" : "ru"]}
          </span>
          {status === "running" && <span className="text-xs text-accent font-mono">{Math.round(progress)}%</span>}
          {status === "completed" && <span className="text-xs text-accent/60">✓</span>}
        </div>
        <p className="text-xs text-muted-2">{stage.description[isEn ? "en" : "ru"]}</p>
        {status === "running" && (
          <div className="mt-2 h-1 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
          </div>
        )}
        {outputs.length > 0 && (
          <div className="mt-2 font-mono text-[11px] text-accent/70 space-y-0.5 bg-surface-2/50 rounded px-2 py-1.5">
            {outputs.map((line, i) => <div key={i}>{line}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Project status badge ───────────────────────────────────────────────

function projectStatusBadge(status: Project["status"], isEn: boolean) {
  const map: Record<string, { label: string; color: string }> = {
    healthy: { label: isEn ? "Healthy" : "Здоров", color: "bg-accent-muted text-accent border-accent/20" },
    warning: { label: isEn ? "Warning" : "Внимание", color: "bg-amber-muted text-amber border-amber/20" },
    critical: { label: isEn ? "Critical" : "Критично", color: "bg-red-muted text-red border-red/20" },
    idle: { label: isEn ? "Idle" : "Неактивен", color: "bg-surface-2 text-muted-2 border-border" },
  };
  const info = map[status] || map.idle;
  return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${info.color}`}>{info.label}</span>;
}

// ─── Main component ─────────────────────────────────────────────────────

export default function ScannerPage() {
  const { locale } = useI18n();
  const isEn = locale === "en";

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [sourceValue, setSourceValue] = useState("");
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set(["nmap", "nuclei", "trivy"]));
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineComplete, setPipelineComplete] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [stageProgress, setStageProgress] = useState<Record<number, number>>({});
  const [stageOutputs, setStageOutputs] = useState<Record<number, string[]>>({});
  const [activeResultTab, setActiveResultTab] = useState<"pipeline" | "findings" | "next">("pipeline");
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [marketplaceInstalled, setMarketplaceInstalled] = useState<Set<string>>(new Set());

  // Load marketplace installed state
  useEffect(() => {
    setMarketplaceInstalled(getMarketplaceInstalled());
    // Listen for storage changes (when user installs in another tab)
    const handler = () => setMarketplaceInstalled(getMarketplaceInstalled());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // Build full tool list: built-in + marketplace-installed scanner plugins
  const allScanTools: ScanTool[] = [
    ...scanTools,
    ...Object.entries(MARKETPLACE_TO_SCANNER)
      .filter(([mplId]) => marketplaceInstalled.has(mplId))
      .map(([mplId, def]) => ({
        id: def.id,
        name: def.name,
        description: def.description,
        installed: true,
        category: def.category as ScanTool["category"],
        cliCommand: def.cliCommand,
        sampleOutput: def.sampleOutput,
      })),
  ];

  // Marketplace scanner plugins that are NOT yet installed
  const availableInMarketplace = Object.entries(MARKETPLACE_TO_SCANNER)
    .filter(([mplId]) => !marketplaceInstalled.has(mplId))
    .map(([mplId, def]) => def);
  const [dynamicStages, setDynamicStages] = useState<DynamicStage[]>([]);

  // Load scan history on mount
  useEffect(() => {
    setScanHistory(loadHistory());
  }, []);

  const step1Valid = selectedProject !== null || newProjectName.trim().length > 0;
  const step2Valid = selectedSource !== null && sourceValue.trim().length > 0;
  const step3Valid = selectedTools.size > 0;

  const toggleTool = (id: string) => {
    setSelectedTools(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const projectName = newProjectName.trim() || portalProjects.find(p => p.id === selectedProject)?.name || (isEn ? "New Project" : "Новый проект");

  const runPipeline = useCallback(() => {
    const stages = buildStages(selectedTools, isEn, allScanTools);
    setDynamicStages(stages);
    setStep(4);
    setPipelineRunning(true);
    setPipelineComplete(false);
    setCurrentStage(0);
    setStageProgress({});
    setStageOutputs({});
    setActiveResultTab("pipeline");

    const selectedToolArr = Array.from(selectedTools);
    let stageIdx = 0;
    const totalStages = stages.length;

    const scanId = `SCAN-${String(Date.now()).slice(-6)}`;
    const startTime = new Date().toISOString();

    const advanceStage = () => {
      if (stageIdx >= totalStages) {
        setPipelineRunning(false);
        setPipelineComplete(true);
        setActiveResultTab("next");

        // Save to history
        const record: ScanRecord = {
          id: scanId,
          projectName,
          sourceType: selectedSource || "unknown",
          sourceValue: sourceValue || "demo",
          tools: selectedToolArr,
          startedAt: startTime,
          completedAt: new Date().toISOString(),
          findingsCount: demoFindings.length,
          riskScore: 78,
          status: "completed",
        };
        const updated = [record, ...loadHistory()].slice(0, 20);
        saveHistory(updated);
        setScanHistory(updated);
        return;
      }

      setCurrentStage(stageIdx);
      let progress = 0;
      const stage = stages[stageIdx];

      // Set initial output based on stage type
      if (stage.type === "init") {
        setStageOutputs(prev => ({ ...prev, [stageIdx]: [
          `$ sip init --project "${projectName}"`,
          isEn ? "Loading project configuration..." : "Загрузка конфигурации проекта...",
          isEn ? `Target: ${sourceValue || "demo"}` : `Цель: ${sourceValue || "demo"}`,
        ] }));
      } else if (stage.type === "tool" && stage.toolId) {
        const tool = allScanTools.find(t => t.id === stage.toolId);
        if (tool) {
          const cmd = tool.cliCommand.replace("{target}", sourceValue || "demo-target");
          setStageOutputs(prev => ({ ...prev, [stageIdx]: [`$ ${cmd}`] }));
        }
      } else if (stage.type === "correlate") {
        setStageOutputs(prev => ({ ...prev, [stageIdx]: [isEn ? "Merging results from all scanners..." : "Сведение результатов всех сканеров..."] }));
      } else if (stage.type === "graph") {
        setStageOutputs(prev => ({ ...prev, [stageIdx]: [isEn ? "Building knowledge graph entities..." : "Построение сущностей графа знаний..."] }));
      } else if (stage.type === "risk") {
        setStageOutputs(prev => ({ ...prev, [stageIdx]: [isEn ? "Calculating risk scores..." : "Расчёт оценок рисков..."] }));
      } else if (stage.type === "paths") {
        setStageOutputs(prev => ({ ...prev, [stageIdx]: [isEn ? "Tracing attack paths..." : "Трассировка путей атак..."] }));
      } else if (stage.type === "recommend") {
        setStageOutputs(prev => ({ ...prev, [stageIdx]: [isEn ? "Generating remediation steps..." : "Генерация шагов по устранению..."] }));
      } else if (stage.type === "report") {
        setStageOutputs(prev => ({ ...prev, [stageIdx]: [isEn ? "Compiling final report..." : "Компиляция финального отчёта..."] }));
      }

      const progressInterval = setInterval(() => {
        progress += Math.random() * 18 + 5;
        if (progress >= 100) {
          progress = 100;
          clearInterval(progressInterval);
          setStageProgress(prev => ({ ...prev, [stageIdx]: 100 }));
          setTimeout(() => { stageIdx++; advanceStage(); }, 300);
        } else {
          setStageProgress(prev => ({ ...prev, [stageIdx]: progress }));

          // Add tool-specific or stage-specific output lines
          if (Math.random() > 0.5) {
            setStageOutputs(prev => {
              const existing = prev[stageIdx] || [];
              let newLine = "";

              if (stage.type === "tool" && stage.toolId) {
                const tool = allScanTools.find(t => t.id === stage.toolId);
                if (tool) {
                  const outputs = tool.sampleOutput[isEn ? "en" : "ru"];
                  newLine = outputs[Math.min(existing.length - 1, outputs.length - 1)] || outputs[outputs.length - 1];
                }
              } else {
                const genericLines = stage.type === "correlate"
                  ? [isEn ? "4 duplicate findings merged" : "4 дубликата объединено", isEn ? "3 new correlations found" : "3 новые корреляции найдены", isEn ? "Unique findings: 8" : "Уникальных находок: 8"]
                  : stage.type === "graph"
                  ? [isEn ? "34 nodes created" : "34 узла создано", isEn ? "29 edges mapped" : "29 связей построено", isEn ? "3 critical paths identified" : "3 критических пути выявлено"]
                  : stage.type === "risk"
                  ? [isEn ? "Overall risk: 78/100 (HIGH)" : "Общий риск: 78/100 (ВЫСОКИЙ)", isEn ? "3 critical-risk assets" : "3 актива с критическим риском", isEn ? "CVSS avg: 7.2" : "CVSS среднее: 7.2"]
                  : stage.type === "paths"
                  ? [isEn ? "Path 1: SQLi → DB → Admin panel" : "Путь 1: SQLi → БД → Панель администратора", isEn ? "Path 2: XSS → Session hijack" : "Путь 2: XSS → Перехват сессии", isEn ? "Path 3: Exposed .git → Source code" : "Путь 3: Открытый .git → Исходный код"]
                  : stage.type === "recommend"
                  ? [isEn ? "6 recommendations generated" : "6 рекомендаций сгенерировано", isEn ? "Top: Parameterize SQL queries" : "Приоритет: Параметризация SQL-запросов", isEn ? "Est. remediation: 4 hours" : "Примерное устранение: 4 часа"]
                  : stage.type === "report"
                  ? [isEn ? "Executive summary: ready" : "Резюме для руководства: готово", isEn ? "Technical details: ready" : "Технические детали: готовы", isEn ? "8 findings, 3 attack paths" : "8 находок, 3 пути атак"]
                  : [isEn ? "Processing..." : "Обработка..."];
                newLine = genericLines[Math.floor(Math.random() * genericLines.length)];
              }

              return { ...prev, [stageIdx]: [...existing.slice(-4), newLine] };
            });
          }
        }
      }, 120);
    };

    advanceStage();
  }, [selectedTools, sourceValue, isEn, selectedSource, projectName]);

  const steps = [
    { num: 1, label: isEn ? "Project" : "Проект", icon: FolderPlus },
    { num: 2, label: isEn ? "Source" : "Источник", icon: Globe },
    { num: 3, label: isEn ? "Tools" : "Инструменты", icon: Shield },
    { num: 4, label: isEn ? "Run" : "Запуск", icon: Play },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent" />
                {isEn ? "Scanner" : "Сканер"}
              </h1>
              <p className="text-sm text-muted-2 mt-1">
                {isEn ? "Configure and run security scans" : "Настройте и запустите сканирование безопасности"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {scanHistory.length > 0 && (
                <button onClick={() => setShowHistory(!showHistory)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-2 text-muted-2 hover:text-foreground border border-border transition-colors">
                  <History className="w-3.5 h-3.5" />
                  {isEn ? `History (${scanHistory.length})` : `История (${scanHistory.length})`}
                </button>
              )}
              <div className="hidden sm:flex items-center gap-1">
                {steps.map((s, i) => (
                  <div key={s.num} className="flex items-center">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      step === s.num ? "bg-accent text-background" : step > s.num ? "bg-accent/20 text-accent" : "bg-surface-2 text-muted-2"
                    }`}>
                      {step > s.num ? <CheckCircle2 className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                      {s.label}
                    </div>
                    {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-muted mx-0.5" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Container className="py-6 max-w-5xl">
        {/* Scan History Panel */}
        {showHistory && scanHistory.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-surface border border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <History className="w-4 h-4 text-accent" />
                {isEn ? "Recent Scans" : "Недавние сканирования"}
              </h3>
              <button onClick={() => { saveHistory([]); setScanHistory([]); setShowHistory(false); }}
                className="text-xs text-muted-2 hover:text-red transition-colors">
                {isEn ? "Clear" : "Очистить"}
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {scanHistory.map((rec) => (
                <div key={rec.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-2 border border-border text-xs">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">{rec.projectName}</div>
                    <div className="text-muted-2 truncate">{rec.sourceValue} · {rec.tools.join(", ")}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-accent">{rec.riskScore}/100</div>
                    <div className="text-muted-2">{rec.findingsCount} {isEn ? "findings" : "находок"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 1 — Project Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">{isEn ? "Select a project" : "Выберите проект"}</h2>
              <p className="text-sm text-muted-2">{isEn ? "Choose an existing project or create a new one. Each project groups assets, scans, and findings." : "Выберите существующий проект или создайте новый. Каждый проект объединяет активы, сканирования и находки."}</p>
            </div>

            {/* Real projects from portal-data */}
            <div className="space-y-2">
              {portalProjects.map((project) => {
                const isSelected = selectedProject === project.id;
                return (
                  <button key={project.id} onClick={() => { setSelectedProject(project.id); setNewProjectName(""); }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                      isSelected ? "border-accent/50 bg-accent-muted" : "border-border hover:border-border-light bg-surface"
                    }`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? "bg-accent text-background" : "bg-surface-2 text-muted-2"}`}>
                      <FolderPlus className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{project.name}</span>
                        {projectStatusBadge(project.status, isEn)}
                      </div>
                      <div className="text-xs text-muted-2 mt-0.5">
                        {isEn ? `${project.assets} assets · Score: ${project.securityScore}/100 · Last scan: ${project.lastScan}` : `${project.assets} активов · Оценка: ${project.securityScore}/100 · Последнее: ${project.lastScan}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-12 h-12 relative">
                        <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" className="text-border" strokeWidth="3" />
                          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor"
                            className={project.securityScore >= 80 ? "text-accent" : project.securityScore >= 60 ? "text-amber" : "text-red"}
                            strokeWidth="3" strokeDasharray={`${project.securityScore}, 100`} />
                        </svg>
                        <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${
                          project.securityScore >= 80 ? "text-accent" : project.securityScore >= 60 ? "text-amber" : "text-red"
                        }`}>{project.securityScore}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-accent" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-2">{isEn ? "or create new" : "или создайте новый"}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${newProjectName.trim() ? "border-accent/50 bg-accent-muted" : "border-border bg-surface"}`}>
              <Plus className="w-5 h-5 text-muted-2 shrink-0" />
              <input type="text" value={newProjectName} onChange={(e) => { setNewProjectName(e.target.value); setSelectedProject(null); }}
                placeholder={isEn ? "New project name..." : "Название нового проекта..."}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none" />
            </div>

            {/* Next-step hint */}
            <div className="p-3 rounded-lg bg-cyan-muted border border-cyan/20 flex items-start gap-2.5 text-sm">
              <ArrowRight className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
              <span className="text-muted-2">
                {isEn
                  ? "After selecting a project, you'll choose a data source — where SIP should scan."
                  : "После выбора проекта вы укажете источник данных — откуда SIP будет собирать информацию."}
              </span>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!step1Valid}>{isEn ? "Next" : "Далее"} <ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}

        {/* STEP 2 — Data Source */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">{isEn ? "Data source" : "Источник данных"}</h2>
              <p className="text-sm text-muted-2">{isEn ? "Where should SIP scan? The source type determines which tools can be used." : "Откуда SIP будет собирать данные? Тип источника определяет доступные инструменты."}</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {dataSources.map((source) => {
                const Icon = source.icon;
                const isSelected = selectedSource === source.id;
                return (
                  <button key={source.id} onClick={() => setSelectedSource(source.id)}
                    className={`flex items-start gap-3 p-4 rounded-xl border transition-all text-left ${
                      isSelected ? "border-accent/50 bg-accent-muted" : "border-border hover:border-border-light bg-surface"
                    }`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-accent text-background" : "bg-surface-2 text-muted-2"}`}>
                      <Icon className={`w-5 h-5 ${!isSelected ? source.color : ""}`} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">{source.name[locale]}</div>
                      <div className="text-xs text-muted-2 mt-0.5">{source.description[locale]}</div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-accent shrink-0 ml-auto" />}
                  </button>
                );
              })}
            </div>
            {selectedSource && (
              <div className="p-4 rounded-xl border border-border bg-surface">
                <label className="text-sm font-medium text-foreground mb-2 block">{isEn ? "Target" : "Цель"}</label>
                <input type="text" value={sourceValue} onChange={(e) => setSourceValue(e.target.value)}
                  placeholder={dataSources.find(s => s.id === selectedSource)?.placeholder[locale]}
                  className="w-full px-3 py-2.5 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/40 font-mono" />
                <p className="text-xs text-muted-2 mt-2">
                  {selectedSource === "website" && (isEn ? "SIP will scan the specified URL and its subpaths for vulnerabilities." : "SIP просканирует указанный URL и его подпути на уязвимости.")}
                  {selectedSource === "git" && (isEn ? "SIP will clone the repository and analyze its contents for security issues." : "SIP склонирует репозиторий и проанализирует его содержимое на проблемы безопасности.")}
                  {selectedSource === "docker" && (isEn ? "SIP will pull and scan the Docker image for known CVEs and misconfigurations." : "SIP загрузит и просканирует Docker-образ на известные CVE и ошибки конфигурации.")}
                  {selectedSource === "folder" && (isEn ? "SIP will scan the specified folder on the server for code and config issues." : "SIP просканирует указанную папку на сервере на проблемы в коде и конфигурации.")}
                  {selectedSource === "api" && (isEn ? "SIP will test the API endpoint for common vulnerabilities (BOLA, injection, auth bypass)." : "SIP протестирует API-эндпоинт на типичные уязвимости (BOLA, инъекции, обход авторизации).")}
                </p>
              </div>
            )}

            {/* Next-step hint */}
            <div className="p-3 rounded-lg bg-cyan-muted border border-cyan/20 flex items-start gap-2.5 text-sm">
              <ArrowRight className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
              <span className="text-muted-2">
                {isEn
                  ? "Next you'll select which scanning engines to run. More tools = deeper analysis."
                  : "Далее вы выберете движки сканирования. Больше инструментов = глубже анализ."}
              </span>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="w-4 h-4" /> {isEn ? "Back" : "Назад"}</Button>
              <Button onClick={() => setStep(3)} disabled={!step2Valid}>{isEn ? "Next" : "Далее"} <ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}

        {/* STEP 3 — Tool Selection */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">{isEn ? "Select scan tools" : "Выберите инструменты"}</h2>
              <p className="text-sm text-muted-2">{isEn ? "Choose which engines will run. Each tool covers a different attack surface." : "Выберите движки для сканирования. Каждый инструмент покрывает свою поверхность атаки."}</p>
            </div>

            {/* Installed tools */}
            <div>
              <div className="text-xs font-medium text-accent uppercase tracking-wider mb-2">{isEn ? "Installed" : "Установлены"}</div>
              <div className="space-y-2">
                {allScanTools.filter(t => t.installed).map((tool) => {
                  const isSelected = selectedTools.has(tool.id);
                  const fromMarketplace = !scanTools.find(st => st.id === tool.id);
                  return (
                    <button key={tool.id} onClick={() => toggleTool(tool.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                        isSelected ? "border-accent/50 bg-accent-muted" : "border-border hover:border-border-light bg-surface"
                      }`}>
                      <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-all ${
                        isSelected ? "border-accent bg-accent" : "border-muted-2"
                      }`}>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-background" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{tool.name}</span>
                          <Badge variant="default" className="text-[10px]">{tool.category.toUpperCase()}</Badge>
                          {fromMarketplace && <Badge variant="default" className="text-[10px] text-cyan">{isEn ? "Marketplace" : "Каталог"}</Badge>}
                        </div>
                        <div className="text-xs text-muted-2 mt-0.5">{tool.description[locale]}</div>
                        <div className="text-[10px] text-muted mt-1 font-mono">{tool.cliCommand}</div>
                      </div>
                      <div className="text-xs text-accent shrink-0">{isEn ? "Available" : "Доступен"}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Not yet available built-in tools */}
            {scanTools.filter(t => t.inDevelopment).length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-2 uppercase tracking-wider mb-2">{isEn ? "Coming Soon" : "Скоро"}</div>
                <div className="space-y-2">
                  {scanTools.filter(t => t.inDevelopment).map((tool) => {
                    return (
                      <button key={tool.id} disabled
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left opacity-60 cursor-not-allowed ${
                          "border-border bg-surface/50"
                        }`}>
                        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 border-border" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{tool.name}</span>
                            <Badge variant="default" className="text-[10px]">{isEn ? "Coming soon" : "Скоро"}</Badge>
                            <Badge variant="default" className="text-[10px]">{tool.category.toUpperCase()}</Badge>
                          </div>
                          <div className="text-xs text-muted-2 mt-0.5">{tool.description[locale]}</div>
                        </div>
                        <div className="text-xs text-muted-2 shrink-0">{isEn ? "Not available" : "Недоступен"}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available marketplace scanner plugins (not yet installed) */}
            {availableInMarketplace.length > 0 && (
              <div>
                <div className="text-xs font-medium text-cyan uppercase tracking-wider mb-2">{isEn ? "Available in Marketplace" : "Доступны в Каталоге"}</div>
                <div className="space-y-2">
                  {availableInMarketplace.map((def) => (
                    <div key={def.id} className="flex items-center gap-4 p-4 rounded-xl border border-cyan/20 bg-cyan-muted/30">
                      <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 border-cyan/30">
                        <Store className="w-3.5 h-3.5 text-cyan" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{def.name}</span>
                          <Badge variant="default" className="text-[10px]">{def.category.toUpperCase()}</Badge>
                        </div>
                        <div className="text-xs text-muted-2 mt-0.5">{def.description[locale]}</div>
                      </div>
                      <a href="/app/marketplace" className="text-xs text-cyan hover:underline flex items-center gap-1 shrink-0">
                        {isEn ? "Install" : "Установить"} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selection summary */}
            <div className="p-3 rounded-lg bg-surface-2 border border-border flex items-center justify-between">
              <span className="text-sm text-muted-2">{isEn ? `Selected: ${selectedTools.size} tools` : `Выбрано: ${selectedTools.size} инстр.`}</span>
              <span className="text-xs text-accent font-mono">{Array.from(selectedTools).map(id => allScanTools.find(t => t.id === id)?.name).join(" + ")}</span>
            </div>

            {/* Marketplace CTA */}
            <div className="p-4 rounded-xl border border-accent/20 bg-accent-muted/30 flex items-center gap-3">
              <Store className="w-5 h-5 text-accent shrink-0" />
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground">{isEn ? "Need more tools?" : "Нужно больше инструментов?"}</span>
                <span className="text-xs text-muted-2 block">{isEn ? "Install additional scanners from the Marketplace." : "Установите дополнительные сканеры из Каталога."}</span>
              </div>
              <a href="/app/marketplace" className="text-xs text-accent hover:underline flex items-center gap-1">{isEn ? "Browse" : "Каталог"} <ExternalLink className="w-3 h-3" /></a>
            </div>

            {/* Next-step hint */}
            <div className="p-3 rounded-lg bg-accent-muted border border-accent/20 flex items-start gap-2.5 text-sm">
              <Play className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span className="text-muted-2">
                {isEn
                  ? "Ready to scan! Each tool will run sequentially, then SIP will correlate results, build a knowledge graph, trace attack paths, and generate a report."
                  : "Готово к сканированию! Каждый инструмент запустится последовательно, затем SIP скоррелирует результаты, построит граф знаний, отследит пути атак и сгенерирует отчёт."}
              </span>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}><ChevronLeft className="w-4 h-4" /> {isEn ? "Back" : "Назад"}</Button>
              <Button onClick={runPipeline} disabled={!step3Valid}><Play className="w-4 h-4" /> {isEn ? "Start Scan" : "Начать сканирование"}</Button>
            </div>
          </div>
        )}

        {/* STEP 4 — Pipeline & Results */}
        {step === 4 && (
          <div className="space-y-6">
            {/* Scan context badges */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-2">
              <span className="px-2.5 py-1 rounded-md bg-surface-2 border border-border">{projectName}</span>
              <span className="px-2.5 py-1 rounded-md bg-surface-2 border border-border font-mono">{sourceValue || "demo"}</span>
              <span className="px-2.5 py-1 rounded-md bg-accent-muted text-accent border border-accent/20">{Array.from(selectedTools).map(id => allScanTools.find(t => t.id === id)?.name).join(" + ")}</span>
              {pipelineComplete && <span className="px-2.5 py-1 rounded-md bg-accent/20 text-accent border border-accent/30 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {isEn ? "Complete" : "Завершено"}</span>}
            </div>

            {/* Result tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-2 border border-border">
              {[
                { key: "pipeline", label: isEn ? "Pipeline" : "Пайплайн", icon: Terminal },
                { key: "findings", label: isEn ? "Findings" : "Находки", icon: ShieldAlert },
                { key: "next", label: isEn ? "What's next?" : "Что дальше?", icon: ArrowRight },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveResultTab(tab.key as "pipeline" | "findings" | "next")}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                    activeResultTab === tab.key ? "bg-accent text-background" : "text-muted-2 hover:text-foreground"
                  }`}>
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Pipeline Tab */}
            {activeResultTab === "pipeline" && (
              <div className="space-y-2">
                {dynamicStages.map((stage, i) => (
                  <PipelineStageCard key={stage.id} stage={stage} index={i}
                    status={pipelineComplete ? "completed" : currentStage > i ? "completed" : currentStage === i ? "running" : "pending"}
                    progress={stageProgress[i] || 0} outputs={stageOutputs[i] || []} isLast={i === dynamicStages.length - 1}
                    isEn={isEn} />
                ))}
                {pipelineComplete && (
                  <div className="mt-4 p-4 rounded-xl bg-accent-muted border border-accent/20">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-5 h-5 text-accent" />
                      <span className="text-sm font-semibold text-foreground">{isEn ? "Scan complete!" : "Сканирование завершено!"}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <div className="p-2.5 rounded-lg bg-surface border border-border text-center">
                        <div className="text-xl font-bold text-red">{demoFindings.filter(f => f.severity === "critical").length}</div>
                        <div className="text-[10px] text-muted-2 uppercase">Critical</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-surface border border-border text-center">
                        <div className="text-xl font-bold text-amber">{demoFindings.filter(f => f.severity === "high").length}</div>
                        <div className="text-[10px] text-muted-2 uppercase">High</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-surface border border-border text-center">
                        <div className="text-xl font-bold text-amber">{demoFindings.filter(f => f.severity === "medium").length}</div>
                        <div className="text-[10px] text-muted-2 uppercase">Medium</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-surface border border-border text-center">
                        <div className="text-xl font-bold text-accent">{78}</div>
                        <div className="text-[10px] text-muted-2 uppercase">{isEn ? "Risk Score" : "Риск"}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setActiveResultTab("findings")} className="text-xs text-accent hover:underline flex items-center gap-1">
                        {isEn ? "View all findings" : "Смотреть все находки"} <ChevronRight className="w-3 h-3" />
                      </button>
                      <span className="text-muted-2">·</span>
                      <button onClick={() => setActiveResultTab("next")} className="text-xs text-accent hover:underline flex items-center gap-1">
                        {isEn ? "What's next?" : "Что дальше?"} <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Findings Tab */}
            {activeResultTab === "findings" && (
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-2">
                  {(["critical", "high", "medium", "low", "info"] as Severity[]).map(sev => {
                    const count = demoFindings.filter(f => f.severity === sev).length;
                    return (
                      <div key={sev} className={`p-3 rounded-lg border text-center ${severityBg[sev]}`}>
                        <div className={`text-xl font-bold ${severityColors[sev]}`}>{count}</div>
                        <div className="text-[10px] text-muted-2 uppercase mt-1">{sev}</div>
                      </div>
                    );
                  })}
                </div>
                {demoFindings.map((finding) => (
                  <div key={finding.id} className="p-4 rounded-xl bg-surface border border-border hover:border-border-light transition-all cursor-pointer"
                    onClick={() => setExpandedFinding(expandedFinding === finding.id ? null : finding.id)}>
                    <div className="flex items-center gap-3">
                      {severityIcon[finding.severity]}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{finding.title}</div>
                        <div className="text-xs text-muted-2 mt-0.5">{finding.asset} · CVSS {finding.cvss}</div>
                      </div>
                      <Badge variant={finding.severity === "critical" ? "critical" : finding.severity === "high" ? "high" : "default"}>{finding.severity.toUpperCase()}</Badge>
                    </div>
                    {expandedFinding === finding.id && (
                      <div className="mt-3 pt-3 border-t border-border space-y-2">
                        <div><span className="text-xs text-muted-2">{isEn ? "Description:" : "Описание:"}</span><p className="text-sm text-foreground mt-0.5">{finding.description}</p></div>
                        {finding.recommendation && <div><span className="text-xs text-muted-2">{isEn ? "Recommendation:" : "Рекомендация:"}</span><p className="text-sm text-foreground mt-0.5">{finding.recommendation}</p></div>}
                        {(finding.cve || finding.mitre) && <div className="flex items-center gap-2 flex-wrap">{finding.cve && <Badge variant="default">{finding.cve}</Badge>}{finding.mitre && <Badge variant="default">MITRE {finding.mitre}</Badge>}</div>}
                        <div className="flex items-center gap-2 mt-2">
                          <a href="/app/demo/knowledge-graph" className="text-xs text-accent hover:underline flex items-center gap-1">
                            {isEn ? "View in Knowledge Graph" : "Смотреть в графе знаний"} <ExternalLink className="w-3 h-3" />
                          </a>
                          <a href="/app/demo/attack-paths" className="text-xs text-accent hover:underline flex items-center gap-1">
                            {isEn ? "Attack Paths" : "Пути атак"} <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* What's Next Tab */}
            {activeResultTab === "next" && pipelineComplete && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-accent-muted border border-accent/20">
                  <h3 className="text-sm font-semibold text-foreground mb-1">{isEn ? "Scan completed successfully!" : "Сканирование успешно завершено!"}</h3>
                  <p className="text-xs text-muted-2">{isEn ? "Here's what you can do next:" : "Вот что вы можете сделать:"}</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <a href="/app/demo/knowledge-graph" className="p-4 rounded-xl bg-surface border border-border hover:border-accent/30 transition-all group">
                    <div className="flex items-center gap-2 mb-2"><ShieldCheck className="w-5 h-5 text-accent" /><span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">{isEn ? "Explore Knowledge Graph" : "Открыть граф знаний"}</span></div>
                    <p className="text-xs text-muted-2">{isEn ? "See the map of your infrastructure — assets, services, vulnerabilities, and how they connect." : "Карта инфраструктуры — активы, сервисы, уязвимости и связи между ними."}</p>
                  </a>
                  <a href="/app/demo/attack-paths" className="p-4 rounded-xl bg-surface border border-border hover:border-accent/30 transition-all group">
                    <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-amber" /><span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">{isEn ? "Analyze Attack Paths" : "Анализ путей атак"}</span></div>
                    <p className="text-xs text-muted-2">{isEn ? "See how an attacker could chain vulnerabilities to reach critical assets." : "Посмотрите, как злоумышленник может объединить уязвимости для доступа к критичным активам."}</p>
                  </a>
                  <a href="/app/reports" className="p-4 rounded-xl bg-surface border border-border hover:border-accent/30 transition-all group">
                    <div className="flex items-center gap-2 mb-2"><BookOpen className="w-5 h-5 text-purple" /><span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">{isEn ? "Generate Report" : "Создать отчёт"}</span></div>
                    <p className="text-xs text-muted-2">{isEn ? "Download a structured report — Executive Summary, Technical, or SARIF format." : "Скачайте структурированный отчёт — Резюме, Технический или SARIF."}</p>
                  </a>
                  <a href="/app/marketplace" className="p-4 rounded-xl bg-surface border border-border hover:border-accent/30 transition-all group">
                    <div className="flex items-center gap-2 mb-2"><Store className="w-5 h-5 text-cyan" /><span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">{isEn ? "Install More Tools" : "Установить инструменты"}</span></div>
                    <p className="text-xs text-muted-2">{isEn ? "Expand scanning capabilities — SAST, DAST, API testing, and more from the Marketplace." : "Расширьте возможности — SAST, DAST, тестирование API и другие из Каталога."}</p>
                  </a>
                </div>

                {/* Demo label */}
                <div className="p-3 rounded-lg bg-amber/10 border border-amber/20 flex items-start gap-2.5 text-sm">
                  <span className="text-amber font-medium shrink-0">{isEn ? "⚠ Demo Scenario" : "⚠ Демо-сценарий"}</span>
                  <span className="text-muted-2">{isEn ? "This scan uses simulated data to demonstrate SIP's capabilities. After connecting real tools and data sources, all findings, attack paths, and reports will be generated from actual scan results." : "Это сканирование использует симулированные данные для демонстрации возможностей SIP. После подключения реальных инструментов и источников данных все находки, пути атак и отчёты будут сформированы из реальных результатов."}</span>
                </div>

                <div className="flex justify-center gap-3 pt-2">
                  <Button variant="outline" onClick={() => { setStep(1); setPipelineComplete(false); setPipelineRunning(false); }}>
                    <Play className="w-4 h-4" /> {isEn ? "New Scan" : "Новое сканирование"}
                  </Button>
                  <Button onClick={() => setActiveResultTab("findings")}>
                    {isEn ? "View Findings" : "Смотреть находки"} <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Container>
    </div>
  );
}
