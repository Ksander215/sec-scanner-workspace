"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  Download,
  Activity,
  Wrench,
  CircleDot,
} from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import {
  type Finding,
  type Severity,
  type ScanResult,
  type PipelineStage,
  type StageProgress,
  getAvailableTools,
  getMarketplaceAvailable,
  buildPipelineStages,
  executeScan,
  getProjects,
  createProject,
  saveScanResult,
  getLatestFindings,
  getScanResults,
  isInstalled,
  installPlugin,
  removePlugin,
  getRegistry,
  type RegistryEntry,
  type InstallStatus,
  MANIFESTS_BY_ID,
  BUILTIN_TOOL_IDS,
} from "@/lib/engine";

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

// ─── Data Source options ────────────────────────────────────────────────

interface DataSourceOption {
  id: "git" | "folder" | "docker" | "website" | "api";
  name: { ru: string; en: string };
  description: { ru: string; en: string };
  icon: React.ElementType;
  placeholder: { ru: string; en: string };
  color: string;
  compatibleTools: string[]; // which tool IDs work with this source
}

const dataSources: DataSourceOption[] = [
  { id: "git", name: { ru: "Git-репозиторий", en: "Git Repository" }, description: { ru: "Клонировать и просканировать репозиторий", en: "Clone and scan a repository" }, icon: GitBranch, placeholder: { ru: "https://github.com/company/project", en: "https://github.com/company/project" }, color: "text-purple", compatibleTools: ["semgrep", "trivy", "nuclei"] },
  { id: "folder", name: { ru: "Локальная папка", en: "Local Folder" }, description: { ru: "Указать путь к папке на сервере", en: "Specify a folder path on the server" }, icon: Folder, placeholder: { ru: "/var/www/project", en: "/var/www/project" }, color: "text-amber", compatibleTools: ["semgrep", "trivy", "nmap"] },
  { id: "docker", name: { ru: "Docker-образ", en: "Docker Image" }, description: { ru: "Просканировать Docker-образ на уязвимости", en: "Scan a Docker image for vulnerabilities" }, icon: Globe, placeholder: { ru: "nginx:latest", en: "nginx:latest" }, color: "text-cyan", compatibleTools: ["trivy", "nmap"] },
  { id: "website", name: { ru: "Веб-сайт / API", en: "Website / API" }, description: { ru: "Указать URL для сканирования", en: "Specify a URL to scan" }, icon: Globe, placeholder: { ru: "https://example.com", en: "https://example.com" }, color: "text-accent", compatibleTools: ["nmap", "nuclei", "owasp-zap", "nikto"] },
  { id: "api", name: { ru: "API-эндпоинт", en: "API Endpoint" }, description: { ru: "Указать API для тестирования", en: "Specify an API to test" }, icon: Radio, placeholder: { ru: "https://api.example.com/v1", en: "https://api.example.com/v1" }, color: "text-amber", compatibleTools: ["nuclei", "owasp-zap", "nikto"] },
];

// ─── Pipeline stage component ───────────────────────────────────────────

function PipelineStageCard({
  stage,
  index,
  status,
  progress,
  outputs,
  isLast,
  isEn,
  timestamp,
}: {
  stage: PipelineStage;
  index: number;
  status: "pending" | "running" | "completed";
  progress: number;
  outputs: string[];
  isLast: boolean;
  isEn: boolean;
  timestamp?: string;
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
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${status === "running" ? "text-accent" : status === "completed" ? "text-foreground" : "text-muted"}`}>
              {stage.label[isEn ? "en" : "ru"]}
            </span>
            {timestamp && status === "completed" && (
              <span className="text-[10px] text-muted-2 font-mono">{new Date(timestamp).toLocaleTimeString()}</span>
            )}
          </div>
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
          <div className="mt-2 font-mono text-[11px] text-accent/70 space-y-0.5 bg-surface-2/50 rounded px-2 py-1.5 max-h-32 overflow-y-auto">
            {outputs.map((line, i) => <div key={i}>{line}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Project status badge ───────────────────────────────────────────────

function projectStatusBadge(status: string, isEn: boolean) {
  const map: Record<string, { label: string; color: string }> = {
    healthy: { label: isEn ? "Healthy" : "Здоров", color: "bg-accent-muted text-accent border-accent/20" },
    warning: { label: isEn ? "Warning" : "Внимание", color: "bg-amber-muted text-amber border-amber/20" },
    critical: { label: isEn ? "Critical" : "Критично", color: "bg-red-muted text-red border-red/20" },
    idle: { label: isEn ? "Idle" : "Неактивен", color: "bg-surface-2 text-muted-2 border-border" },
  };
  const info = map[status] || map.idle;
  return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${info.color}`}>{info.label}</span>;
}

