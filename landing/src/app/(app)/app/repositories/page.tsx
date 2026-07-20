"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitBranch,
  Folder,
  Globe,
  Terminal,
  Lock,
  Shield,
  Package,
  KeyRound,
  ScanSearch,
  RefreshCw,
  Unplug,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  ArrowLeft,
  X,
  FileCode2,
  Users,
  Clock,
  BarChart3,
  GitCommitHorizontal,
  AlertTriangle,
  Box,
} from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { useToast } from "@/components/ui/Toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Tabs } from "@/components/ui/Tabs";
import { ContextualHelp } from "@/components/ui/ContextualHelp";
import { SectionFAQ } from "@/components/ui/SectionFAQ";
import { SmartNextStep, RECOMMENDATION_CHAINS } from "@/components/ui/SmartNextStep";
import { DemoBadge } from "@/components/ui/DemoBadge";

// ─── Types ─────────────────────────────────────────────────────────────────

type RepoStatus = "connected" | "notConnected" | "error" | "syncing";
type RepoType = "github" | "gitlab" | "bitbucket" | "azure-devops" | "local" | "ssh" | "private";
type AuthType = "token" | "ssh" | "basic" | "none";

interface RepoLanguage {
  name: string;
  percentage: number;
  color: string;
}

interface Dependency {
  name: string;
  version: string;
  type: string;
  vulns: number;
}

interface Secret {
  type: string;
  file: string;
  line: number;
  severity: "critical" | "high" | "medium" | "low";
}

interface Contributor {
  name: string;
  email: string;
  commits: number;
}

interface Repo {
  id: string;
  name: string;
  type: RepoType;
  branch: string;
  status: RepoStatus;
  lastCommitHash: string;
  lastCommitDate: string;
  fileCount: number;
  languages: RepoLanguage[];
  depCount: number;
  secretCount: number;
  secretSeverities: { critical: number; high: number; medium: number; low: number };
  sbomEntries: number;
  dependencies: Dependency[];
  secrets: Secret[];
  contributors: Contributor[];
  depHealth: number;
}

// ─── Mock data ─────────────────────────────────────────────────────────────

