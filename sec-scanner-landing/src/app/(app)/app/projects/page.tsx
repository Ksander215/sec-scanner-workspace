"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Rocket,
  Shield,
  GitBranch,
  Server,
  Terminal,
  Play,
  Settings,
  Trash2,
  Users,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  BarChart3,
  ScanSearch,
  Bell,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { useToast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";
import { Panel } from "@/components/ui/Panel";
import { Tabs } from "@/components/ui/Tabs";
import {
  getProjects,
  createProject,
  deleteProject,
  type Project,
  type Repository,
  type SSHConnection,
} from "@/lib/engine";

// ─── Types ─────────────────────────────────────────────────────────────────

type OnboardingStep = 1 | 2 | 3 | 4 | 5;
type DetailTab = "overview" | "scans" | "findings" | "integrations" | "settings";

interface MockProjectData {
  totalFindings: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  recentScans: { id: string; date: string; status: "completed" | "failed"; findings: number }[];
}

// ─── Status Config ─────────────────────────────────────────────────────────

const statusConfig: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
  healthy: { color: "text-accent", bg: "bg-accent-muted", icon: CheckCircle2 },
  warning: { color: "text-amber", bg: "bg-amber-muted", icon: AlertTriangle },
  critical: { color: "text-red", bg: "bg-red-muted", icon: XCircle },
  idle: { color: "text-muted-2", bg: "bg-surface-2", icon: Clock },
};

// ─── Mock enrichment data ──────────────────────────────────────────────────

const mockProjectData: Record<string, MockProjectData> = {
  "PRJ-001": {
    totalFindings: 47,
    criticalCount: 3,
    highCount: 8,
    mediumCount: 21,
    lowCount: 15,
    recentScans: [
      { id: "S-001", date: "2 min ago", status: "completed", findings: 12 },
      { id: "S-002", date: "1 day ago", status: "completed", findings: 15 },
      { id: "S-003", date: "3 days ago", status: "failed", findings: 0 },
    ],
  },
  "PRJ-002": {
    totalFindings: 23,
    criticalCount: 1,
    highCount: 5,
    mediumCount: 10,
    lowCount: 7,
    recentScans: [
      { id: "S-004", date: "1 hour ago", status: "completed", findings: 8 },
    ],
  },
  "PRJ-003": {
    totalFindings: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    recentScans: [],
  },
  "PRJ-004": {
    totalFindings: 12,
    criticalCount: 0,
    highCount: 3,
    mediumCount: 6,
    lowCount: 3,
    recentScans: [
      { id: "S-005", date: "5 min ago", status: "completed", findings: 4 },
    ],
  },
};

// Mock repository & server connections per project
const mockRepoConnections: Record<string, Repository> = {
  "PRJ-001": {
    id: "repo-1",
    type: "github",
    url: "https://github.com/acme/production-api",
    branch: "main",
    authType: "token",
    name: "acme/production-api",
    connectedAt: "2026-01-20T08:00:00Z",
    lastCommit: "a1b2c3d",
    lastCommitDate: "2026-03-01T10:00:00Z",
    fileCount: 342,
    languages: ["TypeScript", "Python", "Go"],
    status: "connected",
  },
  "PRJ-002": {
    id: "repo-2",
    type: "gitlab",
    url: "https://gitlab.com/acme/staging-app",
    branch: "develop",
    authType: "ssh",
    name: "acme/staging-app",
    connectedAt: "2026-02-15T10:00:00Z",
    lastCommit: "e4f5g6h",
    lastCommitDate: "2026-02-28T14:00:00Z",
    fileCount: 218,
    languages: ["JavaScript", "Ruby"],
    status: "connected",
  },
};

