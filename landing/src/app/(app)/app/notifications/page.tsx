"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n-context";
import { useToast } from "@/components/ui/Toast";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Bell,
  Plus,
  X,
  Trash2,
  Pencil,
  Send,
  MessageCircle,
  Hash,
  Mail,
  Webhook,
  ExternalLink,
  AlertTriangle,
  Shield,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronDown,
  FileText,
  UserPlus,
  Zap,
} from "lucide-react";
import { ContextualHelp } from "@/components/ui/ContextualHelp";
import { SectionFAQ } from "@/components/ui/SectionFAQ";
import { SmartNextStep, RECOMMENDATION_CHAINS } from "@/components/ui/SmartNextStep";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { BusinessResult } from "@/components/ui/BusinessResult";

// ─── Types ──────────────────────────────────────────────────────────────────

type Channel = "telegram" | "slack" | "discord" | "teams" | "email" | "webhook";

type Trigger =
  | "scanComplete"
  | "criticalFinding"
  | "highFinding"
  | "newFinding"
  | "remediation"
  | "assignment";

type NotificationStatus = "sent" | "failed" | "pending";

interface NotificationRule {
  id: string;
  name: string;
  channel: Channel;
  triggers: Trigger[];
  enabled: boolean;
  lastTriggered: string | null;
  config: Record<string, string>;
}

interface NotificationHistoryEntry {
  id: string;
  ruleId: string;
  channel: Channel;
  trigger: Trigger;
  title: string;
  sentAt: string;
  status: NotificationStatus;
}

interface RuleFormData {
  name: string;
  channel: Channel | null;
  triggers: Trigger[];
  config: Record<string, string>;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CHANNELS: Channel[] = ["telegram", "slack", "discord", "teams", "email", "webhook"];

const ALL_TRIGGERS: Trigger[] = [
  "scanComplete",
  "criticalFinding",
  "highFinding",
  "newFinding",
  "remediation",
  "assignment",
];

const CHANNEL_ICONS: Record<Channel, React.ElementType> = {
  telegram: Send,
  slack: Hash,
  discord: MessageCircle,
  teams: ChevronDown,
  email: Mail,
  webhook: Webhook,
};

const CHANNEL_COLORS: Record<Channel, string> = {
  telegram: "bg-cyan-muted text-cyan border-cyan/20",
  slack: "bg-purple-muted text-purple border-purple/20",
  discord: "bg-accent-muted text-accent border-accent/20",
  teams: "bg-accent-muted text-accent border-accent/20",
  email: "bg-amber-muted text-amber border-amber/20",
  webhook: "bg-red-muted text-red border-red/20",
};

const TRIGGER_COLORS: Record<Trigger, string> = {
  scanComplete: "bg-accent-muted text-accent border-accent/20",
  criticalFinding: "bg-red-muted text-red border-red/20",
  highFinding: "bg-amber-muted text-amber border-amber/20",
  newFinding: "bg-cyan-muted text-cyan border-cyan/20",
  remediation: "bg-purple-muted text-purple border-purple/20",
  assignment: "bg-surface-2 text-muted-2 border-border",
};

const STATUS_CONFIG: Record<NotificationStatus, { color: string; icon: React.ElementType }> = {
  sent: { color: "text-accent", icon: CheckCircle2 },
  failed: { color: "text-red", icon: XCircle },
  pending: { color: "text-amber", icon: Clock },
};

// ─── Mock Data ──────────────────────────────────────────────────────────────

const INITIAL_RULES: NotificationRule[] = [
  {
    id: "rule-1",
    name: "Critical Alerts — Telegram",
    channel: "telegram",
    triggers: ["criticalFinding", "highFinding"],
    enabled: true,
    lastTriggered: "2m ago",
    config: { botToken: "7234...:AAHx...", chatId: "-1001234567890" },
  },
  {
    id: "rule-2",
    name: "Scan Results — Slack",
    channel: "slack",
    triggers: ["scanComplete", "newFinding"],
    enabled: true,
    lastTriggered: "15m ago",
    config: { webhookUrl: "https://hooks.slack.com/services/T.../B.../xxx" },
  },
  {
    id: "rule-3",
    name: "Remediation Updates — Email",
    channel: "email",
    triggers: ["remediation", "assignment"],
    enabled: false,
    lastTriggered: null,
    config: { recipientEmail: "security@company.com" },
  },
  {
    id: "rule-4",
    name: "All Events — Webhook",
    channel: "webhook",
    triggers: ["scanComplete", "criticalFinding", "highFinding", "newFinding", "remediation", "assignment"],
    enabled: true,
    lastTriggered: "1h ago",
    config: { url: "https://api.example.com/webhooks/sip", secret: "whsec_****" },
  },
];

const INITIAL_HISTORY: NotificationHistoryEntry[] = [
  {
    id: "hist-1",
    ruleId: "rule-1",
    channel: "telegram",
    trigger: "criticalFinding",
    title: "CVE-2024-5678 — RCE in Apache Struts",
    sentAt: "2m ago",
    status: "sent",
  },
  {
    id: "hist-2",
    ruleId: "rule-2",
    channel: "slack",
    trigger: "scanComplete",
    title: "Scan completed: production-api",
    sentAt: "15m ago",
    status: "sent",
  },
  {
    id: "hist-3",
    ruleId: "rule-4",
    channel: "webhook",
    trigger: "highFinding",
    title: "XSS vulnerability in user-dashboard",
    sentAt: "1h ago",
    status: "sent",
  },
  {
    id: "hist-4",
    ruleId: "rule-2",
    channel: "slack",
    trigger: "newFinding",
    title: "New finding: Misconfigured CORS policy",
    sentAt: "2h ago",
    status: "failed",
  },
  {
    id: "hist-5",
    ruleId: "rule-1",
    channel: "telegram",
    trigger: "criticalFinding",
    title: "CVE-2024-1234 — SQL Injection in auth-service",
    sentAt: "3h ago",
    status: "sent",
  },
  {
    id: "hist-6",
    ruleId: "rule-4",
    channel: "webhook",
    trigger: "remediation",
    title: "Remediation verified: SSRF patch deployed",
    sentAt: "5h ago",
    status: "pending",
  },
];

const DEFAULT_FORM: RuleFormData = {
  name: "",
  channel: null,
  triggers: [],
  config: {},
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function ChannelBadge({ channel, t }: { channel: Channel; t: (k: string) => string }) {
  const Icon = CHANNEL_ICONS[channel];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-md border ${CHANNEL_COLORS[channel]}`}
    >
      <Icon className="w-3 h-3" />
      {t(`notifications.channel.${channel}`)}
    </span>
  );
}

function TriggerBadge({ trigger, t }: { trigger: Trigger; t: (k: string) => string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border ${TRIGGER_COLORS[trigger]}`}
    >
      {t(`notifications.trigger.${trigger}`)}
    </span>
  );
}

