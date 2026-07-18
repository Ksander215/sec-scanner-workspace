"use client";

import { useState, useCallback } from "react";
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
} from "lucide-react";
import { demoFindings, pipelineStages, type PipelineStage, type Severity } from "@/lib/demo-data";
import { useI18n } from "@/lib/i18n-context";

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

// ─── Scan Tool definition ───────────────────────────────────────────────

interface ScanTool {
  id: string;
  name: string;
  description: { ru: string; en: string };
  installed: boolean;
  inDevelopment?: boolean;
}

const scanTools: ScanTool[] = [
  { id: "nmap", name: "Nmap", description: { ru: "Сетевой сканер портов и сервисов", en: "Network port and service scanner" }, installed: true },
  { id: "nuclei", name: "Nuclei", description: { ru: "Сканер уязвимостей на основе шаблонов", en: "Template-based vulnerability scanner" }, installed: true },
  { id: "trivy", name: "Trivy", description: { ru: "Сканер контейнеров и зависимостей", en: "Container and dependency scanner" }, installed: true },
  { id: "owasp-zap", name: "OWASP ZAP", description: { ru: "Веб-сканер безопасности приложений", en: "Web application security scanner" }, installed: false, inDevelopment: true },
  { id: "semgrep", name: "Semgrep", description: { ru: "Статический анализатор кода", en: "Static code analyzer" }, installed: false, inDevelopment: true },
  { id: "nikto", name: "Nikto", description: { ru: "Сканер веб-серверов", en: "Web server scanner" }, installed: false, inDevelopment: true },
];

// ─── Data Source options ────────────────────────────────────────────────

interface DataSourceOption {
  id: string;
  name: { ru: string; en: string };
  description: { ru: string; en: string };
  icon: React.ElementType;
  placeholder: { ru: string; en: string };
}

const dataSources: DataSourceOption[] = [
  { id: "git", name: { ru: "Git Repository", en: "Git Repository" }, description: { ru: "Клонировать и просканировать репозиторий", en: "Clone and scan a repository" }, icon: GitBranch, placeholder: { ru: "https://github.com/...", en: "https://github.com/..." } },
  { id: "folder", name: { ru: "Локальная папка", en: "Local Folder" }, description: { ru: "Указать путь к папке на сервере", en: "Specify a folder path on the server" }, icon: Folder, placeholder: { ru: "/path/to/project", en: "/path/to/project" } },
  { id: "docker", name: { ru: "Docker Image", en: "Docker Image" }, description: { ru: "Просканировать Docker-образ", en: "Scan a Docker image" }, icon: Globe, placeholder: { ru: "nginx:latest", en: "nginx:latest" } },
  { id: "website", name: { ru: "Website / API", en: "Website / API" }, description: { ru: "Указать URL для сканирования", en: "Specify a URL to scan" }, icon: Globe, placeholder: { ru: "https://example.com", en: "https://example.com" } },
];

// ─── Project type ───────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  source: string;
  lastScan?: string;
}

const demoProjects: Project[] = [
  { id: "demo-api", name: "Demo API Project", source: "https://github.com/demo/api", lastScan: "2026-07-18" },
  { id: "demo-web", name: "Demo Web App", source: "https://demo.example.com", lastScan: "2026-07-15" },
];

// ─── Pipeline stage component ───────────────────────────────────────────

