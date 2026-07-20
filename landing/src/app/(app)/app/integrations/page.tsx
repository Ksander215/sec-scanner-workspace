"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n-context";
import { useToast } from "@/components/ui/Toast";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import {
  GitBranch,
  Hash,
  Send,
  MessageCircle,
  Users,
  Lock,
  Shield,
  Container as ContainerIcon,
  Network,
  Cloud,
  ClipboardList,
  ArrowRight,
  Target,
  Mail,
  Webhook,
  Terminal,
  Search,
  Plug,
  AlertTriangle,
  Loader2,
  Settings2,
  Unplug,
  RefreshCw,
  X,
  Link2,
  Zap,
  Clock,
} from "lucide-react";
import { ContextualHelp } from "@/components/ui/ContextualHelp";
import { SectionFAQ } from "@/components/ui/SectionFAQ";
import { SmartNextStep, RECOMMENDATION_CHAINS } from "@/components/ui/SmartNextStep";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { BusinessResult } from "@/components/ui/BusinessResult";

// ─── Types ──────────────────────────────────────────────────────────────────

type IntegrationStatus = "connected" | "not_connected" | "error" | "syncing";
type IntegrationCategory =
  | "sourceControl"
  | "messaging"
  | "auth"
  | "infrastructure"
  | "issueTracking"
  | "communication"
  | "ssh";

type FieldType = "token" | "url" | "botToken" | "chatId" | "webhookUrl";

interface IntegrationField {
  key: FieldType;
  required: boolean;
}