const MOCK_REPOS: Repo[] = [
  {
    id: "repo-1",
    name: "company/frontend-app",
    type: "github",
    branch: "main",
    status: "connected",
    lastCommitHash: "a3f8d2e",
    lastCommitDate: "2025-03-01",
    fileCount: 1847,
    languages: [
      { name: "TypeScript", percentage: 58, color: "#3178c6" },
      { name: "CSS", percentage: 22, color: "#563d7c" },
      { name: "JavaScript", percentage: 12, color: "#f7df1e" },
      { name: "HTML", percentage: 8, color: "#e34c26" },
    ],
    depCount: 234,
    secretCount: 3,
    secretSeverities: { critical: 1, high: 1, medium: 1, low: 0 },
    sbomEntries: 512,
    dependencies: [
      { name: "react", version: "18.2.0", type: "npm", vulns: 0 },
      { name: "lodash", version: "4.17.20", type: "npm", vulns: 1 },
      { name: "axios", version: "1.6.0", type: "npm", vulns: 0 },
      { name: "express", version: "4.18.2", type: "npm", vulns: 2 },
      { name: "next", version: "14.1.0", type: "npm", vulns: 0 },
    ],
    secrets: [
      { type: "AWS Access Key", file: "src/config/aws.ts", line: 12, severity: "critical" },
      { type: "GitHub Token", file: ".env.local", line: 5, severity: "high" },
      { type: "Private Key", file: "certs/dev.key", line: 1, severity: "medium" },
    ],
    contributors: [
      { name: "Alex Chen", email: "alex@company.com", commits: 342 },
      { name: "Maria Kowalski", email: "maria@company.com", commits: 218 },
      { name: "James Liu", email: "james@company.com", commits: 156 },
    ],
    depHealth: 87,
  },
  {
    id: "repo-2",
    name: "team/api-server",
    type: "gitlab",
    branch: "develop",
    status: "connected",
    lastCommitHash: "7bc41ef",
    lastCommitDate: "2025-02-28",
    fileCount: 924,
    languages: [
      { name: "Python", percentage: 72, color: "#3572A5" },
      { name: "Dockerfile", percentage: 14, color: "#384d54" },
      { name: "YAML", percentage: 14, color: "#cb171e" },
    ],
    depCount: 89,
    secretCount: 1,
    secretSeverities: { critical: 0, high: 0, medium: 1, low: 0 },
    sbomEntries: 267,
    dependencies: [
      { name: "django", version: "4.2.7", type: "pip", vulns: 0 },
      { name: "flask", version: "3.0.0", type: "pip", vulns: 0 },
      { name: "requests", version: "2.31.0", type: "pip", vulns: 1 },
      { name: "sqlalchemy", version: "2.0.23", type: "pip", vulns: 0 },
    ],
    secrets: [
      { type: "DB Password", file: "config/settings.py", line: 45, severity: "medium" },
    ],
    contributors: [
      { name: "Sarah Park", email: "sarah@team.io", commits: 189 },
      { name: "Dmitry Volkov", email: "dmitry@team.io", commits: 134 },
    ],
    depHealth: 94,
  },
  {
    id: "repo-3",
    name: "infra/config",
    type: "local",
    branch: "production",
    status: "error",
    lastCommitHash: "e21a4c9",
    lastCommitDate: "2025-02-25",
    fileCount: 312,
    languages: [
      { name: "HCL", percentage: 48, color: "#844fba" },
      { name: "YAML", percentage: 32, color: "#cb171e" },
      { name: "Shell", percentage: 20, color: "#89e051" },
    ],
    depCount: 24,
    secretCount: 5,
    secretSeverities: { critical: 2, high: 2, medium: 1, low: 0 },
    sbomEntries: 48,
    dependencies: [
      { name: "terraform-aws-vpc", version: "5.1.0", type: "terraform", vulns: 0 },
      { name: "helm/nginx", version: "4.6.1", type: "helm", vulns: 1 },
    ],
    secrets: [
      { type: "SSH Private Key", file: "secrets/prod_ssh_key", line: 1, severity: "critical" },
      { type: "API Key", file: "vars/prod.tfvars", line: 23, severity: "critical" },
      { type: "GCP Service Account", file: "credentials/gcp.json", line: 8, severity: "high" },
      { type: "Registry Token", file: ".docker/config.json", line: 4, severity: "high" },
      { type: "JWT Secret", file: "config/app.yaml", line: 15, severity: "medium" },
    ],
    contributors: [
      { name: "Ops Team", email: "ops@infra.dev", commits: 567 },
    ],
    depHealth: 62,
  },
];

// ─── Repo type config ──────────────────────────────────────────────────────

const REPO_TYPE_CONFIG: Record<RepoType, { icon: React.ElementType; color: string; labelKey: string }> = {
  github: { icon: GitBranch, color: "text-purple", labelKey: "repositories.type.github" },
  gitlab: { icon: Globe, color: "text-cyan", labelKey: "repositories.type.gitlab" },
  bitbucket: { icon: Globe, color: "text-accent", labelKey: "repositories.type.bitbucket" },
  "azure-devops": { icon: Globe, color: "text-amber", labelKey: "repositories.type.azure-devops" },
  local: { icon: Folder, color: "text-amber", labelKey: "repositories.type.local" },
  ssh: { icon: Terminal, color: "text-cyan", labelKey: "repositories.type.ssh" },
  private: { icon: Lock, color: "text-red", labelKey: "repositories.type.private" },
};

const AUTH_TYPE_OPTIONS: { value: AuthType; labelKey: string; icon: React.ElementType }[] = [
  { value: "token", labelKey: "repositories.authToken", icon: KeyRound },
  { value: "ssh", labelKey: "repositories.authSSH", icon: Terminal },
  { value: "basic", labelKey: "repositories.authBasic", icon: Users },
  { value: "none", labelKey: "repositories.authNone", icon: Shield },
];