function PipelineStageCard({
  stage,
  index,
  status,
  progress,
  outputs,
  isLast,
}: {
  stage: PipelineStage;
  index: number;
  status: "pending" | "running" | "completed";
  progress: number;
  outputs: string[];
  isLast: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
          status === "running" ? "bg-accent text-background" : status === "completed" ? "bg-accent/20 text-accent" : "bg-surface-2 text-muted border border-border"
        }`}>
          {status === "completed" ? <CheckCircle2 className="w-4 h-4" /> : status === "running" ? <Loader2 className="w-4 h-4 animate-spin" /> : index + 1}
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
            {stage.label}
          </span>
          {status === "running" && <span className="text-xs text-accent font-mono">{Math.round(progress)}%</span>}
        </div>
        <p className="text-xs text-muted-2">{stage.description}</p>
        {status === "running" && (
          <div className="mt-2 h-1 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
          </div>
        )}
        {outputs.length > 0 && (
          <div className="mt-2 font-mono text-[11px] text-accent/70 space-y-0.5">
            {outputs.map((line, i) => <div key={i}>{line}</div>)}
          </div>
        )}
      </div>
    </div>
  );
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

  const runPipeline = useCallback(() => {
    setStep(4);
    setPipelineRunning(true);
    setPipelineComplete(false);
    setCurrentStage(0);
    setStageProgress({});
    setStageOutputs({});
    setActiveResultTab("pipeline");

    const toolNames = Array.from(selectedTools).map(id => scanTools.find(t => t.id === id)?.name || id);
    let stageIdx = 0;
    const totalStages = pipelineStages.length;

    const advanceStage = () => {
      if (stageIdx >= totalStages) {
        setPipelineRunning(false);
        setPipelineComplete(true);
        setActiveResultTab("next");
        return;
      }

      setCurrentStage(stageIdx);
      let progress = 0;

      if (stageIdx === 0) {
        setStageOutputs(prev => ({ ...prev, [stageIdx]: [isEn ? "Initializing pipeline..." : "Инициализация пайплайна..."] }));
      } else if (stageIdx <= selectedTools.size) {
        const toolName = toolNames[stageIdx - 1] || "Scanner";
        setStageOutputs(prev => ({ ...prev, [stageIdx]: [`$ sip run --engine ${toolName.toLowerCase()} --target ${sourceValue || "demo"}`] }));
      } else {
        setStageOutputs(prev => ({ ...prev, [stageIdx]: [isEn ? "Processing results..." : "Обработка результатов..."] }));
      }

      const progressInterval = setInterval(() => {
        progress += Math.random() * 18 + 5;
        if (progress >= 100) {
          progress = 100;
          clearInterval(progressInterval);
          setStageProgress(prev => ({ ...prev, [stageIdx]: 100 }));
          setTimeout(() => { stageIdx++; advanceStage(); }, 400);
        } else {
          setStageProgress(prev => ({ ...prev, [stageIdx]: progress }));
          if (Math.random() > 0.6) {
            setStageOutputs(prev => {
              const existing = prev[stageIdx] || [];
              const lines = [
                isEn ? "Found 3 open ports..." : "Обнаружено 3 открытых порта...",
                isEn ? "Checking CVE database..." : "Проверка базы CVE...",
                isEn ? "Analyzing HTTP headers..." : "Анализ HTTP-заголовков...",
                isEn ? "Detecting software versions..." : "Определение версий ПО...",
                isEn ? "Testing for known vulnerabilities..." : "Тестирование известных уязвимостей...",
                isEn ? "Mapping service dependencies..." : "Построение зависимостей сервисов...",
                isEn ? "Generating knowledge graph edges..." : "Генерация связей графа знаний...",
                isEn ? "Calculating risk scores..." : "Расчёт оценок рисков...",
                isEn ? "Building attack paths..." : "Построение путей атак...",
              ];
              return { ...prev, [stageIdx]: [...existing.slice(-3), lines[Math.floor(Math.random() * lines.length)]] };
            });
          }
        }
      }, 120);
    };

    advanceStage();
  }, [selectedTools, sourceValue, isEn]);

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

      <Container className="py-6 max-w-5xl">
        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">{isEn ? "Select a project" : "Выберите проект"}</h2>
              <p className="text-sm text-muted-2">{isEn ? "Choose an existing project or create a new one." : "Выберите существующий проект или создайте новый."}</p>
            </div>
            <div className="space-y-2">
              {demoProjects.map((project) => (
                <button key={project.id} onClick={() => { setSelectedProject(project.id); setNewProjectName(""); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                    selectedProject === project.id ? "border-accent/50 bg-accent-muted" : "border-border hover:border-border-light bg-surface"
                  }`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedProject === project.id ? "bg-accent text-background" : "bg-surface-2 text-muted-2"}`}>
                    <FolderPlus className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{project.name}</div>
                    <div className="text-xs text-muted-2 mt-0.5">{project.source}</div>
                  </div>
                  {project.lastScan && <div className="text-xs text-muted-2">{isEn ? "Last:" : "Последнее:"} {project.lastScan}</div>}
                  {selectedProject === project.id && <CheckCircle2 className="w-5 h-5 text-accent" />}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-2">{isEn ? "or create new" : "или создайте новый"}</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${newProjectName.trim() ? "border-accent/50 bg-accent-muted" : "border-border bg-surface"}`}>
              <FolderPlus className="w-5 h-5 text-muted-2 shrink-0" />
              <input type="text" value={newProjectName} onChange={(e) => { setNewProjectName(e.target.value); setSelectedProject(null); }}
                placeholder={isEn ? "New project name..." : "Название нового проекта..."}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none" />
            </div>
            <div className="p-3 rounded-lg bg-amber/10 border border-amber/20 flex items-start gap-2.5 text-sm">
              <span className="text-amber font-medium shrink-0">{isEn ? "⚠ Demo" : "⚠ Демо"}</span>
              <span className="text-muted-2">{isEn ? "Projects and results are stored only in the current session." : "Проекты и результаты сохраняются только в текущей сессии."}</span>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!step1Valid}>{isEn ? "Next" : "Далее"} <ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">{isEn ? "Data source" : "Источник данных"}</h2>
              <p className="text-sm text-muted-2">{isEn ? "Where should SIP scan?" : "Откуда SIP будет собирать данные?"}</p>
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
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
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
                  {selectedSource === "website" && (isEn ? "SIP will scan the specified URL and its subpaths." : "SIP просканирует указанный URL и его подпути.")}
                  {selectedSource === "git" && (isEn ? "SIP will clone the repository and analyze its contents." : "SIP склонирует репозиторий и проанализирует его содержимое.")}
                  {selectedSource === "docker" && (isEn ? "SIP will pull and scan the Docker image for vulnerabilities." : "SIP загрузит и просканирует Docker-образ на уязвимости.")}
                  {selectedSource === "folder" && (isEn ? "SIP will scan the specified folder on the server." : "SIP просканирует указанную папку на сервере.")}
                </p>
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="w-4 h-4" /> {isEn ? "Back" : "Назад"}</Button>
              <Button onClick={() => setStep(3)} disabled={!step2Valid}>{isEn ? "Next" : "Далее"} <ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">{isEn ? "Select scan tools" : "Выберите инструменты"}</h2>
              <p className="text-sm text-muted-2">{isEn ? "Choose which engines will run. More tools = deeper analysis." : "Выберите движки для сканирования. Больше инструментов = глубже анализ."}</p>
            </div>
            <div className="space-y-2">
              {scanTools.map((tool) => {
                const isSelected = selectedTools.has(tool.id);
                return (
                  <button key={tool.id} onClick={() => !tool.inDevelopment && toggleTool(tool.id)} disabled={tool.inDevelopment}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                      tool.inDevelopment ? "border-border bg-surface/50 opacity-60 cursor-not-allowed" : isSelected ? "border-accent/50 bg-accent-muted" : "border-border hover:border-border-light bg-surface"
                    }`}>
                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 transition-all ${
                      tool.inDevelopment ? "border-border" : isSelected ? "border-accent bg-accent" : "border-muted-2"
                    }`}>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-background" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{tool.name}</span>
                        {tool.inDevelopment && <Badge variant="default">{isEn ? "Coming soon" : "Скоро"}</Badge>}
                      </div>
                      <div className="text-xs text-muted-2 mt-0.5">{tool.description[locale]}</div>
                    </div>
                    <div className="text-xs text-muted-2 shrink-0">{tool.inDevelopment ? (isEn ? "Not available" : "Недоступен") : (isEn ? "Available" : "Доступен")}</div>
                  </button>
                );
              })}
            </div>
            <div className="p-3 rounded-lg bg-surface-2 border border-border flex items-center justify-between">
              <span className="text-sm text-muted-2">{isEn ? `Selected: ${selectedTools.size} tools` : `Выбрано: ${selectedTools.size} инстр.`}</span>
              <span className="text-xs text-muted">{Array.from(selectedTools).map(id => scanTools.find(t => t.id === id)?.name).join(" + ")}</span>
            </div>
            <div className="p-4 rounded-xl border border-accent/20 bg-accent-muted/30 flex items-center gap-3">
              <Store className="w-5 h-5 text-accent shrink-0" />
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground">{isEn ? "Need more tools?" : "Нужно больше инструментов?"}</span>
                <span className="text-xs text-muted-2 block">{isEn ? "Install additional scanners from the Marketplace." : "Установите дополнительные сканеры из Каталога."}</span>
              </div>
              <a href="/app/marketplace" className="text-xs text-accent hover:underline flex items-center gap-1">{isEn ? "Browse" : "Каталог"} <ExternalLink className="w-3 h-3" /></a>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}><ChevronLeft className="w-4 h-4" /> {isEn ? "Back" : "Назад"}</Button>
              <Button onClick={runPipeline} disabled={!step3Valid}><Play className="w-4 h-4" /> {isEn ? "Start Scan" : "Начать сканирование"}</Button>
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-2">
              <span className="px-2.5 py-1 rounded-md bg-surface-2 border border-border">{newProjectName || demoProjects.find(p => p.id === selectedProject)?.name || (isEn ? "New Project" : "Новый проект")}</span>
              <span className="px-2.5 py-1 rounded-md bg-surface-2 border border-border font-mono">{sourceValue || "demo"}</span>
              <span className="px-2.5 py-1 rounded-md bg-accent-muted text-accent border border-accent/20">{Array.from(selectedTools).map(id => scanTools.find(t => t.id === id)?.name).join(" + ")}</span>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-2 border border-border">
              {[
                { key: "pipeline", label: isEn ? "Pipeline" : "Пайплайн" },
                { key: "findings", label: isEn ? "Findings" : "Находки" },
                { key: "next", label: isEn ? "What's next?" : "Что дальше?" },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveResultTab(tab.key as "pipeline" | "findings" | "next")}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${activeResultTab === tab.key ? "bg-accent text-background" : "text-muted-2 hover:text-foreground"}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {activeResultTab === "pipeline" && (
              <div className="space-y-2">
                {pipelineStages.map((stage, i) => (
                  <PipelineStageCard key={stage.id} stage={stage} index={i}
                    status={pipelineComplete ? "completed" : currentStage > i ? "completed" : currentStage === i ? "running" : "pending"}
                    progress={stageProgress[i] || 0} outputs={stageOutputs[i] || []} isLast={i === pipelineStages.length - 1} />
                ))}
                {pipelineComplete && (
                  <div className="mt-4 p-4 rounded-xl bg-accent-muted border border-accent/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-accent" />
                      <span className="text-sm font-semibold text-foreground">{isEn ? "Scan complete!" : "Сканирование завершено!"}</span>
                    </div>
                    <p className="text-xs text-muted-2">{isEn ? `${demoFindings.length} findings detected. Risk score: 78/100.` : `${demoFindings.length} находок обнаружено. Оценка риска: 78/100.`}</p>
                  </div>
                )}
              </div>
            )}

            {activeResultTab === "findings" && (
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-2">
                  {(["critical", "high", "medium", "low", "info"] as Severity[]).map(sev => {
                    const count = demoFindings.filter(f => f.severity === sev).length;
                    return (
                      <div key={sev} className="p-3 rounded-lg bg-surface border border-border text-center">
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
                        <div className="text-xs text-muted-2 mt-0.5">{finding.asset}</div>
                      </div>
                      <Badge variant={finding.severity === "critical" ? "critical" : finding.severity === "high" ? "high" : "default"}>{finding.severity.toUpperCase()}</Badge>
                    </div>
                    {expandedFinding === finding.id && (
                      <div className="mt-3 pt-3 border-t border-border space-y-2">
                        <div><span className="text-xs text-muted-2">{isEn ? "Description:" : "Описание:"}</span><p className="text-sm text-foreground mt-0.5">{finding.description}</p></div>
                        {finding.recommendation && <div><span className="text-xs text-muted-2">{isEn ? "Recommendation:" : "Рекомендация:"}</span><p className="text-sm text-foreground mt-0.5">{finding.recommendation}</p></div>}
                        {(finding.cve || finding.mitre) && <div className="flex items-center gap-2 flex-wrap">{finding.cve && <Badge variant="default">{finding.cve}</Badge>}{finding.mitre && <Badge variant="default">{finding.mitre}</Badge>}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeResultTab === "next" && pipelineComplete && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-accent-muted border border-accent/20">
                  <h3 className="text-sm font-semibold text-foreground mb-1">{isEn ? "Scan completed successfully!" : "Сканирование успешно завершено!"}</h3>
                  <p className="text-xs text-muted-2">{isEn ? "Here's what you can do next:" : "Вот что вы можете сделать:"}</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <a href="/app/demo/knowledge-graph" className="p-4 rounded-xl bg-surface border border-border hover:border-accent/30 transition-all group">
                    <div className="flex items-center gap-2 mb-2"><ShieldCheck className="w-5 h-5 text-accent" /><span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">{isEn ? "View Knowledge Graph" : "Открыть граф знаний"}</span></div>
                    <p className="text-xs text-muted-2">{isEn ? "Explore the map of your infrastructure and connections." : "Исследуйте карту инфраструктуры и связи."}</p>
                  </a>
                  <a href="/app/demo/attack-paths" className="p-4 rounded-xl bg-surface border border-border hover:border-accent/30 transition-all group">
                    <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-5 h-5 text-amber" /><span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">{isEn ? "View Attack Paths" : "Открыть пути атак"}</span></div>
                    <p className="text-xs text-muted-2">{isEn ? "See how an attacker could chain vulnerabilities." : "Посмотрите, как злоумышленник может объединить уязвимости."}</p>
                  </a>
                  <a href="/app/reports" className="p-4 rounded-xl bg-surface border border-border hover:border-accent/30 transition-all group">
                    <div className="flex items-center gap-2 mb-2"><BookOpen className="w-5 h-5 text-purple" /><span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">{isEn ? "Generate Report" : "Создать отчёт"}</span></div>
                    <p className="text-xs text-muted-2">{isEn ? "Download a structured report for your team." : "Скачайте структурированный отчёт для команды."}</p>
                  </a>
                  <a href="/app/marketplace" className="p-4 rounded-xl bg-surface border border-border hover:border-accent/30 transition-all group">
                    <div className="flex items-center gap-2 mb-2"><Store className="w-5 h-5 text-cyan" /><span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">{isEn ? "Install More Tools" : "Установить инструменты"}</span></div>
                    <p className="text-xs text-muted-2">{isEn ? "Expand scanning capabilities from Marketplace." : "Расширьте возможности сканирования из Каталога."}</p>
                  </a>
                </div>
                <div className="p-3 rounded-lg bg-amber/10 border border-amber/20 flex items-start gap-2.5 text-sm">
                  <span className="text-amber font-medium shrink-0">{isEn ? "⚠ Demo Scenario" : "⚠ Демо-сценарий"}</span>
                  <span className="text-muted-2">{isEn ? "This example demonstrates SIP's capabilities. After connecting real tools, results will be generated automatically." : "Этот пример демонстрирует возможности SIP. После подключения реальных инструментов результаты будут формироваться автоматически."}</span>
                </div>
                <div className="flex justify-center pt-2">
                  <Button variant="outline" onClick={() => { setStep(1); setPipelineComplete(false); setPipelineRunning(false); }}>
                    <Play className="w-4 h-4" /> {isEn ? "Start New Scan" : "Новое сканирование"}
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
