"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n-context";
import { useToast } from "@/components/ui/Toast";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Shield,
  Key,
  Lock,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Server,
  Terminal,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  XCircle,
  Monitor,
  Container as ContainerIcon,
  Cloud,
  MonitorX,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 4;
type KeyChoice = "new" | "existing";
type KeyType = "Ed25519" | "RSA" | "ECDSA";
type ServerType = "ubuntu" | "debian" | "centos" | "docker" | "kubernetes" | "windows";
type ConnectionTestState = "idle" | "testing" | "connected" | "failed";

interface SshKey {
  id: string;
  name: string;
  type: KeyType;
  created: string;
  lastUsed: string;
  publicKey: string;
}

interface SshConnection {
  id: string;
  serverName: string;
  host: string;
  username: string;
  serverType: ServerType;
  status: "connected" | "notConnected";
  os: string;
  uptime: string;
  lastUsed: string;
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_PUBLIC_KEY =
  "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKj8G7m2VbN9RtQwE5fHxCpL3YaJ0sWdM6nR4uKvBxNe user@sip";

const INITIAL_KEYS: SshKey[] = [
  {
    id: "k1",
    name: "Production Server",
    type: "Ed25519",
    created: "2026-05-10",
    lastUsed: "2026-08-15",
    publicKey: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKj8G7m2VbN9RtQwE5fHxCpL3YaJ0sWdM6nR4uKvBxNe user@sip",
  },
  {
    id: "k2",
    name: "Staging Key",
    type: "RSA",
    created: "2026-07-22",
    lastUsed: "2026-08-10",
    publicKey: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQD7mF9K2vR4pN8lQhWkM3jB6vAeLfGxCpY0sWdRtQwE5fHxKj8G7m2VbN9R4uKvBxNaJ0lQhWkM3jB6vAeLfGxCpY0sWdRtQwE5fHxKj8G7m2VbN9R4uKvBxNaJ0= deploy@staging",
  },
];

const INITIAL_CONNECTIONS: SshConnection[] = [
  {
    id: "c1",
    serverName: "prod-web-01",
    host: "192.168.1.100",
    username: "admin",
    serverType: "ubuntu",
    status: "connected",
    os: "Ubuntu 24.04 LTS",
    uptime: "42d 7h 13m",
    lastUsed: "2026-08-15",
  },
  {
    id: "c2",
    serverName: "staging-db",
    host: "10.0.2.50",
    username: "deploy",
    serverType: "debian",
    status: "notConnected",
    os: "Debian 12",
    uptime: "—",
    lastUsed: "2026-07-28",
  },
  {
    id: "c3",
    serverName: "k8s-master",
    host: "10.0.0.1",
    username: "k8s-admin",
    serverType: "kubernetes",
    status: "connected",
    os: "Ubuntu 22.04 / K3s",
    uptime: "118d 2h 45m",
    lastUsed: "2026-08-14",
  },
];

// ─── Server Type Config ─────────────────────────────────────────────────────

const SERVER_TYPES: { id: ServerType; icon: React.ElementType }[] = [
  { id: "ubuntu", icon: Monitor },
  { id: "debian", icon: Monitor },
  { id: "centos", icon: Monitor },
  { id: "docker", icon: ContainerIcon },
  { id: "kubernetes", icon: Cloud },
  { id: "windows", icon: MonitorX },
];

// ─── Step Indicator ─────────────────────────────────────────────────────────

function StepIndicator({ step, t }: { step: WizardStep; t: (k: string) => string }) {
  const labels = [
    t("ssh.step1.title"),
    t("ssh.step2.title"),
    t("ssh.step3.title"),
    t("ssh.step4.title"),
  ];

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8">
      {([1, 2, 3, 4] as WizardStep[]).map((s, i) => (
        <div key={s} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                s < step
                  ? "bg-accent text-background"
                  : s === step
                  ? "bg-accent/20 text-accent border-2 border-accent"
                  : "bg-surface-2 text-muted-2 border border-border"
              }`}
            >
              {s < step ? <Check className="w-4 h-4" /> : s}
            </div>
            <span
              className={`mt-1.5 text-[10px] sm:text-xs font-medium text-center max-w-[64px] leading-tight ${
                s === step ? "text-accent" : "text-muted-2"
              }`}
            >
              {labels[i]}
            </span>
          </div>
          {i < 3 && (
            <div
              className={`w-6 sm:w-10 h-0.5 mx-1 mb-5 transition-colors duration-300 ${
                s < step ? "bg-accent" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: What is SSH? ──────────────────────────────────────────────────

function Step1WhatIsSSH({ t }: { t: (k: string) => string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Educational explanation */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Lock className="w-8 h-8 text-accent" />
            </div>
            <span className="text-xs text-muted-2 font-medium">Encrypt</span>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-2" />
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-2xl bg-cyan/10 border border-cyan/20 flex items-center justify-center">
              <Key className="w-8 h-8 text-cyan" />
            </div>
            <span className="text-xs text-muted-2 font-medium">Key</span>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-2" />
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-2xl bg-purple/10 border border-purple/20 flex items-center justify-center">
              <Shield className="w-8 h-8 text-purple" />
            </div>
            <span className="text-xs text-muted-2 font-medium">Secure</span>
          </div>
        </div>
        <p className="text-base sm:text-lg text-muted leading-relaxed max-w-xl mx-auto">
          {t("ssh.step1.whatIsSSH")}
        </p>
      </div>

      {/* Why keys are safer - expandable */}
      <div className="rounded-xl bg-surface-2/50 border border-border overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-2 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-accent shrink-0" />
            <span className="text-sm font-semibold text-foreground">
              {t("ssh.step1.whyKeys")}
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-muted-2 shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-2 shrink-0" />
          )}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-4 pt-1">
                <p className="text-sm text-muted-2 leading-relaxed">
                  {t("ssh.step1.whyKeysDesc")}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Summary card */}
      <div className="rounded-xl bg-accent/5 border border-accent/20 p-5">
        <p className="text-sm text-accent/80 text-center leading-relaxed">
          {t("ssh.step1.desc")}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Step 2: Create Key ────────────────────────────────────────────────────

function Step2CreateKey({
  t,
  keyChoice,
  setKeyChoice,
  keyName,
  setKeyName,
  keyType,
  setKeyType,
  existingKey,
  setExistingKey,
  generatedKey,
  onGenerate,
}: {
  t: (k: string) => string;
  keyChoice: KeyChoice;
  setKeyChoice: (c: KeyChoice) => void;
  keyName: string;
  setKeyName: (n: string) => void;
  keyType: KeyType;
  setKeyType: (t: KeyType) => void;
  existingKey: string;
  setExistingKey: (k: string) => void;
  generatedKey: string;
  onGenerate: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Choice cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        <button
          onClick={() => setKeyChoice("new")}
          className={`relative p-5 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer ${
            keyChoice === "new"
              ? "border-accent bg-accent/5"
              : "border-border bg-surface hover:border-border-light"
          }`}
        >
          {keyChoice === "new" && (
            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
              <Check className="w-3 h-3 text-background" />
            </div>
          )}
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
            <Plus className="w-5 h-5 text-accent" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {t("ssh.step2.createKey")}
          </h3>
          <p className="text-xs text-muted-2 leading-relaxed">
            Ed25519, RSA, ECDSA
          </p>
        </button>

        <button
          onClick={() => setKeyChoice("existing")}
          className={`relative p-5 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer ${
            keyChoice === "existing"
              ? "border-accent bg-accent/5"
              : "border-border bg-surface hover:border-border-light"
          }`}
        >
          {keyChoice === "existing" && (
            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
              <Check className="w-3 h-3 text-background" />
            </div>
          )}
          <div className="w-10 h-10 rounded-lg bg-cyan/10 flex items-center justify-center mb-3">
            <Key className="w-5 h-5 text-cyan" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {t("ssh.step2.useExisting")}
          </h3>
          <p className="text-xs text-muted-2 leading-relaxed">
            ssh-ed25519 / ssh-rsa / ecdsa-sha2-nistp256
          </p>
        </button>
      </div>

      {/* Create new key form */}
      {keyChoice === "new" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t("ssh.step2.keyName")}
            </label>
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder={t("ssh.step2.keyNamePlaceholder")}
              className="w-full px-4 py-2.5 rounded-lg bg-surface-2 border border-border text-foreground text-sm placeholder:text-muted-2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t("ssh.step2.keyType")}
            </label>
            <div className="flex gap-2 flex-wrap">
              {(["Ed25519", "RSA", "ECDSA"] as KeyType[]).map((kt) => (
                <button
                  key={kt}
                  onClick={() => setKeyType(kt)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    keyType === kt
                      ? "bg-accent text-background"
                      : "bg-surface-2 text-muted-2 border border-border hover:text-foreground hover:border-border-light"
                  }`}
                >
                  {kt}
                </button>
              ))}
            </div>
          </div>

          {generatedKey && (
            <div className="rounded-lg bg-accent/5 border border-accent/20 p-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
              <span className="text-xs text-accent/80">Key generated successfully</span>
            </div>
          )}

          <Button
            variant="secondary"
            size="md"
            onClick={onGenerate}
            disabled={!keyName.trim()}
          >
            <Key className="w-4 h-4" />
            {t("ssh.step2.generate")}
          </Button>
        </motion.div>
      )}

      {/* Use existing key form */}
      {keyChoice === "existing" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {t("ssh.step2.useExisting")}
            </label>
            <textarea
              value={existingKey}
              onChange={(e) => setExistingKey(e.target.value)}
              placeholder={t("ssh.step2.existingPlaceholder")}
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-surface-2 border border-border text-foreground text-sm font-mono placeholder:text-muted-2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors resize-none"
            />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Step 3: Public Key ────────────────────────────────────────────────────

function Step3PublicKey({
  t,
  publicKey,
}: {
  t: (k: string) => string;
  publicKey: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(publicKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [publicKey]);

  const command = `echo "${publicKey}" >> ~/.ssh/authorized_keys`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <p className="text-sm text-muted-2 text-center leading-relaxed">
        {t("ssh.step3.desc")}
      </p>

      {/* Public key display */}
      <div className="relative">
        <div className="rounded-xl bg-surface-2 border border-border p-4 pr-24">
          <code className="text-xs sm:text-sm text-accent font-mono break-all leading-relaxed">
            {publicKey}
          </code>
        </div>
        <Button
          variant={copied ? "primary" : "secondary"}
          size="sm"
          onClick={handleCopy}
          className="absolute top-3 right-3"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              {t("ssh.step3.copied")}
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              {t("ssh.step3.copy")}
            </>
          )}
        </Button>
      </div>

      {/* Instruction card */}
      <div className="rounded-xl bg-surface border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <Terminal className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">
            {t("ssh.step3.instruction")}
          </span>
        </div>
        <div className="p-4 space-y-2">
          <p className="text-xs text-muted-2 leading-relaxed">
            {t("ssh.step3.instructionDesc")}
          </p>
          <div className="rounded-lg bg-[#0d1117] border border-accent/20 p-3 overflow-x-auto">
            <code className="text-xs sm:text-sm text-accent font-mono whitespace-nowrap">
              {command}
            </code>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Step 4: Test Connection ───────────────────────────────────────────────

function Step4TestConnection({
  t,
  host,
  setHost,
  port,
  setPort,
  username,
  setUsername,
  serverType,
  setServerType,
  testState,
  onTest,
  errorMessage,
}: {
  t: (k: string) => string;
  host: string;
  setHost: (h: string) => void;
  port: string;
  setPort: (p: string) => void;
  username: string;
  setUsername: (u: string) => void;
  serverType: ServerType;
  setServerType: (s: ServerType) => void;
  testState: ConnectionTestState;
  onTest: () => void;
  errorMessage: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {t("ssh.step4.host")}
          </label>
          <input
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="192.168.1.100"
            className="w-full px-4 py-2.5 rounded-lg bg-surface-2 border border-border text-foreground text-sm placeholder:text-muted-2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {t("ssh.step4.port")}
          </label>
          <input
            type="text"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="22"
            className="w-full px-4 py-2.5 rounded-lg bg-surface-2 border border-border text-foreground text-sm placeholder:text-muted-2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {t("ssh.step4.username")}
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="root"
            className="w-full px-4 py-2.5 rounded-lg bg-surface-2 border border-border text-foreground text-sm placeholder:text-muted-2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
          />
        </div>
      </div>

      {/* Server type selector */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2.5">
          {t("ssh.step4.serverType")}
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {SERVER_TYPES.map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setServerType(id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all cursor-pointer ${
                serverType === id
                  ? "border-accent bg-accent/5 text-accent"
                  : "border-border bg-surface text-muted-2 hover:border-border-light hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] sm:text-xs font-medium">
                {t(`ssh.server.${id}`)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Test button */}
      <Button
        variant="primary"
        size="lg"
        onClick={onTest}
        disabled={testState === "testing" || !host.trim() || !username.trim()}
        className="w-full sm:w-auto"
      >
        {testState === "testing" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {t("ssh.step4.connecting")}
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4" />
            {t("ssh.step4.test")}
          </>
        )}
      </Button>

      {/* Test result */}
      <AnimatePresence>
        {testState === "connected" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-accent/5 border border-accent/20"
          >
            <CheckCircle2 className="w-6 h-6 text-accent shrink-0" />
            <div>
              <p className="text-sm font-semibold text-accent">
                {t("ssh.step4.connected")}
              </p>
              <p className="text-xs text-muted-2 mt-0.5">
                {username}@{host}:{port}
              </p>
            </div>
          </motion.div>
        )}

        {testState === "failed" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-red/5 border border-red/20"
          >
            <XCircle className="w-6 h-6 text-red shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red">
                {t("ssh.step4.failed")}
              </p>
              <p className="text-xs text-muted-2 mt-0.5">{errorMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────

export default function SshIntegrationPage() {
  const { t } = useI18n();
  const { addToast } = useToast();

  // Wizard state
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [keyChoice, setKeyChoice] = useState<KeyChoice>("new");
  const [keyName, setKeyName] = useState("");
  const [keyType, setKeyType] = useState<KeyType>("Ed25519");
  const [existingKey, setExistingKey] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [testState, setTestState] = useState<ConnectionTestState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Step 4 state
  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");
  const [username, setUsername] = useState("");
  const [serverType, setServerType] = useState<ServerType>("ubuntu");

  // SSH Keys & Connections state
  const [sshKeys, setSshKeys] = useState<SshKey[]>(INITIAL_KEYS);
  const [sshConnections, setSshConnections] = useState<SshConnection[]>(INITIAL_CONNECTIONS);
  const [activeTab, setActiveTab] = useState<"keys" | "connections">("keys");

  // ─── Computed public key ──────────────────────────────────────────────

  const publicKey = keyChoice === "new" ? generatedKey || MOCK_PUBLIC_KEY : existingKey;

  // ─── Handlers ─────────────────────────────────────────────────────────

  const handleGenerate = useCallback(() => {
    const prefix =
      keyType === "Ed25519"
        ? "ssh-ed25519"
        : keyType === "RSA"
        ? "ssh-rsa"
        : "ecdsa-sha2-nistp256";
    const mockKey = `${prefix} AAAAC3NzaC1lZDI1NTE5AAAAIKj8G7m2VbN9RtQwE5fHxCpL3YaJ0sWdM6nR4uKvBxNe ${keyName}@sip`;
    setGeneratedKey(mockKey);
    addToast({ type: "success", title: t("ssh.step2.generate"), description: mockKey.split(" ").slice(0, 2).join(" ") });
  }, [keyType, keyName, addToast, t]);

  const handleTest = useCallback(() => {
    setTestState("testing");
    setErrorMessage("");
    setTimeout(() => {
      if (Math.random() > 0.3) {
        setTestState("connected");
      } else {
        setTestState("failed");
        setErrorMessage("Connection refused — check host, port, and authorized_keys");
      }
    }, 1800);
  }, []);

  const handleSave = useCallback(() => {
    const newConn: SshConnection = {
      id: `c${Date.now()}`,
      serverName: host,
      host,
      username,
      serverType,
      status: "connected",
      os: t(`ssh.server.${serverType}`),
      uptime: "0d 0h 1m",
      lastUsed: new Date().toISOString().split("T")[0],
    };
    setSshConnections((prev) => [newConn, ...prev]);

    // Also add key if new
    if (keyChoice === "new" && keyName.trim()) {
      const alreadyExists = sshKeys.some((k) => k.name === keyName);
      if (!alreadyExists) {
        setSshKeys((prev) => [
          {
            id: `k${Date.now()}`,
            name: keyName,
            type: keyType,
            created: new Date().toISOString().split("T")[0],
            lastUsed: new Date().toISOString().split("T")[0],
            publicKey: generatedKey || MOCK_PUBLIC_KEY,
          },
          ...prev,
        ]);
      }
    }

    addToast({ type: "success", title: t("ssh.step4.saveSuccess") });

    // Reset wizard
    setWizardStep(1);
    setKeyChoice("new");
    setKeyName("");
    setKeyType("Ed25519");
    setExistingKey("");
    setGeneratedKey("");
    setHost("");
    setPort("22");
    setUsername("");
    setServerType("ubuntu");
    setTestState("idle");
    setErrorMessage("");
  }, [host, username, serverType, keyChoice, keyName, keyType, generatedKey, sshKeys, addToast, t]);

  const handleDeleteKey = useCallback(
    (id: string) => {
      setSshKeys((prev) => prev.filter((k) => k.id !== id));
      addToast({ type: "info", title: t("ssh.keys.delete") });
    },
    [addToast, t]
  );

  const handleDeleteConnection = useCallback(
    (id: string) => {
      setSshConnections((prev) => prev.filter((c) => c.id !== id));
      addToast({ type: "info", title: t("ssh.connections.delete") });
    },
    [addToast, t]
  );

  const handleToggleConnection = useCallback(
    (id: string) => {
      setSshConnections((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, status: c.status === "connected" ? "notConnected" : "connected" }
            : c
        )
      );
    },
    []
  );

  const canProceed = (): boolean => {
    switch (wizardStep) {
      case 1:
        return true;
      case 2:
        return keyChoice === "new" ? !!generatedKey : !!existingKey.trim();
      case 3:
        return true;
      case 4:
        return testState === "connected";
      default:
        return false;
    }
  };

  const goNext = () => {
    if (wizardStep < 4 && canProceed()) setWizardStep((s) => (s + 1) as WizardStep);
  };

  const goBack = () => {
    if (wizardStep > 1) setWizardStep((s) => (s - 1) as WizardStep);
  };

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="border-b border-border bg-surface/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-accent" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {t("ssh.title")}
            </h1>
          </div>
          <p className="text-sm sm:text-base text-muted-2 max-w-2xl">
            {t("ssh.subtitle")}
          </p>
        </div>
      </div>

      <Container className="py-8 space-y-10">
        {/* ─── SSH Wizard Section ──────────────────────────────────────── */}
        <section>
          <div className="rounded-2xl bg-surface border border-border overflow-hidden">
            {/* Wizard header */}
            <div className="px-5 sm:px-8 pt-6 pb-2 border-b border-border">
              <div className="flex items-center gap-2 mb-1">
                <Server className="w-4 h-4 text-accent" />
                <h2 className="text-base sm:text-lg font-semibold text-foreground">
                  {t("ssh.wizard")}
                </h2>
              </div>
              <StepIndicator step={wizardStep} t={t} />
            </div>

            {/* Step content */}
            <div className="px-5 sm:px-8 py-6">
              <AnimatePresence mode="wait">
                {wizardStep === 1 && <Step1WhatIsSSH key="s1" t={t} />}
                {wizardStep === 2 && (
                  <Step2CreateKey
                    key="s2"
                    t={t}
                    keyChoice={keyChoice}
                    setKeyChoice={setKeyChoice}
                    keyName={keyName}
                    setKeyName={setKeyName}
                    keyType={keyType}
                    setKeyType={setKeyType}
                    existingKey={existingKey}
                    setExistingKey={setExistingKey}
                    generatedKey={generatedKey}
                    onGenerate={handleGenerate}
                  />
                )}
                {wizardStep === 3 && <Step3PublicKey key="s3" t={t} publicKey={publicKey} />}
                {wizardStep === 4 && (
                  <Step4TestConnection
                    key="s4"
                    t={t}
                    host={host}
                    setHost={setHost}
                    port={port}
                    setPort={setPort}
                    username={username}
                    setUsername={setUsername}
                    serverType={serverType}
                    setServerType={setServerType}
                    testState={testState}
                    onTest={handleTest}
                    errorMessage={errorMessage}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Navigation buttons */}
            <div className="px-5 sm:px-8 py-4 border-t border-border flex items-center justify-between">
              <Button
                variant="ghost"
                size="md"
                onClick={goBack}
                disabled={wizardStep === 1}
              >
                <ChevronLeft className="w-4 h-4" />
                {t("ssh.step.back")}
              </Button>

              <div className="flex items-center gap-2">
                {wizardStep < 4 ? (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={goNext}
                    disabled={!canProceed()}
                  >
                    {t("ssh.step.next")}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : testState === "connected" ? (
                  <Button variant="primary" size="md" onClick={handleSave}>
                    <Check className="w-4 h-4" />
                    {t("ssh.step.save")}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* ─── SSH Keys & Connections Section ──────────────────────────── */}
        <section>
          {/* Tab switcher */}
          <div className="flex items-center gap-1 mb-6 p-1 bg-surface-2 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab("keys")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
                activeTab === "keys"
                  ? "bg-accent text-background"
                  : "text-muted-2 hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                {t("ssh.keys.title")}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("connections")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
                activeTab === "connections"
                  ? "bg-accent text-background"
                  : "text-muted-2 hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-2">
                <Server className="w-4 h-4" />
                {t("ssh.connections.title")}
              </span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {/* ─── Keys Tab ─────────────────────────────────────────── */}
            {activeTab === "keys" && (
              <motion.div
                key="keys-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {sshKeys.length === 0 ? (
                  <div className="text-center py-12 rounded-xl bg-surface border border-border">
                    <Key className="w-10 h-10 text-muted-2 mx-auto mb-3" />
                    <p className="text-sm text-muted-2">{t("settings.ssh.noKeys")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Table header */}
                    <div className="hidden sm:grid sm:grid-cols-[1fr_100px_120px_120px_60px] gap-4 px-5 py-2 text-xs font-medium text-muted-2 uppercase tracking-wider">
                      <span>{t("ssh.step2.keyName")}</span>
                      <span>{t("ssh.keys.type")}</span>
                      <span>{t("ssh.keys.created")}</span>
                      <span>{t("ssh.keys.lastUsed")}</span>
                      <span />
                    </div>

                    {sshKeys.map((key) => (
                      <div
                        key={key.id}
                        className="grid grid-cols-1 sm:grid-cols-[1fr_100px_120px_120px_60px] gap-2 sm:gap-4 items-center px-5 py-4 rounded-xl bg-surface border border-border hover:border-border-light transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                            <Key className="w-4 h-4 text-accent" />
                          </div>
                          <span className="text-sm font-medium text-foreground truncate">
                            {key.name}
                          </span>
                        </div>
                        <Badge variant="info" className="w-fit">
                          {key.type}
                        </Badge>
                        <span className="text-sm text-muted-2">{key.created}</span>
                        <span className="text-sm text-muted-2">{key.lastUsed}</span>
                        <button
                          onClick={() => handleDeleteKey(key.id)}
                          className="p-2 rounded-lg text-muted-2 hover:text-red hover:bg-red/10 transition-colors cursor-pointer justify-self-end"
                          aria-label={t("ssh.keys.delete")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ─── Connections Tab ───────────────────────────────────── */}
            {activeTab === "connections" && (
              <motion.div
                key="connections-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {sshConnections.length === 0 ? (
                  <div className="text-center py-12 rounded-xl bg-surface border border-border">
                    <Server className="w-10 h-10 text-muted-2 mx-auto mb-3" />
                    <p className="text-sm text-muted-2">
                      No SSH connections yet. Use the wizard above to add one.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sshConnections.map((conn) => (
                      <div
                        key={conn.id}
                        className="rounded-xl bg-surface border border-border hover:border-border-light transition-colors overflow-hidden"
                      >
                        {/* Connection header */}
                        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                conn.status === "connected"
                                  ? "bg-accent/10"
                                  : "bg-surface-2"
                              }`}
                            >
                              {conn.status === "connected" ? (
                                <Wifi className="w-4 h-4 text-accent" />
                              ) : (
                                <WifiOff className="w-4 h-4 text-muted-2" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-foreground truncate">
                                  {conn.serverName}
                                </span>
                                <Badge
                                  variant={
                                    conn.status === "connected" ? "low" : "category"
                                  }
                                >
                                  {conn.status === "connected"
                                    ? t("ssh.connections.connected")
                                    : t("ssh.connections.notConnected")}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-2 mt-0.5">
                                {conn.username}@{conn.host}
                              </p>
                            </div>
                          </div>

                          {/* Server type badge */}
                          <Badge variant="info">
                            {t(`ssh.server.${conn.serverType}`)}
                          </Badge>

                          {/* OS & Uptime */}
                          <div className="hidden md:flex items-center gap-6 text-xs text-muted-2">
                            <span>
                              {t("ssh.connections.os")}:{" "}
                              <span className="text-foreground">{conn.os}</span>
                            </span>
                            <span>
                              {t("ssh.connections.uptime")}:{" "}
                              <span className="text-foreground">{conn.uptime}</span>
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            {conn.status === "connected" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleConnection(conn.id)}
                              >
                                <WifiOff className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">
                                  {t("ssh.connections.disconnect")}
                                </span>
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleConnection(conn.id)}
                              >
                                <Wifi className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">
                                  {t("ssh.connections.reconnect")}
                                </span>
                              </Button>
                            )}
                            <button
                              onClick={() => handleDeleteConnection(conn.id)}
                              className="p-2 rounded-lg text-muted-2 hover:text-red hover:bg-red/10 transition-colors cursor-pointer"
                              aria-label={t("ssh.connections.delete")}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Mobile OS/Uptime row */}
                        <div className="sm:hidden px-5 pb-3 flex items-center gap-4 text-xs text-muted-2">
                          <span>
                            {t("ssh.connections.os")}:{" "}
                            <span className="text-foreground">{conn.os}</span>
                          </span>
                          <span>
                            {t("ssh.connections.uptime")}:{" "}
                            <span className="text-foreground">{conn.uptime}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </Container>
    </div>
  );
}