interface Integration {
  id: string;
  nameKey: string;
  descKey: string;
  icon: React.ElementType;
  category: IntegrationCategory;
  status: IntegrationStatus;
  lastSync?: string;
  fields: IntegrationField[];
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

const integrationsData: Integration[] = [
  // Source Control
  {
    id: "github",
    nameKey: "integrations.github",
    descKey: "integrations.github.desc",
    icon: GitBranch,
    category: "sourceControl",
    status: "connected",
    lastSync: "2 min ago",
    fields: [{ key: "token", required: true }, { key: "url", required: false }],
  },
  {
    id: "gitlab",
    nameKey: "integrations.gitlab",
    descKey: "integrations.gitlab.desc",
    icon: GitBranch,
    category: "sourceControl",
    status: "connected",
    lastSync: "15 min ago",
    fields: [{ key: "token", required: true }, { key: "url", required: true }],
  },
  {
    id: "bitbucket",
    nameKey: "integrations.bitbucket",
    descKey: "integrations.bitbucket.desc",
    icon: GitBranch,
    category: "sourceControl",
    status: "not_connected",
    fields: [{ key: "token", required: true }, { key: "url", required: false }],
  },
  // Messaging
  {
    id: "slack",
    nameKey: "integrations.slack",
    descKey: "integrations.slack.desc",
    icon: Hash,
    category: "messaging",
    status: "connected",
    lastSync: "5 min ago",
    fields: [{ key: "webhookUrl", required: true }],
  },
  {
    id: "telegram",
    nameKey: "integrations.telegram",
    descKey: "integrations.telegram.desc",
    icon: Send,
    category: "messaging",
    status: "error",
    lastSync: "2 hours ago",
    fields: [{ key: "botToken", required: true }, { key: "chatId", required: true }],
  },
  {
    id: "discord",
    nameKey: "integrations.discord",
    descKey: "integrations.discord.desc",
    icon: MessageCircle,
    category: "messaging",
    status: "not_connected",
    fields: [{ key: "webhookUrl", required: true }],
  },
  {
    id: "teams",
    nameKey: "integrations.teams",
    descKey: "integrations.teams.desc",
    icon: Users,
    category: "messaging",
    status: "syncing",
    fields: [{ key: "webhookUrl", required: true }],
  },
  // Auth
  {
    id: "ldap",
    nameKey: "integrations.ldap",
    descKey: "integrations.ldap.desc",
    icon: Lock,
    category: "auth",
    status: "connected",
    lastSync: "1 hour ago",
    fields: [{ key: "url", required: true }, { key: "token", required: true }],
  },
  {
    id: "saml",
    nameKey: "integrations.saml",
    descKey: "integrations.saml.desc",
    icon: Shield,
    category: "auth",
    status: "not_connected",
    fields: [{ key: "url", required: true }, { key: "token", required: true }],
  },
  // Infrastructure
  {
    id: "docker",
    nameKey: "integrations.docker",
    descKey: "integrations.docker.desc",
    icon: ContainerIcon,
    category: "infrastructure",
    status: "connected",
    lastSync: "10 min ago",
    fields: [{ key: "url", required: true }, { key: "token", required: false }],
  },
  {
    id: "kubernetes",
    nameKey: "integrations.kubernetes",
    descKey: "integrations.kubernetes.desc",
    icon: Network,
    category: "infrastructure",
    status: "syncing",
    fields: [{ key: "url", required: true }, { key: "token", required: true }],
  },
  {
    id: "aws",
    nameKey: "integrations.aws",
    descKey: "integrations.aws.desc",
    icon: Cloud,
    category: "infrastructure",
    status: "connected",
    lastSync: "30 min ago",
    fields: [{ key: "token", required: true }],
  },
  {
    id: "azure",
    nameKey: "integrations.azure",
    descKey: "integrations.azure.desc",
    icon: Cloud,
    category: "infrastructure",
    status: "not_connected",
    fields: [{ key: "token", required: true }, { key: "url", required: false }],
  },
  {
    id: "gcp",
    nameKey: "integrations.gcp",
    descKey: "integrations.gcp.desc",
    icon: Cloud,
    category: "infrastructure",
    status: "not_connected",
    fields: [{ key: "token", required: true }],
  },
  // Issue Tracking
  {
    id: "jira",
    nameKey: "integrations.jira",
    descKey: "integrations.jira.desc",
    icon: ClipboardList,
    category: "issueTracking",
    status: "connected",
    lastSync: "8 min ago",
    fields: [{ key: "url", required: true }, { key: "token", required: true }],
  },
  {
    id: "linear",
    nameKey: "integrations.linear",
    descKey: "integrations.linear.desc",
    icon: ArrowRight,
    category: "issueTracking",
    status: "not_connected",
    fields: [{ key: "token", required: true }],
  },
  {
    id: "youtrack",
    nameKey: "integrations.youtrack",
    descKey: "integrations.youtrack.desc",
    icon: Target,
    category: "issueTracking",
    status: "not_connected",
    fields: [{ key: "url", required: true }, { key: "token", required: true }],
  },
  // Communication
  {
    id: "email",
    nameKey: "integrations.email",
    descKey: "integrations.email.desc",
    icon: Mail,
    category: "communication",
    status: "connected",
    lastSync: "Just now",
    fields: [{ key: "url", required: true }, { key: "token", required: true }],
  },
  {
    id: "webhook",
    nameKey: "integrations.webhook",
    descKey: "integrations.webhook.desc",
    icon: Webhook,
    category: "communication",
    status: "error",
    lastSync: "3 hours ago",
    fields: [{ key: "webhookUrl", required: true }],
  },
  // SSH
  {
    id: "ssh",
    nameKey: "integrations.ssh",
    descKey: "integrations.ssh.desc",
    icon: Terminal,
    category: "ssh",
    status: "connected",
    lastSync: "1 min ago",
    fields: [{ key: "url", required: true }, { key: "token", required: false }],
  },
];

const categoryOrder: IntegrationCategory[] = [
  "sourceControl",
  "messaging",
  "auth",
  "infrastructure",
  "issueTracking",
  "communication",
  "ssh",
];

const categoryKeys: Record<IntegrationCategory, string> = {
  sourceControl: "integrations.cat.sourceControl",
  messaging: "integrations.cat.messaging",
  auth: "integrations.cat.auth",
  infrastructure: "integrations.cat.infrastructure",
  issueTracking: "integrations.cat.issueTracking",
  communication: "integrations.cat.communication",
  ssh: "integrations.cat.ssh",
};

// ─── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({ status, t }: { status: IntegrationStatus; t: (k: string) => string }) {
  switch (status) {
    case "connected":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-accent-muted text-accent border border-accent/20">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          {t("integrations.connected")}
        </span>
      );
    case "not_connected":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-surface-2 text-muted-2 border border-border">
          <span className="w-1.5 h-1.5 rounded-full bg-muted" />
          {t("integrations.notConnected")}
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-red-muted text-red border border-red/20">
          <AlertTriangle className="w-3 h-3" />
          {t("integrations.error")}
        </span>
      );
    case "syncing":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-cyan-muted text-cyan border border-cyan/20">
          <Loader2 className="w-3 h-3 animate-spin" />
          {t("integrations.syncing")}
        </span>
      );
  }
}