// ─── Tool Health Badge ───────────────────────────────────────────────────

function installStatusBadge(status: InstallStatus, isEn: boolean) {
  const map: Record<InstallStatus, { label: string; color: string; icon?: React.ReactNode }> = {
    not_installed: { label: isEn ? "Not installed" : "Не установлен", color: "text-muted-2" },
    downloading: { label: isEn ? "Downloading..." : "Загрузка...", color: "text-cyan", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    installing: { label: isEn ? "Installing..." : "Установка...", color: "text-cyan", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    verifying: { label: isEn ? "Verifying..." : "Проверка...", color: "text-cyan", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    installed: { label: isEn ? "Installed" : "Установлен", color: "text-accent" },
    failed: { label: isEn ? "Failed" : "Ошибка", color: "text-red" },
  };
  const info = map[status];
  return (
    <span className={`text-xs flex items-center gap-1 ${info.color}`}>
      {info.icon}
      {info.label}
    </span>
  );
}

// ─── Main component ─────────────────────────────────────────────────────

export default function ScannerPage() {
  const { locale } = useI18n();
  const isEn = locale === "en";

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [selectedSource, setSelectedSource] = useState<DataSourceOption["id"] | null>(null);
  const [sourceValue, setSourceValue] = useState("");
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineComplete, setPipelineComplete] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [stageProgress, setStageProgress] = useState<Record<number, number>>({});
  const [stageOutputs, setStageOutputs] = useState<Record<number, string[]>>({});
  const [stageTimestamps, setStageTimestamps] = useState<Record<number, string>>({});
  const [activeResultTab, setActiveResultTab] = useState<"pipeline" | "findings" | "next">("pipeline");
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [latestFindings, setLatestFindings] = useState<Finding[]>([]);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [dynamicStages, setDynamicStages] = useState<PipelineStage[]>([]);
  const [installingToolId, setInstallingToolId] = useState<string | null>(null);
  const [toolInstallStatus, setToolInstallStatus] = useState<Record<string, InstallStatus>>({});

  // Load projects from engine
  const projects = getProjects();

  // Load available tools from engine registry
  const availableTools = getAvailableTools();
  const marketplaceTools = getMarketplaceAvailable();

  // Get registry entries for tool health
  const registry = getRegistry();

  // Initialize selected tools with built-in defaults
  useEffect(() => {
    if (selectedTools.size === 0) {
      setSelectedTools(new Set(BUILTIN_TOOL_IDS));
    }
  }, []);

  // Load scan history and findings on mount
  useEffect(() => {
    setScanHistory(getScanResults());
    setLatestFindings(getLatestFindings());
  }, []);

  // Current findings to display (from latest scan or previous scan)
  const displayFindings = scanResult?.findings || latestFindings;

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

  const projectName = newProjectName.trim() || projects.find(p => p.id === selectedProject)?.name || (isEn ? "New Project" : "Новый проект");
  const projectId = selectedProject || `PRJ-${String(Date.now()).slice(-6)}`;

  // ─── Install tool from marketplace (without leaving Scanner) ────────

  const handleInstallTool = async (toolId: string) => {
    setInstallingToolId(toolId);
    await installPlugin(toolId, (status) => {
      setToolInstallStatus(prev => ({ ...prev, [toolId]: status }));
    });
    setInstallingToolId(null);
    // Auto-select newly installed tool
    setSelectedTools(prev => new Set([...prev, toolId]));
  };

  // ─── Run Pipeline using Engine ─────────────────────────────────────

  const runPipeline = useCallback(async () => {
    const stages = buildPipelineStages(Array.from(selectedTools), locale as "ru" | "en");
    setDynamicStages(stages);
    setStep(4);
    setPipelineRunning(true);
    setPipelineComplete(false);
    setCurrentStage(0);
    setStageProgress({});
    setStageOutputs({});
    setStageTimestamps({});
    setActiveResultTab("pipeline");

    try {
      const result = await executeScan(
        {
          projectId,
          projectName,
          sourceType: selectedSource || "website",
          sourceValue: sourceValue || "demo-target",
          toolIds: Array.from(selectedTools),
        },
        locale as "ru" | "en",
        (update: StageProgress) => {
          setCurrentStage(update.stageIndex);
          setStageProgress(prev => ({ ...prev, [update.stageIndex]: update.progress }));
          if (update.stdout.length > 0) {
            setStageOutputs(prev => ({ ...prev, [update.stageIndex]: update.stdout }));
          }
          if (update.status === "completed") {
            setStageTimestamps(prev => ({ ...prev, [update.stageIndex]: update.timestamp }));
          }
        }
      );

      setScanResult(result);
      setLatestFindings(result.findings);
      setPipelineRunning(false);
      setPipelineComplete(true);
      setActiveResultTab("next");

      // Save to engine
      saveScanResult(result);
      setScanHistory(getScanResults());
    } catch (err) {
      console.error("Scan failed:", err);
      setPipelineRunning(false);
      setPipelineComplete(true);
    }
  }, [selectedTools, sourceValue, selectedSource, isEn, projectId, projectName, locale]);

  const steps = [
    { num: 1, label: isEn ? "Project" : "Проект", icon: FolderPlus },
    { num: 2, label: isEn ? "Source" : "Источник", icon: Globe },
    { num: 3, label: isEn ? "Tools" : "Инструменты", icon: Shield },
    { num: 4, label: isEn ? "Run" : "Запуск", icon: Play },
  ];

  // Risk score from scan result
  const riskScore = scanResult?.riskScore || 0;

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
              <button onClick={() => { localStorage.removeItem("sip_scans"); setScanHistory([]); setShowHistory(false); }}
                className="text-xs text-muted-2 hover:text-red transition-colors">
                {isEn ? "Clear" : "Очистить"}
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {scanHistory.slice(0, 10).map((rec) => (
                <div key={rec.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-2 border border-border text-xs">
                  <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">{rec.projectName}</div>
                    <div className="text-muted-2 truncate">{rec.sourceValue} · {rec.tools.join(", ")}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-accent">{rec.riskScore}/100</div>
                    <div className="text-muted-2">{rec.findings.length} {isEn ? "findings" : "находок"}</div>
                  </div>
                  <div className="text-muted-2 shrink-0">
                    {new Date(rec.startedAt).toLocaleTimeString()}
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

            <div className="space-y-2">
              {projects.map((project) => {
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
                        {isEn ? `${project.assets} assets · Score: ${project.securityScore}/100` : `${project.assets} активов · Оценка: ${project.securityScore}/100`}
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

            <div className="p-3 rounded-lg bg-cyan-muted border border-cyan/20 flex items-start gap-2.5 text-sm">
              <ArrowRight className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
              <span className="text-muted-2">
                {isEn ? "After selecting a project, you'll choose a data source — where SIP should scan." : "После выбора проекта вы укажете источник данных — откуда SIP будет собирать информацию."}
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
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {source.compatibleTools.map(tid => {
                          const m = MANIFESTS_BY_ID[tid];
                          return m ? <span key={tid} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-muted-2 border border-border">{m.name}</span> : null;
                        })}
                      </div>
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

            <div className="p-3 rounded-lg bg-cyan-muted border border-cyan/20 flex items-start gap-2.5 text-sm">
              <ArrowRight className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
              <span className="text-muted-2">
                {isEn ? "Next you'll select which scanning engines to run. More tools = deeper analysis." : "Далее вы выберете движки сканирования. Больше инструментов = глубже анализ."}
              </span>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="w-4 h-4" /> {isEn ? "Back" : "Назад"}</Button>
              <Button onClick={() => setStep(3)} disabled={!step2Valid}>{isEn ? "Next" : "Далее"} <ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}

        {/* STEP 3 — Tool Selection (from Engine Registry) */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">{isEn ? "Select scan tools" : "Выберите инструменты"}</h2>
              <p className="text-sm text-muted-2">{isEn ? "Choose which engines will run. Each tool covers a different attack surface. Install more from the Marketplace." : "Выберите движки для сканирования. Каждый инструмент покрывает свою поверхность атаки. Установите дополнительные из Каталога."}</p>
            </div>

            {/* Installed tools from Engine Registry */}
            <div>
              <div className="text-xs font-medium text-accent uppercase tracking-wider mb-2 flex items-center gap-2">
                <Wrench className="w-3.5 h-3.5" />
                {isEn ? "Installed Tools" : "Установленные инструменты"}
              </div>
              <div className="space-y-2">
                {availableTools.map((manifest) => {
                  const isSelected = selectedTools.has(manifest.id);
                  const regEntry = registry.find(e => e.manifest.id === manifest.id);
                  const isBuiltin = BUILTIN_TOOL_IDS.has(manifest.id);
                  return (
                    <button key={manifest.id} onClick={() => toggleTool(manifest.id)}
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
                          <span className="text-sm font-medium text-foreground">{manifest.name}</span>
                          <Badge variant="default" className="text-[10px]">{manifest.category.toUpperCase()}</Badge>
                          {isBuiltin && <Badge variant="default" className="text-[10px] text-cyan">{isEn ? "Built-in" : "Встроен"}</Badge>}
                        </div>
                        <div className="text-xs text-muted-2 mt-0.5">{manifest.description[locale]}</div>
                        <div className="text-[10px] text-muted mt-1 font-mono">{manifest.cliCommand}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {installStatusBadge("installed", isEn)}
                        {regEntry?.lastRun && <span className="text-[10px] text-muted-2">{isEn ? "Last run:" : "Последний:"} {new Date(regEntry.lastRun).toLocaleDateString()}</span>}
                        {regEntry?.version && <span className="text-[10px] text-muted-2 font-mono">v{regEntry.version}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Available marketplace tools (not yet installed) — installable from Scanner */}
            {marketplaceTools.length > 0 && (
              <div>
                <div className="text-xs font-medium text-cyan uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Store className="w-3.5 h-3.5" />
                  {isEn ? "Available in Marketplace" : "Доступны в Каталоге"}
                </div>
                <div className="space-y-2">
                  {marketplaceTools.map((manifest) => {
                    const isInstalling = installingToolId === manifest.id;
                    const status = toolInstallStatus[manifest.id];
                    return (
                      <div key={manifest.id} className="flex items-center gap-4 p-4 rounded-xl border border-cyan/20 bg-cyan-muted/30">
                        <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 border-cyan/30">
                          <Store className="w-3.5 h-3.5 text-cyan" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{manifest.name}</span>
                            <Badge variant="default" className="text-[10px]">{manifest.category.toUpperCase()}</Badge>
                            <Badge variant="default" className="text-[10px]">v{manifest.version}</Badge>
                          </div>
                          <div className="text-xs text-muted-2 mt-0.5">{manifest.description[locale]}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {status && status !== "not_installed" && status !== "installed" ? (
                            installStatusBadge(status, isEn)
                          ) : status === "installed" ? (
                            <CheckCircle2 className="w-4 h-4 text-accent" />
                          ) : (
                            <button
                              onClick={() => handleInstallTool(manifest.id)}
                              disabled={isInstalling}
                              className="text-xs px-3 py-1.5 rounded-lg bg-cyan/10 text-cyan hover:bg-cyan/20 border border-cyan/20 transition-all flex items-center gap-1.5"
                            >
                              {isInstalling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                              {isEn ? "Install" : "Установить"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selection summary */}
            <div className="p-3 rounded-lg bg-surface-2 border border-border flex items-center justify-between">
              <span className="text-sm text-muted-2">{isEn ? `Selected: ${selectedTools.size} tools` : `Выбрано: ${selectedTools.size} инстр.`}</span>
              <span className="text-xs text-accent font-mono">{Array.from(selectedTools).map(id => MANIFESTS_BY_ID[id]?.name || id).join(" + ")}</span>
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
              <Button onClick={runPipeline} disabled={!step3Valid || pipelineRunning}>
                {pipelineRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {isEn ? "Start Scan" : "Начать сканирование"}
              </Button>
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
              <span className="px-2.5 py-1 rounded-md bg-accent-muted text-accent border border-accent/20">{Array.from(selectedTools).map(id => MANIFESTS_BY_ID[id]?.name || id).join(" + ")}</span>
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
                    isEn={isEn} timestamp={stageTimestamps[i]} />
                ))}
                {pipelineComplete && displayFindings.length > 0 && (
                  <div className="mt-4 p-4 rounded-xl bg-accent-muted border border-accent/20">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-5 h-5 text-accent" />
                      <span className="text-sm font-semibold text-foreground">{isEn ? "Scan complete!" : "Сканирование завершено!"}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <div className="p-2.5 rounded-lg bg-surface border border-border text-center">
                        <div className="text-xl font-bold text-red">{displayFindings.filter(f => f.severity === "critical").length}</div>
                        <div className="text-[10px] text-muted-2 uppercase">Critical</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-surface border border-border text-center">
                        <div className="text-xl font-bold text-amber">{displayFindings.filter(f => f.severity === "high").length}</div>
                        <div className="text-[10px] text-muted-2 uppercase">High</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-surface border border-border text-center">
                        <div className="text-xl font-bold text-amber">{displayFindings.filter(f => f.severity === "medium").length}</div>
                        <div className="text-[10px] text-muted-2 uppercase">Medium</div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-surface border border-border text-center">
                        <div className="text-xl font-bold text-accent">{riskScore}</div>
                        <div className="text-[10px] text-muted-2 uppercase">{isEn ? "Risk Score" : "Риск"}</div>
                      </div>
                    </div>

                    {/* Scan Timeline */}
                    {scanResult && scanResult.timeline.length > 0 && (
                      <div className="mb-3 p-3 rounded-lg bg-surface-2 border border-border">
                        <div className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-accent" />
                          {isEn ? "Timeline" : "Хронология"}
                        </div>
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {scanResult.timeline.map((entry, i) => (
                            <div key={i} className="flex items-center gap-2 text-[10px]">
                              <span className="text-muted-2 font-mono shrink-0">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                              <span className="text-foreground">{entry.event}</span>
                              {entry.detail && <span className="text-muted-2">— {entry.detail}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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

            {/* Findings Tab — Real Findings from Engine */}
            {activeResultTab === "findings" && (
              <div className="space-y-3">
                {displayFindings.length > 0 ? (
                  <>
                    <div className="grid grid-cols-5 gap-2">
                      {(["critical", "high", "medium", "low", "info"] as Severity[]).map(sev => {
                        const count = displayFindings.filter(f => f.severity === sev).length;
                        return (
                          <div key={sev} className={`p-3 rounded-lg border text-center ${severityBg[sev]}`}>
                            <div className={`text-xl font-bold ${severityColors[sev]}`}>{count}</div>
                            <div className="text-[10px] text-muted-2 uppercase mt-1">{sev}</div>
                          </div>
                        );
                      })}
                    </div>
                    {displayFindings.map((finding) => (
                      <div key={finding.id} className="p-4 rounded-xl bg-surface border border-border hover:border-border-light transition-all cursor-pointer"
                        onClick={() => setExpandedFinding(expandedFinding === finding.id ? null : finding.id)}>
                        <div className="flex items-center gap-3">
                          {severityIcon[finding.severity]}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{finding.title}</div>
                            <div className="text-xs text-muted-2 mt-0.5">{finding.asset} · CVSS {finding.cvss} · {finding.tool}</div>
                          </div>
                          <Badge variant={finding.severity === "critical" ? "critical" : finding.severity === "high" ? "high" : "default"}>{finding.severity.toUpperCase()}</Badge>
                        </div>
                        {expandedFinding === finding.id && (
                          <div className="mt-3 pt-3 border-t border-border space-y-2">
                            <div><span className="text-xs text-muted-2">{isEn ? "Description:" : "Описание:"}</span><p className="text-sm text-foreground mt-0.5">{finding.description}</p></div>
                            {finding.evidence && <div><span className="text-xs text-muted-2">{isEn ? "Evidence:" : "Доказательство:"}</span><p className="text-sm text-foreground font-mono mt-0.5 bg-surface-2 p-2 rounded">{finding.evidence}</p></div>}
                            {finding.recommendation && <div><span className="text-xs text-muted-2">{isEn ? "Recommendation:" : "Рекомендация:"}</span><p className="text-sm text-foreground mt-0.5">{finding.recommendation}</p></div>}
                            <div className="flex items-center gap-2 flex-wrap">
                              {finding.cve && <Badge variant="default">{finding.cve}</Badge>}
                              {finding.cwe && <Badge variant="default">CWE-{finding.cwe}</Badge>}
                              {finding.mitre && <Badge variant="default">MITRE {finding.mitre}</Badge>}
                              <Badge variant="default" className="text-cyan">{finding.tool}</Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <a href="/app/demo/knowledge-graph" className="text-xs text-accent hover:underline flex items-center gap-1">
                                {isEn ? "Knowledge Graph" : "Граф знаний"} <ExternalLink className="w-3 h-3" />
                              </a>
                              <a href="/app/demo/attack-paths" className="text-xs text-accent hover:underline flex items-center gap-1">
                                {isEn ? "Attack Paths" : "Пути атак"} <ExternalLink className="w-3 h-3" />
                              </a>
                              <a href="/app/reports" className="text-xs text-accent hover:underline flex items-center gap-1">
                                {isEn ? "Report" : "Отчёт"} <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="p-8 text-center">
                    <ShieldCheck className="w-12 h-12 text-accent mx-auto mb-3" />
                    <p className="text-sm text-muted-2">{isEn ? "No findings yet. Run a scan to discover vulnerabilities." : "Находок пока нет. Запустите сканирование для обнаружения уязвимостей."}</p>
                  </div>
                )}
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

                <div className="flex justify-center gap-3 pt-2">
                  <Button variant="outline" onClick={() => { setStep(1); setPipelineComplete(false); setPipelineRunning(false); setScanResult(null); }}>
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
