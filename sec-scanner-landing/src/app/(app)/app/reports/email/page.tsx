"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Download,
  Link2,
  Send,
  Hash,
  MessageCircle,
  Webhook,
  X,
  FileText,
  FileJson,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Share2,
  ChevronDown,
} from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { useToast } from "@/components/ui/Toast";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";

// ─── Types ──────────────────────────────────────────────────────────────

type Channel = "email" | "slack" | "telegram" | "teams" | "webhook";
type TemplateType = "executive" | "technical" | "summary" | "critical";
type SendStatus = "sent" | "failed" | "pending";
type AttachmentFormat = "pdf" | "html" | "json";

interface SendHistoryEntry {
  id: string;
  channel: Channel;
  recipients: string[];
  subject: string;
  attachments: AttachmentFormat[];
  sentAt: string;
  status: SendStatus;
}

// ─── Mock data ──────────────────────────────────────────────────────────

const mockHistory: SendHistoryEntry[] = [
  {
    id: "SH-001",
    channel: "email",
    recipients: ["ciso@company.com", "security@company.com"],
    subject: "Weekly Security Report — Critical Findings",
    attachments: ["pdf", "html"],
    sentAt: "2025-03-03T14:30:00Z",
    status: "sent",
  },
  {
    id: "SH-002",
    channel: "slack",
    recipients: ["#security-alerts"],
    subject: "Critical Vulnerability Detected",
    attachments: ["pdf"],
    sentAt: "2025-03-03T10:15:00Z",
    status: "sent",
  },
  {
    id: "SH-003",
    channel: "email",
    recipients: ["dev-team@company.com"],
    subject: "Technical Scan Report — Feb 2025",
    attachments: ["pdf", "json"],
    sentAt: "2025-03-02T09:00:00Z",
    status: "failed",
  },
  {
    id: "SH-004",
    channel: "telegram",
    recipients: ["@sec_ops_channel"],
    subject: "Executive Summary — Q1 Security Review",
    attachments: ["pdf"],
    sentAt: "2025-03-01T16:45:00Z",
    status: "sent",
  },
  {
    id: "SH-005",
    channel: "webhook",
    recipients: ["https://hooks.example.com/notify"],
    subject: "Scan Completed — Automated Report",
    attachments: ["json"],
    sentAt: "2025-02-28T22:10:00Z",
    status: "pending",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────

function channelIcon(channel: Channel) {
  const map: Record<Channel, React.ElementType> = {
    email: Mail,
    slack: Hash,
    telegram: MessageCircle,
    teams: Share2,
    webhook: Webhook,
  };
  return map[channel];
}

function statusVariant(status: SendStatus): "low" | "critical" | "high" {
  const map: Record<SendStatus, "low" | "critical" | "high"> = {
    sent: "low",
    failed: "critical",
    pending: "high",
  };
  return map[status];
}

function statusIcon(status: SendStatus) {
  const map: Record<SendStatus, React.ElementType> = {
    sent: CheckCircle2,
    failed: AlertCircle,
    pending: Clock,
  };
  return map[status];
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale === "en" ? "en-US" : "ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Animation variants ────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.04 } },
};

// ─── Component ──────────────────────────────────────────────────────────

export default function EmailReportsPage() {
  const { t, locale } = useI18n();
  const { addToast } = useToast();

  // Email form state
  const [recipients, setRecipients] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [subject, setSubject] = useState("");
  const [template, setTemplate] = useState<TemplateType>("executive");
  const [attachments, setAttachments] = useState<AttachmentFormat[]>(["pdf"]);
  const [sending, setSending] = useState(false);

  // Share dialog state
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareChannel, setShareChannel] = useState<Channel>("email");
  const [shareRecipients, setShareRecipients] = useState<string[]>([]);
  const [shareInput, setShareInput] = useState("");
  const [shareSubject, setShareSubject] = useState("");
  const [shareTemplate, setShareTemplate] = useState<TemplateType>("executive");
  const [shareAttachments, setShareAttachments] = useState<AttachmentFormat[]>(["pdf"]);
  const [shareWebhookUrl, setShareWebhookUrl] = useState("");
  const [shareChannelName, setShareChannelName] = useState("");
  const [shareChatId, setShareChatId] = useState("");
  const [shareSending, setShareSending] = useState(false);

  // History
  const [history, setHistory] = useState<SendHistoryEntry[]>(mockHistory);

  const emailInputRef = useRef<HTMLInputElement>(null);
  const shareInputRef = useRef<HTMLInputElement>(null);

  // ── Recipient chip handlers ──────────────────────────────────────────

  const addRecipient = useCallback(
    (value: string, list: string[], setList: (v: string[]) => void, isEmail: boolean) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      if (isEmail && !isValidEmail(trimmed)) {
        addToast({
          type: "error",
          title: locale === "en" ? "Invalid email" : "Некорректный email",
          description:
            locale === "en"
              ? "Please enter a valid email address"
              : "Введите корректный email адрес",
        });
        return;
      }
      if (list.includes(trimmed)) return;
      setList([...list, trimmed]);
    },
    [addToast, locale]
  );

  const removeRecipient = useCallback(
    (index: number, list: string[], setList: (v: string[]) => void) => {
      setList(list.filter((_, i) => i !== index));
    },
    []
  );

  const handleEmailKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addRecipient(emailInput, recipients, setRecipients, true);
        setEmailInput("");
      }
      if (e.key === "Backspace" && !emailInput && recipients.length > 0) {
        setRecipients((prev) => prev.slice(0, -1));
      }
    },
    [emailInput, recipients, addRecipient]
  );

  const handleShareKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const isEmail = shareChannel === "email";
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addRecipient(shareInput, shareRecipients, setShareRecipients, isEmail);
        setShareInput("");
      }
      if (e.key === "Backspace" && !shareInput && shareRecipients.length > 0) {
        setShareRecipients((prev) => prev.slice(0, -1));
      }
    },
    [shareInput, shareRecipients, shareChannel, addRecipient]
  );

  // ── Attachment toggle ────────────────────────────────────────────────

  const toggleAttachment = useCallback(
    (format: AttachmentFormat, current: AttachmentFormat[], setter: (v: AttachmentFormat[]) => void) => {
      if (current.includes(format)) {
        setter(current.filter((f) => f !== format));
      } else {
        setter([...current, format]);
      }
    },
    []
  );

  // ── Send handlers ────────────────────────────────────────────────────

  const handleSendEmail = useCallback(() => {
    if (recipients.length === 0) {
      addToast({
        type: "error",
        title: locale === "en" ? "No recipients" : "Нет получателей",
        description:
          locale === "en"
            ? "Add at least one recipient"
            : "Добавьте хотя бы одного получателя",
      });
      return;
    }
    setSending(true);
    setTimeout(() => {
      const entry: SendHistoryEntry = {
        id: `SH-${String(history.length + 1).padStart(3, "0")}`,
        channel: "email",
        recipients,
        subject: subject || t("emailReports.template." + template),
        attachments,
        sentAt: new Date().toISOString(),
        status: "sent",
      };
      setHistory((prev) => [entry, ...prev]);
      setRecipients([]);
      setSubject("");
      setAttachments(["pdf"]);
      setSending(false);
      addToast({
        type: "success",
        title: t("emailReports.sendSuccess"),
        description: t("emailReports.sendSuccessDesc"),
      });
    }, 1200);
  }, [recipients, subject, template, attachments, history, addToast, t, locale]);

  const handleShareSend = useCallback(() => {
    if (shareChannel === "email" && shareRecipients.length === 0) {
      addToast({
        type: "error",
        title: locale === "en" ? "No recipients" : "Нет получателей",
        description:
          locale === "en"
            ? "Add at least one recipient"
            : "Добавьте хотя бы одного получателя",
      });
      return;
    }
    if (shareChannel === "webhook" && !shareWebhookUrl.trim()) {
      addToast({
        type: "error",
        title: locale === "en" ? "No webhook URL" : "Нет URL вебхука",
        description:
          locale === "en"
            ? "Enter a webhook URL"
            : "Введите URL вебхука",
      });
      return;
    }
    if (
      (shareChannel === "slack" || shareChannel === "teams") &&
      !shareChannelName.trim()
    ) {
      addToast({
        type: "error",
        title: locale === "en" ? "No channel name" : "Нет названия канала",
        description:
          locale === "en"
            ? "Enter a channel name"
            : "Введите название канала",
      });
      return;
    }
    if (shareChannel === "telegram" && !shareChatId.trim()) {
      addToast({
        type: "error",
        title: locale === "en" ? "No chat ID" : "Нет Chat ID",
        description:
          locale === "en" ? "Enter a chat ID" : "Введите Chat ID",
      });
      return;
    }

    setShareSending(true);
    setTimeout(() => {
      const entry: SendHistoryEntry = {
        id: `SH-${String(history.length + 1).padStart(3, "0")}`,
        channel: shareChannel,
        recipients:
          shareChannel === "email"
            ? shareRecipients
            : shareChannel === "webhook"
            ? [shareWebhookUrl]
            : shareChannel === "telegram"
            ? [shareChatId]
            : [shareChannelName],
        subject:
          shareSubject || t("emailReports.template." + shareTemplate),
        attachments: shareAttachments,
        sentAt: new Date().toISOString(),
        status: "sent",
      };
      setHistory((prev) => [entry, ...prev]);
      setShareSending(false);
      setShowShareDialog(false);
      // Reset share form
      setShareRecipients([]);
      setShareInput("");
      setShareSubject("");
      setShareAttachments(["pdf"]);
      setShareWebhookUrl("");
      setShareChannelName("");
      setShareChatId("");
      addToast({
        type: "success",
        title: t("emailReports.sendSuccess"),
        description: t("emailReports.sendSuccessDesc"),
      });
    }, 1200);
  }, [
    shareChannel,
    shareRecipients,
    shareSubject,
    shareTemplate,
    shareAttachments,
    shareWebhookUrl,
    shareChannelName,
    shareChatId,
    history,
    addToast,
    t,
    locale,
  ]);

  // ── Quick action handlers ────────────────────────────────────────────

  const handleQuickAction = useCallback(
    (channel: Channel) => {
      setShareChannel(channel);
      setShareRecipients([]);
      setShareInput("");
      setShareSubject("");
      setShareTemplate("executive");
      setShareAttachments(["pdf"]);
      setShareWebhookUrl("");
      setShareChannelName("");
      setShareChatId("");
      setShowShareDialog(true);
    },
    []
  );

  // ── Quick action buttons config ──────────────────────────────────────

  const quickActions: {
    channel: Channel;
    icon: React.ElementType;
    labelKey: string;
    accentClass: string;
  }[] = [
    {
      channel: "email",
      icon: Mail,
      labelKey: "emailReports.shareEmail",
      accentClass: "text-cyan hover:bg-cyan/10 border-cyan/20 hover:border-cyan/40",
    },
    {
      channel: "slack",
      icon: Hash,
      labelKey: "emailReports.shareSlack",
      accentClass: "text-purple hover:bg-purple/10 border-purple/20 hover:border-purple/40",
    },
    {
      channel: "telegram",
      icon: MessageCircle,
      labelKey: "emailReports.shareTelegram",
      accentClass: "text-cyan hover:bg-cyan/10 border-cyan/20 hover:border-cyan/40",
    },
    {
      channel: "teams",
      icon: Share2,
      labelKey: "emailReports.shareTeams",
      accentClass: "text-purple hover:bg-purple/10 border-purple/20 hover:border-purple/40",
    },
    {
      channel: "webhook",
      icon: Webhook,
      labelKey: "emailReports.shareWebhook",
      accentClass: "text-accent hover:bg-accent/10 border-accent/20 hover:border-accent/40",
    },
  ];

  // ── Channel tabs for share dialog ────────────────────────────────────

  const channelTabs: { id: Channel; icon: React.ElementType; label: string }[] = [
    { id: "email", icon: Mail, label: t("emailReports.channel.email") },
    { id: "slack", icon: Hash, label: t("emailReports.channel.slack") },
    { id: "telegram", icon: MessageCircle, label: t("emailReports.channel.telegram") },
    { id: "teams", icon: Share2, label: t("emailReports.channel.teams") },
    { id: "webhook", icon: Webhook, label: t("emailReports.channel.webhook") },
  ];

  // ── Template options ─────────────────────────────────────────────────

  const templateOptions: { value: TemplateType; label: string }[] = [
    { value: "executive", label: t("emailReports.template.executive") },
    { value: "technical", label: t("emailReports.template.technical") },
    { value: "summary", label: t("emailReports.template.summary") },
    { value: "critical", label: t("emailReports.template.critical") },
  ];

  // ── Attachment options ───────────────────────────────────────────────

  const attachmentOptions: {
    value: AttachmentFormat;
    icon: React.ElementType;
    label: string;
  }[] = [
    { value: "pdf", icon: FileText, label: "PDF" },
    { value: "html", icon: FileCode, label: "HTML" },
    { value: "json", icon: FileJson, label: "JSON" },
  ];

  // ── Render: Recipient chips ──────────────────────────────────────────

  const renderChips = (
    list: string[],
    setList: (v: string[]) => void,
    input: string,
    setInput: (v: string) => void,
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void,
    placeholder: string,
    inputRef: React.RefObject<HTMLInputElement | null>
  ) => (
    <div
      className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-xl bg-surface-2 border border-border focus-within:border-accent/40 transition-colors min-h-[44px]"
      onClick={() => inputRef.current?.focus()}
    >
      {list.map((email, i) => (
        <motion.span
          key={`${email}-${i}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-accent/10 border border-accent/20 text-sm text-accent"
        >
          <span className="max-w-[200px] truncate">{email}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeRecipient(i, list, setList);
            }}
            className="p-0.5 rounded hover:bg-accent/20 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </motion.span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={list.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[140px] bg-transparent text-sm text-foreground placeholder:text-muted-2 outline-none"
      />
    </div>
  );

  // ── Render: Attachment checkboxes ────────────────────────────────────

  const renderAttachments = (
    current: AttachmentFormat[],
    setter: (v: AttachmentFormat[]) => void
  ) => (
    <div className="flex items-center gap-3">
      {attachmentOptions.map((opt) => {
        const isActive = current.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggleAttachment(opt.value, current, setter)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
              isActive
                ? "bg-accent/10 border-accent/30 text-accent"
                : "bg-surface-2 border-border text-muted-2 hover:border-border-light"
            }`}
          >
            <opt.icon className="w-4 h-4" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );

  // ── Render: Share dialog dynamic form ────────────────────────────────

  const renderShareForm = () => {
    switch (shareChannel) {
      case "email":
        return (
          <div className="space-y-4">
            {/* Recipients */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("emailReports.recipients")}
              </label>
              {renderChips(
                shareRecipients,
                setShareRecipients,
                shareInput,
                setShareInput,
                handleShareKeyDown,
                t("emailReports.enterEmail"),
                shareInputRef
              )}
            </div>
            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("emailReports.subject")}
              </label>
              <input
                type="text"
                value={shareSubject}
                onChange={(e) => setShareSubject(e.target.value)}
                placeholder={t("emailReports.subjectPlaceholder")}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-2 outline-none focus:border-accent/40 transition-colors"
              />
            </div>
            {/* Template */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("emailReports.template")}
              </label>
              <div className="relative">
                <select
                  value={shareTemplate}
                  onChange={(e) => setShareTemplate(e.target.value as TemplateType)}
                  className="w-full appearance-none px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-foreground outline-none focus:border-accent/40 transition-colors pr-10"
                >
                  {templateOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-2 pointer-events-none" />
              </div>
            </div>
            {/* Attachments */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("emailReports.attachments")}
              </label>
              {renderAttachments(shareAttachments, setShareAttachments)}
            </div>
          </div>
        );

      case "slack":
      case "teams":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("emailReports.channelName")}
              </label>
              <input
                type="text"
                value={shareChannelName}
                onChange={(e) => setShareChannelName(e.target.value)}
                placeholder={t("emailReports.channelPlaceholder")}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-2 outline-none focus:border-accent/40 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("emailReports.template")}
              </label>
              <div className="relative">
                <select
                  value={shareTemplate}
                  onChange={(e) => setShareTemplate(e.target.value as TemplateType)}
                  className="w-full appearance-none px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-foreground outline-none focus:border-accent/40 transition-colors pr-10"
                >
                  {templateOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-2 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("emailReports.attachments")}
              </label>
              {renderAttachments(shareAttachments, setShareAttachments)}
            </div>
          </div>
        );

      case "telegram":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("emailReports.chatId")}
              </label>
              <input
                type="text"
                value={shareChatId}
                onChange={(e) => setShareChatId(e.target.value)}
                placeholder={t("emailReports.chatIdPlaceholder")}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-2 outline-none focus:border-accent/40 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("emailReports.template")}
              </label>
              <div className="relative">
                <select
                  value={shareTemplate}
                  onChange={(e) => setShareTemplate(e.target.value as TemplateType)}
                  className="w-full appearance-none px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-foreground outline-none focus:border-accent/40 transition-colors pr-10"
                >
                  {templateOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-2 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("emailReports.attachments")}
              </label>
              {renderAttachments(shareAttachments, setShareAttachments)}
            </div>
          </div>
        );

      case "webhook":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("emailReports.webhookUrl")}
              </label>
              <input
                type="text"
                value={shareWebhookUrl}
                onChange={(e) => setShareWebhookUrl(e.target.value)}
                placeholder={t("emailReports.webhookPlaceholder")}
                className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-2 outline-none focus:border-accent/40 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("emailReports.template")}
              </label>
              <div className="relative">
                <select
                  value={shareTemplate}
                  onChange={(e) => setShareTemplate(e.target.value as TemplateType)}
                  className="w-full appearance-none px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-foreground outline-none focus:border-accent/40 transition-colors pr-10"
                >
                  {templateOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-2 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t("emailReports.attachments")}
              </label>
              {renderAttachments(shareAttachments, setShareAttachments)}
            </div>
          </div>
        );
    }
  };

  // ── Render: Preview panel ────────────────────────────────────────────

  const renderPreview = () => {
    const templateLabel = t("emailReports.template." + shareTemplate);
    const channelLabel = t("emailReports.channel." + shareChannel);
    const attachLabels = shareAttachments.map((a) => a.toUpperCase()).join(", ") || "—";

    return (
      <div className="p-4 rounded-xl bg-surface-2 border border-border">
        <h4 className="text-xs font-medium text-muted-2 uppercase tracking-wider mb-3">
          {t("emailReports.preview")}
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-2">{t("emailReports.channel")}</span>
            <span className="text-foreground font-medium">{channelLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-2">{t("emailReports.template")}</span>
            <span className="text-foreground font-medium">{templateLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-2">{t("emailReports.attachments")}</span>
            <span className="text-foreground font-medium">{attachLabels}</span>
          </div>
          {(shareRecipients.length > 0 || shareChannelName || shareChatId || shareWebhookUrl) && (
            <div className="flex items-center justify-between">
              <span className="text-muted-2">{t("emailReports.recipients")}</span>
              <span className="text-foreground font-medium max-w-[200px] truncate">
                {shareChannel === "email"
                  ? shareRecipients.join(", ")
                  : shareChannel === "webhook"
                  ? shareWebhookUrl
                  : shareChannel === "telegram"
                  ? shareChatId
                  : shareChannelName}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title={t("emailReports.title")}
        description={t("emailReports.subtitle")}
      />

      <Container as="main" className="py-8 animate-page-in">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-8"
        >
          {/* ── Section 1: Share after Scan ──────────────────────────── */}
          <motion.section variants={fadeIn}>
            <div className="p-6 rounded-xl bg-surface border border-border">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {t("emailReports.shareAfterScan")}
                  </h2>
                  <p className="text-sm text-muted-2">
                    {t("emailReports.shareAfterScan.desc")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-5">
                {/* Download */}
                <button
                  onClick={() =>
                    addToast({
                      type: "info",
                      title: t("emailReports.downloadReport"),
                    })
                  }
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-2 border border-border hover:border-accent/30 hover:bg-accent/5 transition-all group"
                >
                  <Download className="w-5 h-5 text-accent group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-muted group-hover:text-foreground transition-colors">
                    {t("emailReports.downloadReport")}
                  </span>
                </button>

                {/* Share Link */}
                <button
                  onClick={() =>
                    addToast({
                      type: "info",
                      title: t("emailReports.shareLink"),
                    })
                  }
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-2 border border-border hover:border-cyan/30 hover:bg-cyan/5 transition-all group"
                >
                  <Link2 className="w-5 h-5 text-cyan group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-muted group-hover:text-foreground transition-colors">
                    {t("emailReports.shareLink")}
                  </span>
                </button>

                {/* Channel quick actions */}
                {quickActions.map((action) => (
                  <button
                    key={action.channel}
                    onClick={() => handleQuickAction(action.channel)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-2 border border-border transition-all group ${action.accentClass}`}
                  >
                    <action.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-medium text-muted group-hover:text-foreground transition-colors">
                      {t(action.labelKey)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.section>

          {/* ── Section 2: Email Report Form ─────────────────────────── */}
          <motion.section variants={fadeIn}>
            <div className="p-6 rounded-xl bg-surface border border-border">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-lg bg-cyan-muted flex items-center justify-center">
                  <Mail className="w-5 h-5 text-cyan" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">
                  {t("emailReports.channel.email")}
                </h2>
              </div>

              <div className="space-y-5">
                {/* Recipients */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {t("emailReports.recipients")}
                  </label>
                  {renderChips(
                    recipients,
                    setRecipients,
                    emailInput,
                    setEmailInput,
                    handleEmailKeyDown,
                    t("emailReports.enterEmail"),
                    emailInputRef
                  )}
                </div>

                {/* Subject + Template row */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      {t("emailReports.subject")}
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder={t("emailReports.subjectPlaceholder")}
                      className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted-2 outline-none focus:border-accent/40 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      {t("emailReports.template")}
                    </label>
                    <div className="relative">
                      <select
                        value={template}
                        onChange={(e) => setTemplate(e.target.value as TemplateType)}
                        className="w-full appearance-none px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-sm text-foreground outline-none focus:border-accent/40 transition-colors pr-10"
                      >
                        {templateOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Attachments */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    {t("emailReports.attachments")}
                  </label>
                  {renderAttachments(attachments, setAttachments)}
                </div>

                {/* Send button */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    onClick={handleSendEmail}
                    disabled={sending || recipients.length === 0}
                    size="lg"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    {t("emailReports.sendButton")}
                  </Button>
                  {recipients.length === 0 && (
                    <span className="text-xs text-muted-2">
                      {t("emailReports.addRecipient")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.section>

          {/* ── Section 3: Send History ──────────────────────────────── */}
          <motion.section variants={fadeIn}>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                {t("emailReports.history")}
              </h2>
              <Badge variant="category">{history.length}</Badge>
            </div>

            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
                  <Send className="w-8 h-8 text-muted-2" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {t("emailReports.noHistory")}
                </h3>
                <p className="text-sm text-muted-2 max-w-md">
                  {t("emailReports.shareAfterScan.desc")}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
                {history.map((entry, i) => {
                  const ChannelIcon = channelIcon(entry.channel);
                  const StatusIcon = statusIcon(entry.status);
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-border hover:border-border-light transition-colors group"
                    >
                      {/* Channel icon */}
                      <div className="w-10 h-10 rounded-lg bg-surface-2 flex items-center justify-center shrink-0">
                        <ChannelIcon className="w-5 h-5 text-muted" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-foreground truncate">
                            {entry.subject}
                          </h4>
                          <Badge variant="category">
                            {t("emailReports.channel." + entry.channel)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-2 flex-wrap">
                          <span className="max-w-[250px] truncate">
                            {entry.recipients.join(", ")}
                          </span>
                          {entry.attachments.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-surface-2 border border-border text-muted-2">
                              {entry.attachments.map((a) => a.toUpperCase()).join("+")}
                            </span>
                          )}
                          <span>{formatDate(entry.sentAt, locale)}</span>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="shrink-0 hidden sm:flex items-center gap-1.5">
                        <StatusIcon
                          className={`w-4 h-4 ${
                            entry.status === "sent"
                              ? "text-accent"
                              : entry.status === "failed"
                              ? "text-red"
                              : "text-amber"
                          }`}
                        />
                        <Badge variant={statusVariant(entry.status)}>
                          {entry.status === "sent"
                            ? t("emailReports.sent")
                            : entry.status === "failed"
                            ? t("emailReports.failed")
                            : t("emailReports.pending")}
                        </Badge>
                      </div>

                      {/* Mobile status */}
                      <div className="shrink-0 sm:hidden">
                        <Badge variant={statusVariant(entry.status)}>
                          {entry.status === "sent"
                            ? t("emailReports.sent")
                            : entry.status === "failed"
                            ? t("emailReports.failed")
                            : t("emailReports.pending")}
                        </Badge>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.section>
        </motion.div>
      </Container>

      {/* ── Share Dialog ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showShareDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowShareDialog(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Dialog header */}
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-accent" />
                  <h2 className="text-lg font-semibold text-foreground">
                    {t("emailReports.shareVia")}
                  </h2>
                </div>
                <button
                  onClick={() => setShowShareDialog(false)}
                  className="p-1.5 rounded-lg text-muted-2 hover:text-foreground hover:bg-surface-2 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Channel tabs */}
              <div className="flex border-b border-border overflow-x-auto">
                {channelTabs.map((tab) => {
                  const isActive = shareChannel === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setShareChannel(tab.id)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                        isActive
                          ? "border-accent text-accent"
                          : "border-transparent text-muted-2 hover:text-foreground"
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Dialog body */}
              <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {renderShareForm()}
                {renderPreview()}
              </div>

              {/* Dialog footer */}
              <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
                <Button
                  variant="secondary"
                  onClick={() => setShowShareDialog(false)}
                >
                  {t("emailReports.close")}
                </Button>
                <Button
                  onClick={handleShareSend}
                  disabled={shareSending}
                >
                  {shareSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {t("emailReports.sendButton")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