const mockServerConnections: Record<string, SSHConnection[]> = {
  "PRJ-001": [
    {
      id: "srv-1",
      name: "prod-web-01",
      host: "10.0.1.10",
      port: 22,
      username: "deploy",
      authType: "key",
      keyId: "key-1",
      serverType: "ubuntu",
      status: "connected",
      connectedAt: "2026-01-22T08:00:00Z",
      lastUsed: "2 min ago",
      os: "Ubuntu 22.04",
      uptime: "45 days",
    },
    {
      id: "srv-2",
      name: "prod-db-01",
      host: "10.0.1.20",
      port: 22,
      username: "admin",
      authType: "key",
      keyId: "key-1",
      serverType: "ubuntu",
      status: "connected",
      connectedAt: "2026-01-22T08:00:00Z",
      lastUsed: "5 min ago",
      os: "Ubuntu 22.04",
      uptime: "60 days",
    },
  ],
};

// ─── Score Ring Component ──────────────────────────────────────────────────

function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const radius = (size / 2) - 4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#00ff88" : score >= 60 ? "#ffb800" : "#ff4444";
  const center = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="-rotate-90" viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke="var(--color-border)" strokeWidth="4"
        />
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-bold text-foreground" style={{ fontSize: size * 0.22 }}>{score}</span>
      </div>
    </div>
  );
}

// ─── Large Score Ring for Detail ───────────────────────────────────────────

function LargeScoreRing({ score }: { score: number }) {
  return <ScoreRing score={score} size={120} />;
}