// ─── Integration Card ───────────────────────────────────────────────────────

function IntegrationCard({
  integration,
  t,
  onConnect,
  onTest,
  onDisconnect,
  onReconnect,
  onConfigure,
  testing,
}: {
  integration: Integration;
  t: (k: string) => string;
  onConnect: (i: Integration) => void;
  onTest: (i: Integration) => void;
  onDisconnect: (i: Integration) => void;
  onReconnect: (i: Integration) => void;
  onConfigure: (i: Integration) => void;
  testing: string | null;
}) {
  const Icon = integration.icon;
  const isTesting = testing === integration.id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      className="group relative p-5 rounded-xl bg-surface border border-border hover:border-border-light transition-all duration-300"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="shrink-0 w-11 h-11 rounded-lg bg-accent-muted flex items-center justify-center group-hover:bg-accent-muted/80 transition-colors">
          <Icon className="w-5 h-5 text-accent" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {t(integration.nameKey)}
              </h3>
              <p className="text-xs text-muted-2 mt-0.5 line-clamp-2 leading-relaxed">
                {t(integration.descKey)}
              </p>
            </div>
            <StatusBadge status={integration.status} t={t} />
          </div>

          {/* Last sync */}
          {integration.lastSync && integration.status !== "not_connected" && (
            <div className="flex items-center gap-1.5 mt-2">
              <Clock className="w-3 h-3 text-muted" />
              <span className="text-xs text-muted">
                {t("integrations.lastSync")}: {integration.lastSync}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {integration.status === "connected" && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onTest(integration)}
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  {t("integrations.testConnection")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onReconnect(integration)}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t("integrations.reconnect")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onConfigure(integration)}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  {t("integrations.configure")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDisconnect(integration)}
                  className="text-red hover:text-red hover:bg-red-muted"
                >
                  <Unplug className="w-3.5 h-3.5" />
                  {t("integrations.disconnect")}
                </Button>
              </>
            )}
            {integration.status === "error" && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onTest(integration)}
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  {t("integrations.testConnection")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onReconnect(integration)}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t("integrations.reconnect")}
                </Button>
              </>
            )}
            {integration.status === "not_connected" && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => onConnect(integration)}
              >
                <Link2 className="w-3.5 h-3.5" />
                {t("integrations.connect")}
              </Button>
            )}
            {integration.status === "syncing" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onConfigure(integration)}
              >
                <Settings2 className="w-3.5 h-3.5" />
                {t("integrations.configure")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Status indicator line */}
      <div
        className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-xl transition-all duration-300 ${
          integration.status === "connected"
            ? "bg-accent"
            : integration.status === "error"
              ? "bg-red"
              : integration.status === "syncing"
                ? "bg-cyan animate-pulse"
                : "bg-transparent"
        }`}
      />
    </motion.div>
  );
}

// ─── Connect Dialog ─────────────────────────────────────────────────────────

function ConnectDialog({
  integration,
  t,
  onClose,
  onConnect,
  onTest,
  testing,
}: {
  integration: Integration;
  t: (k: string) => string;
  onClose: () => void;
  onConnect: (id: string, values: Record<string, string>) => void;
  onTest: (id: string, values: Record<string, string>) => void;
  testing: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const Icon = integration.icon;

  const fieldLabelMap: Record<FieldType, string> = {
    token: t("integrations.token"),
    url: t("integrations.url"),
    botToken: t("integrations.botToken"),
    chatId: t("integrations.chatId"),
    webhookUrl: t("integrations.webhookUrl"),
  };

  const fieldPlaceholderMap: Record<FieldType, string> = {
    token: "ssi_****...",
    url: "https://...",
    botToken: "123456:ABC-DEF...",
    chatId: "-1001234567890",
    webhookUrl: "https://hooks.example.com/...",
  };

  const isValid = integration.fields
    .filter((f) => f.required)
    .every((f) => values[f.key]?.trim());

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent-muted flex items-center justify-center">
              <Icon className="w-4.5 h-4.5 text-accent" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {t(integration.nameKey)}
              </h2>
              <p className="text-xs text-muted-2 mt-0.5">
                {t(integration.descKey)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="p-5 space-y-4">
          {integration.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                {fieldLabelMap[field.key]}
                {field.required && (
                  <span className="text-red ml-0.5">*</span>
                )}
              </label>
              <input
                type={field.key === "token" || field.key === "botToken" ? "password" : "text"}
                value={values[field.key] || ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                placeholder={fieldPlaceholderMap[field.key]}
                className="w-full px-3 py-2 text-sm rounded-lg bg-surface-2 border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors"
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-border bg-surface-2/50">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onTest(integration.id, values)}
            disabled={!isValid || testing}
          >
            {testing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5" />
            )}
            {t("integrations.testConnection")}
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => onConnect(integration.id, values)}
            disabled={!isValid}
          >
            <Link2 className="w-3.5 h-3.5" />
            {t("integrations.connect")}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Category Header ────────────────────────────────────────────────────────

const categoryIcons: Record<IntegrationCategory, React.ElementType> = {
  sourceControl: GitBranch,
  messaging: Hash,
  auth: Lock,
  infrastructure: Cloud,
  issueTracking: ClipboardList,
  communication: Mail,
  ssh: Terminal,
};

// ─── Main Page ──────────────────────────────────────────────────────────────

type TabKey = "all" | "connected" | "available";

export default function IntegrationsHubPage() {
  const { t } = useI18n();
  const { addToast } = useToast();

  const [integrations, setIntegrations] = useState<Integration[]>(integrationsData);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [connectTarget, setConnectTarget] = useState<Integration | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [dialogTesting, setDialogTesting] = useState(false);

  // Filter integrations
  const filtered = useMemo(() => {
    let result = integrations;

    // Tab filter
    if (activeTab === "connected") {
      result = result.filter(
        (i) => i.status === "connected" || i.status === "error" || i.status === "syncing"
      );
    } else if (activeTab === "available") {
      result = result.filter((i) => i.status === "not_connected");
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          t(i.nameKey).toLowerCase().includes(q) ||
          t(i.descKey).toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q)
      );
    }

    return result;
  }, [integrations, activeTab, searchQuery, t]);

  // Group by category
  const grouped = useMemo(() => {
    const groups: Partial<Record<IntegrationCategory, Integration[]>> = {};
    for (const cat of categoryOrder) {
      const items = filtered.filter((i) => i.category === cat);
      if (items.length > 0) {
        groups[cat] = items;
      }
    }
    return groups;
  }, [filtered]);

  // Stats
  const stats = useMemo(() => {
    const connected = integrations.filter((i) => i.status === "connected").length;
    const error = integrations.filter((i) => i.status === "error").length;
    const syncing = integrations.filter((i) => i.status === "syncing").length;
    const available = integrations.filter((i) => i.status === "not_connected").length;
    return { connected, error, syncing, available, total: integrations.length };
  }, [integrations]);

  // Handlers
  const handleConnect = (integration: Integration) => {
    setConnectTarget(integration);
  };

  const handleTestConnection = (integration: Integration) => {
    setTestingId(integration.id);
    setTimeout(() => {
      setTestingId(null);
      if (integration.status === "error") {
        addToast({
          type: "error",
          title: t("integrations.connectionFailed"),
          description: t(integration.nameKey),
        });
      } else {
        addToast({
          type: "success",
          title: t("integrations.connectionSuccess"),
          description: t(integration.nameKey),
        });
      }
    }, 1500);
  };

  const handleDisconnect = (integration: Integration) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === integration.id
          ? { ...i, status: "not_connected" as IntegrationStatus, lastSync: undefined }
          : i
      )
    );
    addToast({
      type: "info",
      title: t(integration.nameKey),
      description: "Disconnected",
    });
  };

  const handleReconnect = (integration: Integration) => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === integration.id
          ? { ...i, status: "syncing" as IntegrationStatus, lastSync: "..." }
          : i
      )
    );
    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === integration.id
            ? { ...i, status: "connected" as IntegrationStatus, lastSync: "Just now" }
            : i
        )
      );
      addToast({
        type: "success",
        title: t("integrations.connectionSuccess"),
        description: t(integration.nameKey),
      });
    }, 2000);
  };

  const handleConfigure = (integration: Integration) => {
    setConnectTarget(integration);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDialogConnect = (id: string, _values: Record<string, string>): void => {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, status: "syncing" as IntegrationStatus, lastSync: "..." }
          : i
      )
    );
    setConnectTarget(null);
    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, status: "connected" as IntegrationStatus, lastSync: "Just now" }
            : i
        )
      );
      addToast({
        type: "success",
        title: t("integrations.connectionSuccess"),
        description: t(
          integrations.find((i) => i.id === id)?.nameKey || ""
        ),
      });
    }, 1500);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDialogTest = (id: string, _values: Record<string, string>): void => {
    setDialogTesting(true);
    setTimeout(() => {
      setDialogTesting(false);
      addToast({
        type: "success",
        title: t("integrations.connectionSuccess"),
        description: t(
          integrations.find((i) => i.id === id)?.nameKey || ""
        ),
      });
    }, 1500);
  };

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "all", label: t("integrations.tab.all"), count: stats.total },
    { key: "connected", label: t("integrations.tab.connected"), count: stats.connected + stats.error + stats.syncing },
    { key: "available", label: t("integrations.tab.available"), count: stats.available },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Page Header */}
      <div id="integrations-header" className="border-b border-border bg-surface/50" data-scroll-section={t("scroll.integrations.overview")}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center">
                <Plug className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  {t("integrations.title")}
                </h1>
                <p className="text-sm text-muted-2 mt-0.5">
                  {t("integrations.subtitle")}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <ContextualHelp section="integrations" />
                  <DemoBadge />
                </div>
                <BusinessResult type="connected" className="mt-4" />
              </div>
            </div>

            {/* Stats pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-accent-muted text-accent border border-accent/20">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                {stats.connected} {t("integrations.connected")}
              </span>
              {stats.error > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-red-muted text-red border border-red/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-red" />
                  {stats.error} {t("integrations.error")}
                </span>
              )}
              {stats.syncing > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-cyan-muted text-cyan border border-cyan/20">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {stats.syncing} {t("integrations.syncing")}
                </span>
              )}
            </div>
          </div>

          {/* Tabs + Search */}
          <div id="integrations-tabs" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-6" data-scroll-section={t("scroll.integrations.catalog")}>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-2 border border-border">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    activeTab === tab.key
                      ? "bg-accent text-background"
                      : "text-muted-2 hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      activeTab === tab.key
                        ? "bg-background/20 text-background"
                        : "bg-surface text-muted"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("integrations.search")}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-surface-2 border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-muted hover:text-foreground transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <Container className="py-8">
        {Object.keys(grouped).length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-2" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              No integrations found
            </h2>
            <p className="text-sm text-muted-2 max-w-md">
              Try adjusting your search or filter to find what you&apos;re looking for.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-10">
            {categoryOrder.map((cat) => {
              const items = grouped[cat];
              if (!items) return null;

              const CatIcon = categoryIcons[cat];

              return (
                <motion.section
                  key={cat}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: categoryOrder.indexOf(cat) * 0.05 }}
                >
                  {/* Category Header */}
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-7 h-7 rounded-md bg-surface-2 border border-border flex items-center justify-center">
                      <CatIcon className="w-3.5 h-3.5 text-muted-2" />
                    </div>
                    <h2 className="text-sm font-semibold text-foreground">
                      {t(categoryKeys[cat])}
                    </h2>
                    <span className="text-xs text-muted px-1.5 py-0.5 rounded-full bg-surface-2 border border-border">
                      {items.length}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* Integration Cards Grid */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                      {items.map((integration) => (
                        <IntegrationCard
                          key={integration.id}
                          integration={integration}
                          t={t}
                          onConnect={handleConnect}
                          onTest={handleTestConnection}
                          onDisconnect={handleDisconnect}
                          onReconnect={handleReconnect}
                          onConfigure={handleConfigure}
                          testing={testingId}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.section>
              );
            })}
          </div>
        )}
      </Container>

      {/* Connect Dialog */}
      <AnimatePresence>
        {connectTarget && (
          <ConnectDialog
            integration={connectTarget}
            t={t}
            onClose={() => setConnectTarget(null)}
            onConnect={handleDialogConnect}
            onTest={handleDialogTest}
            testing={dialogTesting}
          />
        )}
      </AnimatePresence>

      <div id="integrations-faq" className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4" data-scroll-section={t("scroll.integrations.faq")}>
        <SectionFAQ section="integrations" />
        <SmartNextStep {...RECOMMENDATION_CHAINS["integrations"]} />
      </div>
    </div>
  );
}