const STATUS_CONFIG: Record<RepoStatus, { color: string; bg: string; icon: React.ElementType }> = {
  connected: { color: "text-accent", bg: "bg-accent-muted", icon: CheckCircle2 },
  notConnected: { color: "text-muted-2", bg: "bg-surface-2", icon: XCircle },
  error: { color: "text-red", bg: "bg-red-muted", icon: AlertTriangle },
  syncing: { color: "text-cyan", bg: "bg-cyan-muted", icon: Loader2 },
};

// ─── Language color bar ────────────────────────────────────────────────────

function LanguageBar({ languages }: { languages: RepoLanguage[] }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden flex">
        {languages.map((lang) => (
          <div
            key={lang.name}
            className="h-full transition-all duration-500"
            style={{ width: `${lang.percentage}%`, backgroundColor: lang.color }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {languages.slice(0, 4).map((lang) => (
          <div key={lang.name} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: lang.color }} />
            <span className="text-[11px] text-muted-2">{lang.name} {lang.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Repo Card ─────────────────────────────────────────────────────────────

function RepoCard({
  repo,
  t,
  onClick,
  onScan,
  onSync,
  onDisconnect,
}: {
  repo: Repo;
  t: (key: string) => string;
  onClick: () => void;
  onScan: () => void;
  onSync: () => void;
  onDisconnect: () => void;
}) {
  const typeConf = REPO_TYPE_CONFIG[repo.type];
  const statusConf = STATUS_CONFIG[repo.status];
  const TypeIcon = typeConf.icon;
  const StatusIcon = statusConf.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl bg-surface border border-border hover:border-border-light transition-all duration-200"
    >
      {/* Header */}
      <div
        className="p-5 cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-lg ${typeConf.color === "text-purple" ? "bg-purple-muted" : typeConf.color === "text-cyan" ? "bg-cyan-muted" : typeConf.color === "text-amber" ? "bg-amber-muted" : typeConf.color === "text-red" ? "bg-red-muted" : "bg-accent-muted"} flex items-center justify-center shrink-0`}>
              <TypeIcon className={`w-5 h-5 ${typeConf.color}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-foreground truncate">{repo.name}</h3>
                <Badge variant="category">{repo.branch}</Badge>
                <div className={`flex items-center gap-1 text-xs ${statusConf.color}`}>
                  <StatusIcon className={`w-3.5 h-3.5 ${repo.status === "syncing" ? "animate-spin" : ""}`} />
                  <span>{t(`repositories.status.${repo.status === "notConnected" ? "notConnected" : repo.status}`)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-2">
                <span className="flex items-center gap-1">
                  <GitCommitHorizontal className="w-3.5 h-3.5" />
                  <span className="font-mono">{repo.lastCommitHash}</span>
                </span>
                <span>{repo.lastCommitDate}</span>
                <span className="flex items-center gap-1">
                  <FileCode2 className="w-3.5 h-3.5" />
                  {repo.fileCount.toLocaleString()} {t("repositories.files")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Language badges */}
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          {repo.languages.map((lang) => (
            <span
              key={lang.name}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-md bg-surface-2 border border-border text-muted-2"
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: lang.color }} />
              {lang.name}
            </span>
          ))}
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-muted" />
            <span className="text-xs text-muted-2">{t("repositories.dependencies")}: <span className="text-foreground font-medium">{repo.depCount}</span></span>
          </div>
          <div className="flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-muted" />
            <span className="text-xs text-muted-2">{t("repositories.secrets")}: <span className={`font-medium ${repo.secretCount > 0 ? "text-amber" : "text-foreground"}`}>{repo.secretCount}</span></span>
            {repo.secretSeverities.critical > 0 && (
              <Badge variant="critical">{repo.secretSeverities.critical} {t("repositories.sevCritical")}</Badge>
            )}
            {repo.secretSeverities.high > 0 && (
              <Badge variant="high">{repo.secretSeverities.high} {t("repositories.sevHigh")}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5 text-muted" />
            <span className="text-xs text-muted-2">{t("repositories.sbom")}: <span className="text-foreground font-medium">{repo.sbomEntries}</span> {t("repositories.entries")}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-3 border-t border-border flex items-center gap-2">
        <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); onScan(); }}>
          <ScanSearch className="w-3.5 h-3.5" />
          {t("repositories.scanRepo")}
        </Button>
        <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onSync(); }}>
          <RefreshCw className="w-3.5 h-3.5" />
          {t("repositories.sync")}
        </Button>
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onDisconnect(); }}>
          <Unplug className="w-3.5 h-3.5" />
          {t("repositories.disconnect")}
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Connect Dialog ────────────────────────────────────────────────────────

function ConnectDialog({
  open,
  onClose,
  t,
  onConnected,
}: {
  open: boolean;
  onClose: () => void;
  t: (key: string) => string;
  onConnected: (repo: Repo) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<RepoType | null>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [authType, setAuthType] = useState<AuthType>("token");
  const [credential, setCredential] = useState("");
  const [testState, setTestState] = useState<"idle" | "testing" | "success" | "failed">("idle");
  const [importing, setImporting] = useState(false);

  const resetForm = useCallback(() => {
    setStep(1);
    setSelectedType(null);
    setRepoUrl("");
    setBranch("main");
    setAuthType("token");
    setCredential("");
    setTestState("idle");
    setImporting(false);
  }, []);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTest = async () => {
    setTestState("testing");
    await new Promise((r) => setTimeout(r, 1500));
    setTestState("success");
  };

  const handleImport = async () => {
    setImporting(true);
    await new Promise((r) => setTimeout(r, 1200));

    const newRepo: Repo = {
      id: `repo-${Date.now()}`,
      name: repoUrl.split("/").slice(-2).join("/") || "new-repo",
      type: selectedType || "github",
      branch,
      status: "connected",
      lastCommitHash: Math.random().toString(36).slice(2, 9),
      lastCommitDate: new Date().toISOString().split("T")[0],
      fileCount: Math.floor(Math.random() * 2000) + 200,
      languages: [{ name: "TypeScript", percentage: 100, color: "#3178c6" }],
      depCount: Math.floor(Math.random() * 150) + 10,
      secretCount: 0,
      secretSeverities: { critical: 0, high: 0, medium: 0, low: 0 },
      sbomEntries: Math.floor(Math.random() * 300) + 50,
      dependencies: [],
      secrets: [],
      contributors: [],
      depHealth: 100,
    };

    onConnected(newRepo);
    handleClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg mx-4 rounded-2xl bg-surface border border-border shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent-muted flex items-center justify-center">
                <GitBranch className="w-4 h-4 text-accent" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">{t("repositories.connect")}</h2>
                <p className="text-xs text-muted-2">
                  {step === 1 ? t("repositories.step1.title") : step === 2 ? t("repositories.step2.title") : t("repositories.step3.title")}
                </p>
              </div>
            </div>
            <button onClick={handleClose} className="text-muted hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step indicators */}
          <div className="px-6 pt-4">
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    s < step ? "bg-accent text-background" : s === step ? "bg-accent/20 text-accent border border-accent/40" : "bg-surface-2 text-muted border border-border"
                  }`}>
                    {s < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : s}
                  </div>
                  {s < 3 && <div className={`flex-1 h-0.5 rounded-full transition-colors ${s < step ? "bg-accent" : "bg-border"}`} />}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {step === 1 && (
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(REPO_TYPE_CONFIG) as RepoType[]).map((type) => {
                  const conf = REPO_TYPE_CONFIG[type];
                  const Icon = conf.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => { setSelectedType(type); setStep(2); }}
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                        selectedType === type
                          ? "bg-accent-muted border-accent/30"
                          : "bg-surface-2 border-border hover:border-border-light hover:bg-surface-3"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${conf.color} shrink-0`} />
                      <div>
                        <div className="text-sm font-medium text-foreground">{t(conf.labelKey)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {/* URL */}
                <div>
                  <label className="text-xs font-medium text-muted-2 mb-1.5 block">{t("repositories.url")}</label>
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder={t("repositories.urlPlaceholder")}
                    className="w-full px-4 py-2.5 rounded-lg bg-surface-2 border border-border text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-accent/40 transition-colors"
                  />
                </div>

                {/* Branch */}
                <div>
                  <label className="text-xs font-medium text-muted-2 mb-1.5 block">{t("repositories.branch")}</label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder={t("repositories.branchPlaceholder")}
                    className="w-full px-4 py-2.5 rounded-lg bg-surface-2 border border-border text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-accent/40 transition-colors"
                  />
                </div>

                {/* Auth type */}
                <div>
                  <label className="text-xs font-medium text-muted-2 mb-1.5 block">{t("repositories.authType")}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {AUTH_TYPE_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setAuthType(opt.value)}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs transition-all ${
                            authType === opt.value
                              ? "bg-accent-muted border-accent/30 text-foreground"
                              : "bg-surface-2 border-border text-muted-2 hover:border-border-light"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          {t(opt.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Credential */}
                {authType !== "none" && (
                  <div>
                    <label className="text-xs font-medium text-muted-2 mb-1.5 block">
                      {t(AUTH_TYPE_OPTIONS.find((o) => o.value === authType)?.labelKey || "repositories.authToken")}
                    </label>
                    <input
                      type={authType === "basic" ? "text" : "password"}
                      value={credential}
                      onChange={(e) => setCredential(e.target.value)}
                      placeholder={t("repositories.credentialPlaceholder")}
                      className="w-full px-4 py-2.5 rounded-lg bg-surface-2 border border-border text-foreground text-sm placeholder:text-muted focus:outline-none focus:border-accent/40 transition-colors"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!repoUrl.trim()}
                    onClick={() => setStep(3)}
                  >
                    {t("repositories.test")}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                {/* Summary */}
                <div className="p-4 rounded-xl bg-surface-2 border border-border space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-2">{t("repositories.url")}</span>
                    <span className="text-foreground font-mono text-xs">{repoUrl}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-2">{t("repositories.branch")}</span>
                    <Badge variant="category">{branch}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-2">{t("repositories.authType")}</span>
                    <span className="text-foreground">{t(AUTH_TYPE_OPTIONS.find((o) => o.value === authType)?.labelKey || "")}</span>
                  </div>
                </div>

                {/* Test connection */}
                <div className="flex flex-col items-center gap-3">
                  {testState === "idle" && (
                    <Button variant="outline" size="md" onClick={handleTest}>
                      <Globe className="w-4 h-4" />
                      {t("repositories.test")}
                    </Button>
                  )}
                  {testState === "testing" && (
                    <div className="flex items-center gap-2 text-cyan">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">{t("repositories.testRunning")}</span>
                    </div>
                  )}
                  {testState === "success" && (
                    <div className="flex items-center gap-2 text-accent">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-medium">{t("repositories.testSuccess")}</span>
                    </div>
                  )}
                  {testState === "failed" && (
                    <div className="flex items-center gap-2 text-red">
                      <XCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">{t("repositories.testFailed")}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <Button variant="ghost" size="sm" onClick={() => { setTestState("idle"); setStep(2); }}>
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    disabled={testState !== "success" || importing}
                    onClick={handleImport}
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("repositories.importing")}
                      </>
                    ) : (
                      <>
                        {t("repositories.import")}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Repo Detail View ──────────────────────────────────────────────────────

function RepoDetailView({
  repo,
  t,
  onBack,
}: {
  repo: Repo;
  t: (key: string) => string;
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState("overview");

  const typeConf = REPO_TYPE_CONFIG[repo.type];
  const statusConf = STATUS_CONFIG[repo.status];

  const tabItems = [
    { key: "overview", label: t("repositories.overview"), icon: BarChart3 },
    { key: "dependencies", label: t("repositories.dependencies"), icon: Package },
    { key: "secrets", label: t("repositories.secrets"), icon: KeyRound },
    { key: "sbom", label: t("repositories.sbom"), icon: Box },
    { key: "contributors", label: t("repositories.contributors"), icon: Users },
    { key: "history", label: t("repositories.history"), icon: Clock },
  ];

  const healthColor = repo.depHealth >= 80 ? "text-accent" : repo.depHealth >= 60 ? "text-amber" : "text-red";
  const healthBg = repo.depHealth >= 80 ? "bg-accent-muted" : repo.depHealth >= 60 ? "bg-amber-muted" : "bg-red-muted";

  const sevBadge = (sev: "critical" | "high" | "medium" | "low") => {
    const map: Record<string, "critical" | "high" | "medium" | "low" | "info"> = {
      critical: "critical",
      high: "high",
      medium: "medium",
      low: "low",
    };
    return <Badge variant={map[sev]}>{sev}</Badge>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${typeConf.color === "text-purple" ? "bg-purple-muted" : typeConf.color === "text-cyan" ? "bg-cyan-muted" : typeConf.color === "text-amber" ? "bg-amber-muted" : typeConf.color === "text-red" ? "bg-red-muted" : "bg-accent-muted"} flex items-center justify-center`}>
            <typeConf.icon className={`w-5 h-5 ${typeConf.color}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">{repo.name}</h2>
              <Badge variant="category">{repo.branch}</Badge>
              <div className={`flex items-center gap-1 text-xs ${statusConf.color}`}>
                <statusConf.icon className={`w-3.5 h-3.5 ${repo.status === "syncing" ? "animate-spin" : ""}`} />
                {t(`repositories.status.${repo.status}`)}
              </div>
            </div>
            <p className="text-xs text-muted-2 mt-0.5">
              {t(REPO_TYPE_CONFIG[repo.type].labelKey)} &middot; {t("repositories.lastCommit")}: <span className="font-mono">{repo.lastCommitHash}</span> &middot; {repo.lastCommitDate}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabItems} activeKey={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      <div>
        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-surface border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <FileCode2 className="w-4 h-4 text-cyan" />
                  <span className="text-xs text-muted-2">{t("repositories.fileCount")}</span>
                </div>
                <span className="text-2xl font-bold text-foreground">{repo.fileCount.toLocaleString()}</span>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <GitCommitHorizontal className="w-4 h-4 text-accent" />
                  <span className="text-xs text-muted-2">{t("repositories.lastCommit")}</span>
                </div>
                <span className="text-lg font-bold text-foreground font-mono">{repo.lastCommitHash}</span>
                <span className="text-xs text-muted-2 block">{repo.lastCommitDate}</span>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-amber" />
                  <span className="text-xs text-muted-2">{t("repositories.dependencies")}</span>
                </div>
                <span className="text-2xl font-bold text-foreground">{repo.depCount}</span>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className={`w-4 h-4 ${healthColor}`} />
                  <span className="text-xs text-muted-2">{t("repositories.depHealth")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${healthColor}`}>{repo.depHealth}%</span>
                  <div className={`w-16 h-2 rounded-full ${healthBg} overflow-hidden`}>
                    <div
                      className={`h-full rounded-full ${healthColor === "text-accent" ? "bg-accent" : healthColor === "text-amber" ? "bg-amber" : "bg-red"}`}
                      style={{ width: `${repo.depHealth}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Language breakdown */}
            <Panel title={t("repositories.langBreakdown")}>
              <LanguageBar languages={repo.languages} />
            </Panel>

            {/* Secret summary */}
            {repo.secretCount > 0 && (
              <Panel title={t("repositories.secrets")}>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-2">{repo.secretCount} {t("repositories.secrets").toLowerCase()}</span>
                  {repo.secretSeverities.critical > 0 && <Badge variant="critical">{repo.secretSeverities.critical} {t("repositories.sevCritical")}</Badge>}
                  {repo.secretSeverities.high > 0 && <Badge variant="high">{repo.secretSeverities.high} {t("repositories.sevHigh")}</Badge>}
                  {repo.secretSeverities.medium > 0 && <Badge variant="medium">{repo.secretSeverities.medium} {t("repositories.sevMedium")}</Badge>}
                  {repo.secretSeverities.low > 0 && <Badge variant="low">{repo.secretSeverities.low} {t("repositories.sevLow")}</Badge>}
                </div>
              </Panel>
            )}
          </motion.div>
        )}

        {activeTab === "dependencies" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Panel noPadding>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-surface-2">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{t("repositories.depName")}</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{t("repositories.depVersion")}</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{t("repositories.depType")}</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{t("repositories.depVulns")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {repo.dependencies.map((dep) => (
                      <tr key={dep.name} className="hover:bg-surface-2 transition-colors">
                        <td className="px-5 py-3 text-sm font-medium text-foreground">{dep.name}</td>
                        <td className="px-5 py-3 text-sm font-mono text-muted-2">{dep.version}</td>
                        <td className="px-5 py-3">
                          <Badge variant="category">{dep.type}</Badge>
                        </td>
                        <td className="px-5 py-3">
                          {dep.vulns > 0 ? (
                            <Badge variant={dep.vulns >= 2 ? "critical" : "high"}>{dep.vulns}</Badge>
                          ) : (
                            <span className="text-accent text-sm">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </motion.div>
        )}

        {activeTab === "secrets" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Panel noPadding>
              {repo.secrets.length === 0 ? (
                <div className="p-8 text-center">
                  <Shield className="w-10 h-10 text-accent mx-auto mb-3" />
                  <p className="text-sm text-muted-2">{t("repositories.secrets")}: 0</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-surface-2">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{t("repositories.secretType")}</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{t("repositories.secretFile")}</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{t("repositories.secretLine")}</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">{t("repositories.secretSeverity")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {repo.secrets.map((secret, i) => (
                        <tr key={i} className="hover:bg-surface-2 transition-colors">
                          <td className="px-5 py-3 text-sm font-medium text-foreground">{secret.type}</td>
                          <td className="px-5 py-3 text-sm font-mono text-muted-2">{secret.file}</td>
                          <td className="px-5 py-3 text-sm text-muted-2">{secret.line}</td>
                          <td className="px-5 py-3">{sevBadge(secret.severity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </motion.div>
        )}

        {activeTab === "sbom" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Panel title={t("repositories.sbom")}>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-cyan-muted flex items-center justify-center">
                  <Box className="w-8 h-8 text-cyan" />
                </div>
                <div>
                  <span className="text-3xl font-bold text-foreground">{repo.sbomEntries}</span>
                  <p className="text-sm text-muted-2">{t("repositories.entries")}</p>
                </div>
              </div>
            </Panel>
          </motion.div>
        )}

        {activeTab === "contributors" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {repo.contributors.map((contrib) => (
              <div key={contrib.email} className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-border">
                <div className="w-10 h-10 rounded-full bg-accent-muted flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{contrib.name}</p>
                  <p className="text-xs text-muted-2">{contrib.email}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-foreground">{contrib.commits}</span>
                  <p className="text-xs text-muted-2">{t("repositories.contribCommits").toLowerCase()}</p>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === "history" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Panel title={t("repositories.history")}>
              <div className="space-y-3">
                {[
                  { hash: repo.lastCommitHash, date: repo.lastCommitDate, msg: "Latest commit" },
                  { hash: "b4e7f1a", date: "2025-02-22", msg: "Update dependencies" },
                  { hash: "9c2d8e5", date: "2025-02-18", msg: "Security patch applied" },
                  { hash: "f1a3b7c", date: "2025-02-14", msg: "Initial security scan" },
                ].map((commit) => (
                  <div key={commit.hash} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center shrink-0">
                      <GitCommitHorizontal className="w-4 h-4 text-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{commit.msg}</p>
                      <p className="text-xs text-muted-2 font-mono">{commit.hash}</p>
                    </div>
                    <span className="text-xs text-muted-2 shrink-0">{commit.date}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function RepositoriesPage() {
  const { t } = useI18n();
  const { addToast } = useToast();

  const [repos, setRepos] = useState<Repo[]>(MOCK_REPOS);
  const [showConnect, setShowConnect] = useState(false);
  const [activeRepo, setActiveRepo] = useState<Repo | null>(null);

  const handleScan = (repo: Repo) => {
    addToast({
      type: "info",
      title: t("repositories.scanRepo"),
      description: `${repo.name} — scanning...`,
    });
  };

  const handleSync = (repo: Repo) => {
    setRepos((prev) =>
      prev.map((r) => (r.id === repo.id ? { ...r, status: "syncing" as RepoStatus } : r))
    );
    addToast({
      type: "info",
      title: t("repositories.sync"),
      description: `${repo.name} — ${t("repositories.status.syncing").toLowerCase()}`,
    });
    setTimeout(() => {
      setRepos((prev) =>
        prev.map((r) => (r.id === repo.id ? { ...r, status: "connected" as RepoStatus } : r))
      );
      addToast({
        type: "success",
        title: t("repositories.sync"),
        description: `${repo.name} — ${t("repositories.status.connected").toLowerCase()}`,
      });
    }, 2000);
  };

  const handleDisconnect = (repo: Repo) => {
    setRepos((prev) => prev.filter((r) => r.id !== repo.id));
    addToast({
      type: "warning",
      title: t("repositories.disconnect"),
      description: repo.name,
    });
  };

  const handleConnected = (newRepo: Repo) => {
    setRepos((prev) => [...prev, newRepo]);
    addToast({
      type: "success",
      title: t("repositories.importSuccess"),
      description: newRepo.name,
    });
  };

  if (activeRepo) {
    return (
      <div className="animate-page-in">
        <RepoDetailView
          repo={activeRepo}
          t={t}
          onBack={() => setActiveRepo(null)}
        />
      </div>
    );
  }

  return (
    <div className="animate-page-in">
      <PageHeader
        id="repos-header"
        title={t("repositories.title")}
        description={t("repositories.subtitle")}
      >
        <div className="mt-6 flex items-center gap-3">
          <Button variant="primary" size="md" onClick={() => setShowConnect(true)}>
            <GitBranch className="w-4 h-4" />
            {t("repositories.connect")}
          </Button>
          <span className="text-sm text-muted-2">
            {repos.length} {repos.length === 1 ? t("repositories.repoCountOne") : repos.length >= 2 && repos.length <= 4 ? t("repositories.repoCountFew") : t("repositories.repoCountMany")}
          </span>
        </div>
      </PageHeader>

      <div className="flex items-center gap-2 mt-2">
        <ContextualHelp section="repositories" />
        <DemoBadge />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {repos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
              <GitBranch className="w-8 h-8 text-muted-2" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              {t("repositories.noRepos")}
            </h2>
            <p className="text-sm text-muted-2 max-w-md mb-6">
              {t("repositories.noReposDesc")}
            </p>
            <Button variant="primary" size="md" onClick={() => setShowConnect(true)}>
              <GitBranch className="w-4 h-4" />
              {t("repositories.connect")}
            </Button>
          </motion.div>
        ) : (
          <div id="repos-list" className="space-y-4">
            {repos.map((repo) => (
              <RepoCard
                key={repo.id}
                repo={repo}
                t={t}
                onClick={() => setActiveRepo(repo)}
                onScan={() => handleScan(repo)}
                onSync={() => handleSync(repo)}
                onDisconnect={() => handleDisconnect(repo)}
              />
            ))}
          </div>
        )}
      </div>

      <ConnectDialog
        open={showConnect}
        onClose={() => setShowConnect(false)}
        t={t}
        onConnected={handleConnected}
      />

      <div id="repos-faq" className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionFAQ section="repositories" />
        <SmartNextStep {...RECOMMENDATION_CHAINS["repositories"]} />
      </div>
    </div>
  );
}