// ─── Code Block with Copy ─────────────────────────────────────────────────

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className="rounded-lg bg-[#0d1117] border border-border overflow-hidden">
      {label && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-surface-2">
          <span className="text-xs font-medium text-muted-2">{label}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-muted-2 hover:text-accent transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
      <pre className="p-3 text-xs text-[#c9d1d9] overflow-x-auto font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ─── Findings Mini Bar Chart ───────────────────────────────────────────────

function FindingsBarChart({ data }: { data: { critical: number; high: number; medium: number; low: number } }) {
  const total = data.critical + data.high + data.medium + data.low;
  if (total === 0) return null;

  const segments = [
    { value: data.critical, color: "#ff4444", label: "Critical" },
    { value: data.high, color: "#ffb800", label: "High" },
    { value: data.medium, color: "#00d4ff", label: "Medium" },
    { value: data.low, color: "#00ff88", label: "Low" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex rounded-full overflow-hidden h-2 bg-surface-2">
        {segments.map((seg) =>
          seg.value > 0 ? (
            <div
              key={seg.label}
              style={{ width: `${(seg.value / total) * 100}%`, backgroundColor: seg.color }}
              className="transition-all duration-500"
            />
          ) : null
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-muted-2">{seg.label}</span>
            <span className="font-medium text-foreground ml-auto">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Onboarding Wizard ─────────────────────────────────────────────────────

function OnboardingWizard({
  isOpen,
  onClose,
  onComplete,
  t,
}: {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (name: string, description: string) => void;
  t: (key: string) => string;
}) {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const stepDescriptions: Record<OnboardingStep, string> = {
    1: t("projects.onboarding.step1Desc"),
    2: t("projects.onboarding.step2Desc"),
    3: t("projects.onboarding.step3Desc"),
    4: t("projects.onboarding.step4Desc"),
    5: t("projects.onboarding.step5Desc"),
  };

  const handleClose = useCallback(() => {
    setStep(1);
    setName("");
    setDescription("");
    onClose();
  }, [onClose]);

  const handleNext = useCallback(() => {
    if (step === 1 && !name.trim()) return;
    if (step < 5) setStep((s) => (s + 1) as OnboardingStep);
    if (step === 5) {
      onComplete(name, description);
      handleClose();
    }
  }, [step, name, description, onComplete, handleClose]);

  const handleSkip = useCallback(() => {
    if (step === 1) return; // Can't skip step 1
    if (step < 5) setStep((s) => (s + 1) as OnboardingStep);
    if (step === 5) {
      onComplete(name, description);
      handleClose();
    }
  }, [step, name, description, onComplete, handleClose]);

  const handleBack = useCallback(() => {
    if (step > 1) setStep((s) => (s - 1) as OnboardingStep);
  }, [step]);

  const progress = (step / 5) * 100;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress bar */}
          <div className="h-1 bg-surface-2">
            <motion.div
              className="h-full bg-accent"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {t("projects.onboarding.title")}
              </h2>
              <p className="text-xs text-muted-2 mt-0.5">
                {t("projects.onboarding.step" + step)} — {step}/5
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-surface-2 text-muted-2 hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step indicator dots */}
          <div className="flex items-center justify-center gap-2 px-6 py-3 bg-surface/50">
            {([1, 2, 3, 4, 5] as OnboardingStep[]).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    s === step
                      ? "bg-accent scale-125"
                      : s < step
                        ? "bg-accent/60"
                        : "bg-border"
                  }`}
                />
                {s < 5 && (
                  <div
                    className={`w-6 h-0.5 rounded transition-all duration-300 ${
                      s < step ? "bg-accent/60" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="px-6 py-6 min-h-[280px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-sm text-muted-2 mb-5">{stepDescriptions[step]}</p>

                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1.5">
                        {t("projects.onboarding.name")}
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t("projects.onboarding.namePlaceholder")}
                        className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1.5">
                        {t("projects.onboarding.description")}
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t("projects.onboarding.descriptionPlaceholder")}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all resize-none"
                      />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-2 border border-border">
                      <div className="w-10 h-10 rounded-lg bg-purple/10 flex items-center justify-center">
                        <GitBranch className="w-5 h-5 text-purple" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {t("projects.onboarding.step2")}
                        </p>
                        <p className="text-xs text-muted-2 mt-0.5">
                          GitHub, GitLab, Bitbucket, Azure DevOps
                        </p>
                      </div>
                    </div>
                    <a
                      href="/app/repositories"
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-surface-2 border border-border hover:border-border-light text-sm font-medium text-foreground hover:text-accent transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {t("projects.onboarding.goToRepo")}
                    </a>
                    <p className="text-xs text-muted-2 text-center">
                      You can connect a repository later from project settings
                    </p>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-2 border border-border">
                      <div className="w-10 h-10 rounded-lg bg-cyan/10 flex items-center justify-center">
                        <Server className="w-5 h-5 text-cyan" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {t("projects.onboarding.step3")}
                        </p>
                        <p className="text-xs text-muted-2 mt-0.5">
                          SSH connections for remote scanning & monitoring
                        </p>
                      </div>
                    </div>
                    <a
                      href="/app/integrations/ssh"
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-surface-2 border border-border hover:border-border-light text-sm font-medium text-foreground hover:text-accent transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {t("projects.onboarding.goToSSH")}
                    </a>
                    <p className="text-xs text-muted-2 text-center">
                      Connect servers later from project integrations
                    </p>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-2 border border-border">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Terminal className="w-5 h-5 text-accent" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {t("projects.onboarding.step4")}
                        </p>
                        <p className="text-xs text-muted-2 mt-0.5">
                          Deploy the SIP Agent to enable continuous monitoring
                        </p>
                      </div>
                    </div>
                    <CodeBlock
                      label={t("projects.onboarding.agentDocker")}
                      code={t("projects.onboarding.agentDockerCmd")}
                    />
                    <CodeBlock
                      label={t("projects.onboarding.agentCurl")}
                      code={t("projects.onboarding.agentCurlCmd")}
                    />
                  </div>
                )}

                {step === 5 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-2 border border-border">
                      <div className="w-10 h-10 rounded-lg bg-amber/10 flex items-center justify-center">
                        <ScanSearch className="w-5 h-5 text-amber" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {t("projects.onboarding.step5")}
                        </p>
                        <p className="text-xs text-muted-2 mt-0.5">
                          Run your first security scan on this project
                        </p>
                      </div>
                    </div>
                    <a
                      href="/app/scanner"
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-accent text-background font-medium text-sm hover:bg-accent-hover shadow-[0_0_20px_rgba(0,255,136,0.15)] transition-all"
                    >
                      <Play className="w-4 h-4" />
                      {t("projects.onboarding.goToScanner")}
                    </a>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface/50">
            <div>
              {step > 1 && (
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ChevronLeft className="w-4 h-4" />
                  {t("projects.onboarding.back")}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {step > 1 && (
                <Button variant="ghost" size="sm" onClick={handleSkip}>
                  {t("projects.onboarding.skip")}
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={handleNext}
                disabled={step === 1 && !name.trim()}
              >
                {step === 5 ? t("projects.onboarding.finish") : t("projects.onboarding.next")}
                {step < 5 && <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Project Card ──────────────────────────────────────────────────────────

function ProjectCard({
  project,
  mockData,
  repo,
  servers,
  onClick,
  onScan,
  onDelete,
  t,
}: {
  project: Project;
  mockData: MockProjectData;
  repo?: Repository;
  servers?: SSHConnection[];
  onClick: () => void;
  onScan: () => void;
  onDelete: () => void;
  t: (key: string) => string;
}) {
  const config = statusConfig[project.status];
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="group rounded-xl bg-surface border border-border hover:border-border-light transition-all duration-200 overflow-hidden"
    >
      {/* Card header with score */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          <ScoreRing score={project.securityScore} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className="text-base font-semibold text-foreground group-hover:text-accent transition-colors cursor-pointer truncate"
                onClick={onClick}
              >
                {project.name}
              </h3>
              <Badge
                variant={
                  project.status === "critical"
                    ? "critical"
                    : project.status === "warning"
                      ? "high"
                      : project.status === "healthy"
                        ? "low"
                        : "default"
                }
              >
                <StatusIcon className="w-3 h-3 mr-1" />
                {t(`projects.status.${project.status}`)}
              </Badge>
            </div>
            <p className="text-xs text-muted-2 mt-1 line-clamp-2">
              {project.description}
            </p>

            {/* Integration badges */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {repo && (
                <Badge variant="category">
                  <GitBranch className="w-3 h-3 mr-1" />
                  {repo.name}
                </Badge>
              )}
              {servers && servers.length > 0 && (
                <Badge variant="category">
                  <Server className="w-3 h-3 mr-1" />
                  {servers.length} {t("projects.connectedServers")}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">{mockData.totalFindings}</div>
            <div className="text-[10px] text-muted-2 uppercase tracking-wider">
              {t("projects.totalFindings")}
            </div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red">{mockData.criticalCount}</div>
            <div className="text-[10px] text-muted-2 uppercase tracking-wider">
              {t("projects.criticalFindings")}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-foreground">
              {project.lastScan || "—"}
            </div>
            <div className="text-[10px] text-muted-2 uppercase tracking-wider">
              {t("projects.lastScan")}
            </div>
          </div>
        </div>
      </div>

      {/* Card actions */}
      <div className="flex items-center border-t border-border">
        <button
          onClick={onClick}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-foreground hover:text-accent hover:bg-surface-2 transition-all cursor-pointer"
        >
          {t("projects.open")}
        </button>
        <div className="w-px h-5 bg-border" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onScan();
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-foreground hover:text-accent hover:bg-surface-2 transition-all cursor-pointer"
        >
          <Play className="w-3 h-3" />
          {t("projects.scan")}
        </button>
        <div className="w-px h-5 bg-border" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted-2 hover:text-red hover:bg-red/5 transition-all cursor-pointer"
        >
          <Trash2 className="w-3 h-3" />
          {t("projects.delete")}
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-4 px-5 py-2.5 bg-surface/50 border-t border-border text-xs text-muted-2">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3 h-3" />
          <span>{project.assets} {t("projects.assets").toLowerCase()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="w-3 h-3" />
          <span>{project.members} {t("projects.members").toLowerCase()}</span>
        </div>
        <span className="ml-auto">
          {project.lastScan
            ? `${t("projects.lastScan")}: ${project.lastScan}`
            : t("projects.noScans")}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Project Detail View ──────────────────────────────────────────────────

function ProjectDetail({
  project,
  mockData,
  repo,
  servers,
  onBack,
  t,
}: {
  project: Project;
  mockData: MockProjectData;
  repo?: Repository;
  servers?: SSHConnection[];
  onBack: () => void;
  t: (key: string) => string;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [autoScan, setAutoScan] = useState(project.settings.autoScan);

  const tabs = [
    { key: "overview", label: t("projects.overview"), icon: BarChart3 },
    { key: "scans", label: t("projects.scans"), icon: ScanSearch },
    { key: "findings", label: t("projects.findings"), icon: Shield },
    { key: "integrations", label: t("projects.integrations"), icon: GitBranch },
    { key: "settings", label: t("projects.settings"), icon: Settings },
  ];

  const config = statusConfig[project.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-2 hover:text-foreground transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("projects.title")}
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <ScoreRing score={project.securityScore} size={56} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">{project.name}</h2>
              <Badge
                variant={
                  project.status === "critical"
                    ? "critical"
                    : project.status === "warning"
                      ? "high"
                      : project.status === "healthy"
                        ? "low"
                        : "default"
                }
              >
                {t(`projects.status.${project.status}`)}
              </Badge>
            </div>
            <p className="text-sm text-muted-2 mt-0.5">{project.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="/app/scanner">
            <Button variant="primary" size="sm">
              <Play className="w-4 h-4" />
              {t("projects.scan")}
            </Button>
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <Tabs
          tabs={tabs.map((tab) => ({ key: tab.key, label: tab.label, icon: tab.icon }))}
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as DetailTab)}
        />
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Panel title={t("projects.securityScore")}>
                <div className="flex items-center justify-center py-4">
                  <LargeScoreRing score={project.securityScore} />
                </div>
                <div className="text-center mt-2">
                  <span className={`text-sm font-medium ${config.color}`}>
                    {t(`projects.status.${project.status}`)}
                  </span>
                </div>
              </Panel>

              <Panel title={t("projects.findingsDistribution")}>
                <div className="py-2">
                  {mockData.totalFindings > 0 ? (
                    <FindingsBarChart
                      data={{
                        critical: mockData.criticalCount,
                        high: mockData.highCount,
                        medium: mockData.mediumCount,
                        low: mockData.lowCount,
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-2">
                      <CheckCircle2 className="w-8 h-8 text-accent mb-2" />
                      <p className="text-sm">{t("projects.noScans")}</p>
                    </div>
                  )}
                </div>
              </Panel>

              <Panel title={t("projects.recentScans")}>
                {mockData.recentScans.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {mockData.recentScans.map((scan) => (
                      <div
                        key={scan.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-surface-2 border border-border"
                      >
                        <div className="flex items-center gap-2">
                          {scan.status === "completed" ? (
                            <CheckCircle2 className="w-4 h-4 text-accent" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red" />
                          )}
                          <span className="text-xs text-foreground">{scan.id}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-2">{scan.date}</span>
                          {scan.findings > 0 && (
                            <span className="ml-2 text-xs text-amber">{scan.findings} findings</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-2">
                    <Clock className="w-8 h-8 mb-2" />
                    <p className="text-sm">{t("projects.noScans")}</p>
                  </div>
                )}
              </Panel>
            </div>
          )}

          {/* Scans Tab */}
          {activeTab === "scans" && (
            <Panel title={t("projects.recentScans")}>
              {mockData.recentScans.length > 0 ? (
                <div className="space-y-3">
                  {mockData.recentScans.map((scan) => (
                    <div
                      key={scan.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-surface-2 border border-border hover:border-border-light transition-all"
                    >
                      <div className="flex items-center gap-3">
                        {scan.status === "completed" ? (
                          <div className="w-8 h-8 rounded-lg bg-accent-muted flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-accent" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-red-muted flex items-center justify-center">
                            <XCircle className="w-4 h-4 text-red" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">{scan.id}</p>
                          <p className="text-xs text-muted-2">{scan.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={scan.status === "completed" ? "low" : "critical"}>
                          {scan.status}
                        </Badge>
                        <span className="text-sm text-muted-2">
                          {scan.findings > 0 ? `${scan.findings} findings` : "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-2">
                  <ScanSearch className="w-10 h-10 mb-3" />
                  <p className="text-sm font-medium">{t("projects.noScans")}</p>
                  <a href="/app/scanner" className="mt-3">
                    <Button variant="outline" size="sm">
                      <Play className="w-4 h-4" />
                      {t("projects.scan")}
                    </Button>
                  </a>
                </div>
              )}
            </Panel>
          )}

          {/* Findings Tab */}
          {activeTab === "findings" && (
            <Panel title={t("projects.findingsDistribution")}>
              {mockData.totalFindings > 0 ? (
                <div className="space-y-4">
                  <FindingsBarChart
                    data={{
                      critical: mockData.criticalCount,
                      high: mockData.highCount,
                      medium: mockData.mediumCount,
                      low: mockData.lowCount,
                    }}
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-border">
                    <div className="p-3 rounded-lg bg-red-muted/30 border border-red/20 text-center">
                      <div className="text-2xl font-bold text-red">{mockData.criticalCount}</div>
                      <div className="text-xs text-muted-2">Critical</div>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-muted/30 border border-amber/20 text-center">
                      <div className="text-2xl font-bold text-amber">{mockData.highCount}</div>
                      <div className="text-xs text-muted-2">High</div>
                    </div>
                    <div className="p-3 rounded-lg bg-cyan-muted/30 border border-cyan/20 text-center">
                      <div className="text-2xl font-bold text-cyan">{mockData.mediumCount}</div>
                      <div className="text-xs text-muted-2">Medium</div>
                    </div>
                    <div className="p-3 rounded-lg bg-accent-muted/30 border border-accent/20 text-center">
                      <div className="text-2xl font-bold text-accent">{mockData.lowCount}</div>
                      <div className="text-xs text-muted-2">Low</div>
                    </div>
                  </div>
                  <a href="/app/findings" className="block mt-2">
                    <Button variant="outline" size="sm" className="w-full">
                      {t("projects.findings")}
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </a>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-2">
                  <Shield className="w-10 h-10 mb-3" />
                  <p className="text-sm font-medium">No findings yet</p>
                </div>
              )}
            </Panel>
          )}

          {/* Integrations Tab */}
          {activeTab === "integrations" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Connected Repository */}
              <Panel title={t("projects.onboarding.step2")}>
                {repo ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 border border-border">
                      <div className="w-8 h-8 rounded-lg bg-purple/10 flex items-center justify-center">
                        <GitBranch className="w-4 h-4 text-purple" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{repo.name}</p>
                        <p className="text-xs text-muted-2 truncate">{repo.url}</p>
                      </div>
                      <Badge variant="low">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {t("projects.connectedRepo")}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-surface-2 border border-border">
                        <span className="text-muted-2">Branch:</span>{" "}
                        <span className="text-foreground font-medium">{repo.branch}</span>
                      </div>
                      <div className="p-2 rounded bg-surface-2 border border-border">
                        <span className="text-muted-2">Files:</span>{" "}
                        <span className="text-foreground font-medium">{repo.fileCount || "—"}</span>
                      </div>
                      {repo.languages && (
                        <div className="col-span-2 p-2 rounded bg-surface-2 border border-border">
                          <span className="text-muted-2">Languages:</span>{" "}
                          <span className="text-foreground font-medium">{repo.languages.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-2">
                    <GitBranch className="w-8 h-8 mb-2" />
                    <p className="text-sm">{t("projects.noRepo")}</p>
                    <a href="/app/repositories" className="mt-3">
                      <Button variant="outline" size="sm">
                        {t("projects.onboarding.goToRepo")}
                      </Button>
                    </a>
                  </div>
                )}
              </Panel>

              {/* Connected Servers */}
              <Panel title={t("projects.onboarding.step3")}>
                {servers && servers.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {servers.map((srv) => (
                      <div
                        key={srv.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-surface-2 border border-border"
                      >
                        <div className="w-8 h-8 rounded-lg bg-cyan/10 flex items-center justify-center">
                          <Server className="w-4 h-4 text-cyan" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{srv.name}</p>
                          <p className="text-xs text-muted-2">
                            {srv.host}:{srv.port} · {srv.os || srv.serverType}
                          </p>
                        </div>
                        <Badge variant="low">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-2">
                    <Server className="w-8 h-8 mb-2" />
                    <p className="text-sm">{t("projects.noServers")}</p>
                    <a href="/app/integrations/ssh" className="mt-3">
                      <Button variant="outline" size="sm">
                        {t("projects.onboarding.goToSSH")}
                      </Button>
                    </a>
                  </div>
                )}
              </Panel>

              {/* Notifications */}
              <Panel title={t("projects.notifications")} className="lg:col-span-2">
                <div className="space-y-2">
                  {(project.settings.notificationChannels.length > 0
                    ? project.settings.notificationChannels
                    : ["email", "slack"]
                  ).map((channel) => (
                    <div
                      key={channel}
                      className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber/10 flex items-center justify-center">
                          <Bell className="w-4 h-4 text-amber" />
                        </div>
                        <span className="text-sm font-medium text-foreground capitalize">{channel}</span>
                      </div>
                      <Badge variant={project.settings.notificationChannels.includes(channel) ? "low" : "default"}>
                        {project.settings.notificationChannels.includes(channel) ? "Active" : "Not configured"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="max-w-2xl space-y-4">
              <Panel title={t("projects.name")}>
                <input
                  type="text"
                  defaultValue={project.name}
                  className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
                />
              </Panel>

              <Panel title={t("projects.description")}>
                <textarea
                  defaultValue={project.description}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all resize-none"
                />
              </Panel>

              <Panel title={t("projects.autoScan")}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-foreground">Enable automatic scanning</p>
                    <p className="text-xs text-muted-2 mt-0.5">
                      Automatically run scans based on the configured schedule
                    </p>
                  </div>
                  <button
                    onClick={() => setAutoScan(!autoScan)}
                    className="cursor-pointer text-accent"
                  >
                    {autoScan ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-muted-2" />
                    )}
                  </button>
                </div>
              </Panel>

              {autoScan && (
                <Panel title={t("projects.scanSchedule")}>
                  <select
                    defaultValue={project.settings.scanSchedule || "0 2 * * *"}
                    className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
                  >
                    <option value="0 2 * * *">Daily at 2:00 AM</option>
                    <option value="0 2 * * 1">Weekly on Monday at 2:00 AM</option>
                    <option value="0 2 1 * *">Monthly on 1st at 2:00 AM</option>
                    <option value="0 */6 * * *">Every 6 hours</option>
                    <option value="0 */12 * * *">Every 12 hours</option>
                  </select>
                </Panel>
              )}

              <Panel title={t("projects.notifications")}>
                <div className="space-y-3">
                  {["email", "slack", "telegram", "webhook"].map((channel) => (
                    <label
                      key={channel}
                      className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-border cursor-pointer hover:border-border-light transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Bell className="w-4 h-4 text-muted-2" />
                        <span className="text-sm text-foreground capitalize">{channel}</span>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked={project.settings.notificationChannels.includes(channel)}
                        className="w-4 h-4 rounded accent-[#00ff88]"
                      />
                    </label>
                  ))}
                </div>
              </Panel>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm">
                  Cancel
                </Button>
                <Button variant="primary" size="sm">
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────

function EmptyState({ onCreate, t }: { onCreate: () => void; t: (key: string) => string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <div className="w-20 h-20 rounded-2xl bg-accent-muted flex items-center justify-center mb-6">
        <Rocket className="w-10 h-10 text-accent" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {t("projects.noProjects")}
      </h3>
      <p className="text-sm text-muted-2 max-w-md text-center mb-6">
        {t("projects.noProjectsDesc")}
      </p>
      <Button variant="primary" size="lg" onClick={onCreate}>
        <Plus className="w-5 h-5" />
        {t("projects.create")}
      </Button>
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const { t } = useI18n();
  const { addToast } = useToast();
  const [projects, setProjects] = useState<Project[]>(() => {
    if (typeof window === "undefined") return [];
    const loadedProjects = getProjects();
    return loadedProjects.map((p) => {
      const repo = mockRepoConnections[p.id];
      const srvs = mockServerConnections[p.id];
      return {
        ...p,
        repository: repo,
        servers: srvs,
      } as Project;
    });
  });
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleCreateProject = useCallback(
    (name: string, description: string) => {
      const newProject = createProject(name, description);
      setProjects((prev) => [newProject, ...prev]);
      addToast({
        type: "success",
        title: t("projects.createSuccess"),
        description: name,
      });
    },
    [addToast, t]
  );

  const handleDeleteProject = useCallback(
    (id: string, name: string) => {
      if (window.confirm(`${t("projects.deleteConfirm")}`)) {
        deleteProject(id);
        setProjects((prev) => prev.filter((p) => p.id !== id));
        if (selectedProject?.id === id) {
          setSelectedProject(null);
        }
        addToast({
          type: "info",
          title: t("projects.deleteSuccess"),
          description: name,
        });
      }
    },
    [addToast, t, selectedProject]
  );

  const handleScanProject = useCallback(
    (project: Project) => {
      addToast({
        type: "info",
        title: "Redirecting to Scanner",
        description: project.name,
      });
      window.location.href = "/app/scanner";
    },
    [addToast]
  );

  // Show detail view
  if (selectedProject) {
    const mockData = mockProjectData[selectedProject.id] || {
      totalFindings: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      recentScans: [],
    };
    return (
      <div className="animate-page-in">
        <Container>
          <div className="py-8">
            <ProjectDetail
              project={selectedProject}
              mockData={mockData}
              repo={mockRepoConnections[selectedProject.id]}
              servers={mockServerConnections[selectedProject.id]}
              onBack={() => setSelectedProject(null)}
              t={t}
            />
          </div>
        </Container>
      </div>
    );
  }

  // Show empty state or project list
  return (
    <div className="animate-page-in">
      <PageHeader
        title={t("projects.title")}
        description={t("projects.subtitle")}
      >
        <div className="mt-6">
          <Button variant="primary" size="md" onClick={() => setWizardOpen(true)}>
            <Plus className="w-4 h-4" />
            {t("projects.create")}
          </Button>
        </div>
      </PageHeader>

      <Container>
        <div className="py-8">
          {projects.length === 0 ? (
            <EmptyState onCreate={() => setWizardOpen(true)} t={t} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {projects.map((project, i) => {
                const mockData = mockProjectData[project.id] || {
                  totalFindings: 0,
                  criticalCount: 0,
                  highCount: 0,
                  mediumCount: 0,
                  lowCount: 0,
                  recentScans: [],
                };
                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <ProjectCard
                      project={project}
                      mockData={mockData}
                      repo={mockRepoConnections[project.id]}
                      servers={mockServerConnections[project.id]}
                      onClick={() => setSelectedProject(project)}
                      onScan={() => handleScanProject(project)}
                      onDelete={() =>
                        handleDeleteProject(project.id, project.name)
                      }
                      t={t}
                    />
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </Container>

      <OnboardingWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={handleCreateProject}
        t={t}
      />
    </div>
  );
}