function StatusBadge({ status, t }: { status: NotificationStatus; t: (k: string) => string }) {
  const { color, icon: Icon } = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      {t(`notifications.status.${status}`)}
    </span>
  );
}

function ToggleSwitch({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        enabled ? "bg-accent" : "bg-surface-2 border-border"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full shadow ring-0 transition-transform duration-200 ease-in-out ${
          enabled
            ? "translate-x-5 bg-background"
            : "translate-x-0 bg-muted"
        }`}
      />
    </button>
  );
}

function TriggerIcon({ trigger }: { trigger: Trigger }) {
  const iconMap: Record<Trigger, React.ElementType> = {
    scanComplete: FileText,
    criticalFinding: AlertTriangle,
    highFinding: Shield,
    newFinding: Zap,
    remediation: CheckCircle2,
    assignment: UserPlus,
  };
  const Icon = iconMap[trigger];
  return <Icon className="w-3.5 h-3.5" />;
}

// ─── Channel Config Fields ──────────────────────────────────────────────────

function ChannelConfigFields({
  channel,
  config,
  onChange,
  t,
}: {
  channel: Channel;
  config: Record<string, string>;
  onChange: (key: string, value: string) => void;
  t: (k: string) => string;
}) {
  const inputClass =
    "w-full px-3 py-2.5 text-sm rounded-lg bg-surface-2 border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors";

  switch (channel) {
    case "telegram":
      return (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              {t("notifications.config.botToken")}
            </label>
            <input
              type="text"
              value={config.botToken ?? ""}
              onChange={(e) => onChange("botToken", e.target.value)}
              placeholder={t("notifications.config.botTokenPlaceholder")}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              {t("notifications.config.chatId")}
            </label>
            <input
              type="text"
              value={config.chatId ?? ""}
              onChange={(e) => onChange("chatId", e.target.value)}
              placeholder={t("notifications.config.chatIdPlaceholder")}
              className={inputClass}
            />
          </div>
        </div>
      );
    case "slack":
    case "discord":
    case "teams":
      return (
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            {t("notifications.config.webhookUrl")}
          </label>
          <input
            type="text"
            value={config.webhookUrl ?? ""}
            onChange={(e) => onChange("webhookUrl", e.target.value)}
            placeholder={t("notifications.config.webhookUrlPlaceholder")}
            className={inputClass}
          />
        </div>
      );
    case "email":
      return (
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">
            {t("notifications.config.recipientEmail")}
          </label>
          <input
            type="email"
            value={config.recipientEmail ?? ""}
            onChange={(e) => onChange("recipientEmail", e.target.value)}
            placeholder={t("notifications.config.recipientEmailPlaceholder")}
            className={inputClass}
          />
        </div>
      );
    case "webhook":
      return (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              {t("notifications.config.url")}
            </label>
            <input
              type="text"
              value={config.url ?? ""}
              onChange={(e) => onChange("url", e.target.value)}
              placeholder={t("notifications.config.urlPlaceholder")}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">
              {t("notifications.config.secret")}
            </label>
            <input
              type="password"
              value={config.secret ?? ""}
              onChange={(e) => onChange("secret", e.target.value)}
              placeholder={t("notifications.config.secretPlaceholder")}
              className={inputClass}
            />
          </div>
        </div>
      );
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { t } = useI18n();
  const { addToast } = useToast();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // ─── State ──────────────────────────────────────────────────────────────
  const [rules, setRules] = useState<NotificationRule[]>(INITIAL_RULES);
  const [history] = useState<NotificationHistoryEntry[]>(INITIAL_HISTORY);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(DEFAULT_FORM);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleToggleRule = useCallback(
    (id: string) => {
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
      );
      addToast({ type: "info", title: t("notifications.ruleToggled") });
    },
    [addToast, t]
  );

  const handleDeleteRule = useCallback(
    (id: string) => {
      setRules((prev) => prev.filter((r) => r.id !== id));
      setDeleteConfirmId(null);
      addToast({ type: "success", title: t("notifications.ruleDeleted") });
    },
    [addToast, t]
  );

  const handleOpenCreate = useCallback(() => {
    setFormData(DEFAULT_FORM);
    setEditingRuleId(null);
    setShowCreateDialog(true);
  }, []);

  const handleOpenEdit = useCallback(
    (rule: NotificationRule) => {
      setFormData({
        name: rule.name,
        channel: rule.channel,
        triggers: [...rule.triggers],
        config: { ...rule.config },
      });
      setEditingRuleId(rule.id);
      setShowCreateDialog(true);
    },
    []
  );

  const handleSaveRule = useCallback(() => {
    if (!formData.name.trim() || !formData.channel || formData.triggers.length === 0) return;

    if (editingRuleId) {
      setRules((prev) =>
        prev.map((r) =>
          r.id === editingRuleId
            ? {
                ...r,
                name: formData.name.trim(),
                channel: formData.channel!,
                triggers: formData.triggers,
                config: formData.config,
              }
            : r
        )
      );
      addToast({ type: "success", title: t("notifications.ruleUpdated") });
    } else {
      const newRule: NotificationRule = {
        id: `rule-${Date.now()}`,
        name: formData.name.trim(),
        channel: formData.channel!,
        triggers: formData.triggers,
        enabled: true,
        lastTriggered: null,
        config: formData.config,
      };
      setRules((prev) => [newRule, ...prev]);
      addToast({
        type: "success",
        title: t("notifications.ruleCreated"),
        description: t("notifications.ruleCreatedDesc"),
      });
    }

    setShowCreateDialog(false);
    setFormData(DEFAULT_FORM);
    setEditingRuleId(null);
  }, [formData, editingRuleId, addToast, t]);

  const toggleTrigger = useCallback((trigger: Trigger) => {
    setFormData((prev) => ({
      ...prev,
      triggers: prev.triggers.includes(trigger)
        ? prev.triggers.filter((t) => t !== trigger)
        : [...prev.triggers, trigger],
    }));
  }, []);

  const updateConfig = useCallback((key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      config: { ...prev.config, [key]: value },
    }));
  }, []);

  const isFormValid = formData.name.trim() && formData.channel && formData.triggers.length > 0;

  if (!mounted) return null;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="animate-page-in min-h-[calc(100vh-7rem)]">
      {/* ─── Page Header ──────────────────────────────────────────────── */}
      <div id="notifications-header" className="border-b border-border bg-surface/50" data-scroll-section={t("scroll.notifications.overview")}>
        <Container className="py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center">
                <Bell className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                  {t("notifications.title")}
                </h1>
                <p className="text-sm text-muted-2 mt-0.5">
                  {t("notifications.subtitle")}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <ContextualHelp section="notifications" />
                  <DemoBadge />
                </div>
                {rules.length > 0 && <BusinessResult type="configured" className="mt-4" />}
              </div>
            </div>
            <Button onClick={handleOpenCreate}>
              <Plus className="w-4 h-4" />
              {t("notifications.create")}
            </Button>
          </div>
        </Container>
      </div>

      {/* ─── Main Content ─────────────────────────────────────────────── */}
      <Container className="py-6 space-y-8">
        {/* ─── Notification Rules ──────────────────────────────────────── */}
        <section id="notifications-rules" data-scroll-section={t("scroll.notifications.rules")}>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {t("notifications.createRule")}
          </h2>

          <AnimatePresence mode="wait">
            {rules.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-6">
                  <Bell className="w-8 h-8 text-muted" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {t("notifications.noRules")}
                </h3>
                <p className="text-muted-2 max-w-md mb-8">
                  {t("notifications.noRulesDesc")}
                </p>
                <Button onClick={handleOpenCreate}>
                  <Plus className="w-4 h-4" />
                  {t("notifications.create")}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="rules"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* Desktop Table */}
                <div className="hidden lg:block rounded-xl bg-surface border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider text-left font-medium">
                            {t("notifications.ruleName")}
                          </th>
                          <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider text-left font-medium">
                            {t("notifications.channel")}
                          </th>
                          <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider text-left font-medium">
                            {t("notifications.trigger")}
                          </th>
                          <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider text-center font-medium">
                            Status
                          </th>
                          <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider text-left font-medium">
                            {t("notifications.lastTriggered")}
                          </th>
                          <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider text-right font-medium">
                            &nbsp;
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rules.map((rule, i) => (
                          <motion.tr
                            key={rule.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04, duration: 0.2 }}
                            className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors group"
                          >
                            {/* Name */}
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Bell className="w-3.5 h-3.5 text-muted shrink-0" />
                                <span className="font-medium text-foreground">
                                  {rule.name}
                                </span>
                              </div>
                            </td>
                            {/* Channel */}
                            <td className="px-4 py-3">
                              <ChannelBadge channel={rule.channel} t={t} />
                            </td>
                            {/* Triggers */}
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {rule.triggers.map((trigger) => (
                                  <TriggerBadge key={trigger} trigger={trigger} t={t} />
                                ))}
                              </div>
                            </td>
                            {/* Enabled Toggle */}
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center">
                                <ToggleSwitch
                                  enabled={rule.enabled}
                                  onToggle={() => handleToggleRule(rule.id)}
                                />
                              </div>
                            </td>
                            {/* Last Triggered */}
                            <td className="px-4 py-3 text-sm text-muted-2">
                              {rule.lastTriggered ?? t("notifications.never")}
                            </td>
                            {/* Actions */}
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleOpenEdit(rule)}
                                  className="p-1.5 rounded-md hover:bg-surface-2 transition-colors text-muted hover:text-cyan"
                                  title={t("notifications.edit")}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(rule.id)}
                                  className="p-1.5 rounded-md hover:bg-surface-2 transition-colors text-muted hover:text-red"
                                  title={t("notifications.delete")}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-4">
                  {rules.map((rule, i) => (
                    <motion.div
                      key={rule.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.25 }}
                      className="p-4 rounded-xl bg-surface border border-border"
                    >
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Bell className="w-4 h-4 text-accent shrink-0" />
                          <span className="font-medium text-foreground text-sm truncate">
                            {rule.name}
                          </span>
                        </div>
                        <ToggleSwitch
                          enabled={rule.enabled}
                          onToggle={() => handleToggleRule(rule.id)}
                        />
                      </div>

                      {/* Channel */}
                      <div className="mb-3">
                        <ChannelBadge channel={rule.channel} t={t} />
                      </div>

                      {/* Triggers */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {rule.triggers.map((trigger) => (
                          <TriggerBadge key={trigger} trigger={trigger} t={t} />
                        ))}
                      </div>

                      {/* Meta + Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <span className="text-xs text-muted-2">
                          {t("notifications.lastTriggered")}: {rule.lastTriggered ?? t("notifications.never")}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(rule)}
                            className="p-1.5 rounded-md hover:bg-surface-2 transition-colors text-muted hover:text-cyan"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(rule.id)}
                            className="p-1.5 rounded-md hover:bg-surface-2 transition-colors text-muted hover:text-red"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ─── Notification Preview ────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {t("notifications.preview")}
          </h2>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="rounded-xl bg-surface border border-border overflow-hidden"
          >
            {/* Preview Header */}
            <div className="px-6 py-4 border-b border-border bg-surface-2/50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-muted flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">
                  {t("notifications.example.title")}
                </h3>
                <p className="text-xs text-muted-2 mt-0.5">
                  {t("notifications.preview.description")}
                </p>
              </div>
              <Badge variant="critical">{t("notifications.preview.severity")}</Badge>
            </div>

            {/* Preview Body */}
            <div className="px-6 py-4 space-y-4">
              {/* Finding Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-muted block text-xs mb-0.5">CVE</span>
                  <span className="text-foreground font-mono text-xs">CVE-2024-1234</span>
                </div>
                <div>
                  <span className="text-muted block text-xs mb-0.5">Type</span>
                  <span className="text-foreground text-xs">SQL Injection</span>
                </div>
                <div>
                  <span className="text-muted block text-xs mb-0.5">Target</span>
                  <span className="text-foreground font-mono text-xs">prod-api.example.com</span>
                </div>
                <div>
                  <span className="text-muted block text-xs mb-0.5">CVSS</span>
                  <span className="text-red font-bold text-xs">9.8</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="primary">
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t("notifications.example.openReport")}
                </Button>
                <Button size="sm" variant="outline">
                  <FileText className="w-3.5 h-3.5" />
                  {t("notifications.example.openFinding")}
                </Button>
                <Button size="sm" variant="ghost">
                  <UserPlus className="w-3.5 h-3.5" />
                  {t("notifications.example.assign")}
                </Button>
                <Button size="sm" variant="ghost" className="text-muted-2 hover:text-red">
                  <X className="w-3.5 h-3.5" />
                  {t("notifications.example.ignore")}
                </Button>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ─── Notification History ────────────────────────────────────── */}
        <section id="notifications-history" data-scroll-section={t("scroll.notifications.history")}>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {t("notifications.history")}
          </h2>

          <div className="rounded-xl bg-surface border border-border overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider text-left font-medium">
                        Channel
                      </th>
                      <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider text-left font-medium">
                        {t("notifications.trigger")}
                      </th>
                      <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider text-left font-medium">
                        Title
                      </th>
                      <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider text-left font-medium">
                        Time
                      </th>
                      <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider text-left font-medium">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry, i) => {
                      const ChannelIcon = CHANNEL_ICONS[entry.channel];
                      return (
                        <motion.tr
                          key={entry.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03, duration: 0.15 }}
                          className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <ChannelIcon className="w-3.5 h-3.5 text-muted" />
                              <span className="text-sm text-muted-2">
                                {t(`notifications.channel.${entry.channel}`)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <TriggerIcon trigger={entry.trigger} />
                              <span className="text-sm text-muted-2">
                                {t(`notifications.trigger.${entry.trigger}`)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground font-medium max-w-xs truncate">
                            {entry.title}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-2 whitespace-nowrap">
                            {entry.sentAt}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={entry.status} t={t} />
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-border">
              {history.map((entry, i) => {
                const ChannelIcon = CHANNEL_ICONS[entry.channel];
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    className="p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <ChannelIcon className="w-3.5 h-3.5 text-muted shrink-0" />
                        <span className="text-xs text-muted-2">
                          {t(`notifications.channel.${entry.channel}`)}
                        </span>
                      </div>
                      <StatusBadge status={entry.status} t={t} />
                    </div>
                    <p className="text-sm text-foreground font-medium truncate">
                      {entry.title}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <TriggerIcon trigger={entry.trigger} />
                        <span className="text-xs text-muted-2">
                          {t(`notifications.trigger.${entry.trigger}`)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-2">{entry.sentAt}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      </Container>

      {/* ─── Create / Edit Rule Dialog ────────────────────────────────── */}
      <AnimatePresence>
        {showCreateDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateDialog(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent-muted flex items-center justify-center">
                    <Bell className="w-4 h-4 text-accent" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {editingRuleId ? t("notifications.edit") : t("notifications.createRule")}
                  </h2>
                </div>
                <button
                  onClick={() => setShowCreateDialog(false)}
                  className="p-1.5 rounded-md hover:bg-surface-2 transition-colors text-muted hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Rule Name */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    {t("notifications.ruleName")}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder={t("notifications.ruleNamePlaceholder")}
                    className="w-full px-3 py-2.5 text-sm rounded-lg bg-surface-2 border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
                    autoFocus
                  />
                </div>

                {/* Channel Selector */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2.5 block">
                    {t("notifications.selectChannel")}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {CHANNELS.map((channel) => {
                      const Icon = CHANNEL_ICONS[channel];
                      const selected = formData.channel === channel;
                      return (
                        <button
                          key={channel}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              channel,
                              config: {},
                            }))
                          }
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border transition-all ${
                            selected
                              ? "bg-accent-muted border-accent/30 text-accent"
                              : "bg-surface-2 border-border text-muted-2 hover:text-foreground hover:border-border-light"
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">
                            {t(`notifications.channel.${channel}`)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Triggers Checkboxes */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2.5 block">
                    {t("notifications.selectTriggers")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_TRIGGERS.map((trigger) => {
                      const checked = formData.triggers.includes(trigger);
                      return (
                        <button
                          key={trigger}
                          type="button"
                          onClick={() => toggleTrigger(trigger)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm border transition-all text-left ${
                            checked
                              ? "bg-accent-muted border-accent/30 text-accent"
                              : "bg-surface-2 border-border text-muted-2 hover:text-foreground hover:border-border-light"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              checked
                                ? "bg-accent border-accent"
                                : "border-border-light"
                            }`}
                          >
                            {checked && (
                              <CheckCircle2 className="w-3 h-3 text-background" />
                            )}
                          </span>
                          <TriggerIcon trigger={trigger} />
                          <span className="truncate">
                            {t(`notifications.trigger.${trigger}`)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Channel Config */}
                {formData.channel && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2.5 block">
                      {t("notifications.channel")} — {t(`notifications.channel.${formData.channel}`)}
                    </label>
                    <ChannelConfigFields
                      channel={formData.channel}
                      config={formData.config}
                      onChange={updateConfig}
                      t={t}
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-2/50 shrink-0">
                <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
                  {t("notifications.cancel")}
                </Button>
                <Button onClick={handleSaveRule} disabled={!isFormValid}>
                  {editingRuleId ? (
                    <>
                      <Pencil className="w-4 h-4" />
                      {t("notifications.edit")}
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      {t("notifications.createRule")}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Delete Confirmation Dialog ────────────────────────────────── */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteConfirmId(null)}
          >
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-red-muted flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6 text-red" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {t("notifications.delete")}
                </h3>
                <p className="text-sm text-muted-2">
                  {t("notifications.confirmDelete")}
                </p>
              </div>
              <div className="flex items-center gap-3 px-6 py-4 border-t border-border bg-surface-2/50">
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => setDeleteConfirmId(null)}
                >
                  {t("notifications.cancel")}
                </Button>
                <Button
                  className="flex-1 bg-red text-white hover:bg-red/90 border-0"
                  onClick={() => handleDeleteRule(deleteConfirmId)}
                >
                  <Trash2 className="w-4 h-4" />
                  {t("notifications.delete")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div id="notifications-faq" className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4" data-scroll-section={t("scroll.notifications.faq")}>
        <SectionFAQ section="notifications" />
        <SmartNextStep {...RECOMMENDATION_CHAINS["notifications"]} />
      </div>
    </div>
  );
}
