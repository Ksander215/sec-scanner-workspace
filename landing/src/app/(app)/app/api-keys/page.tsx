"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n-context";
import { useToast } from "@/components/ui/Toast";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

import {
  Key,
  Plus,
  Copy,
  RefreshCw,
  Trash2,
  Power,
  PowerOff,
  X,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react";
import { ContextualHelp } from "@/components/ui/ContextualHelp";
import { SectionFAQ } from "@/components/ui/SectionFAQ";
import { SmartNextStep, RECOMMENDATION_CHAINS } from "@/components/ui/SmartNextStep";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { BusinessResult } from "@/components/ui/BusinessResult";

// ─── Types ──────────────────────────────────────────────────────────────────

type ApiKeyStatus = "active" | "disabled" | "expired" | "rotated";
type ApiKeyScope = "rest" | "graphql" | "webhook" | "cli" | "sdk" | "admin" | "read" | "write";

interface ApiKey {
  id: string;
  name: string;
  fullKey: string;
  maskedKey: string;
  scopes: ApiKeyScope[];
  status: ApiKeyStatus;
  createdAt: string;
  expiresAt: string | null; // null = never
  lastUsedAt: string;
}

interface NewKeyFormData {
  name: string;
  scopes: ApiKeyScope[];
  expiration: "never" | "30d" | "90d" | "1y";
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const seg = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `sip_live_${seg(8)}_${seg(12)}_${seg(4)}`;
}

function maskKey(key: string): string {
  // sip_live_abcdefgh_ijklmnopqrst_uvwx → sip_live_****...****uvwx
  const suffix = key.slice(-4);
  return `sip_live_****...****${suffix}`;
}

function calcExpiry(option: string): string | null {
  if (option === "never") return null;
  const d = new Date();
  if (option === "30d") d.setDate(d.getDate() + 30);
  else if (option === "90d") d.setDate(d.getDate() + 90);
  else if (option === "1y") d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
}

const ALL_SCOPES: ApiKeyScope[] = ["rest", "graphql", "webhook", "cli", "sdk", "admin", "read", "write"];

const EXPIRATION_OPTIONS = [
  { value: "never", key: "apiKeys.expiration.never" },
  { value: "30d", key: "apiKeys.expiration.30days" },
  { value: "90d", key: "apiKeys.expiration.90days" },
  { value: "1y", key: "apiKeys.expiration.1year" },
] as const;

// ─── Mock Data ──────────────────────────────────────────────────────────────

const INITIAL_KEYS: ApiKey[] = [];

// ─── Status Badge ───────────────────────────────────────────────────────────

function StatusBadge({ status, t }: { status: ApiKeyStatus; t: (k: string) => string }) {
  const config: Record<ApiKeyStatus, { variant: "low" | "default" | "medium" | "info"; className: string }> = {
    active: { variant: "low", className: "bg-accent-muted text-accent border-accent/20" },
    disabled: { variant: "default", className: "bg-surface-2 text-muted border-border" },
    expired: { variant: "medium", className: "bg-amber-muted text-amber border-amber/20" },
    rotated: { variant: "info", className: "bg-cyan-muted text-cyan border-cyan/20" },
  };

  const { className } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-md border transition-colors ${className}`}>
      {status === "active" && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
      {t(`apiKeys.status.${status}`)}
    </span>
  );
}

// ─── Scope Badge ────────────────────────────────────────────────────────────

function ScopeBadge({ scope, t }: { scope: ApiKeyScope; t: (k: string) => string }) {
  const scopeColorMap: Record<ApiKeyScope, string> = {
    rest: "bg-accent-muted text-accent border-accent/20",
    graphql: "bg-purple-muted text-purple border-purple/20",
    webhook: "bg-cyan-muted text-cyan border-cyan/20",
    cli: "bg-amber-muted text-amber border-amber/20",
    sdk: "bg-cyan-muted text-cyan border-cyan/20",
    admin: "bg-red-muted text-red border-red/20",
    read: "bg-surface-2 text-muted-2 border-border",
    write: "bg-surface-2 text-foreground border-border",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border ${scopeColorMap[scope]}`}>
      {t(`apiKeys.scope.${scope}`)}
    </span>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function ApiKeysPage() {
  const { t } = useI18n();
  const { addToast } = useToast();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // ─── State ──────────────────────────────────────────────────────────────
  const [keys, setKeys] = useState<ApiKey[]>(INITIAL_KEYS);
  const [hasUserCreatedKey, setHasUserCreatedKey] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyReveal, setNewKeyReveal] = useState<{ id: string; fullKey: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState<NewKeyFormData>({
    name: "",
    scopes: ["rest", "read"],
    expiration: "never",
  });
  const [showFullKey, setShowFullKey] = useState<string | null>(null);

  // ─── Handlers ───────────────────────────────────────────────────────────
  const handleCopy = useCallback(
    (text: string) => {
      navigator.clipboard?.writeText(text);
      addToast({ type: "success", title: t("apiKeys.copied") });
    },
    [addToast, t]
  );

  const handleCreateKey = useCallback(() => {
    if (!formData.name.trim()) return;

    const fullKey = generateKey();
    const newKey: ApiKey = {
      id: `key-${Date.now()}`,
      name: formData.name.trim(),
      fullKey,
      maskedKey: maskKey(fullKey),
      scopes: formData.scopes,
      status: "active",
      createdAt: new Date().toISOString().split("T")[0],
      expiresAt: calcExpiry(formData.expiration),
      lastUsedAt: "—",
    };

    setKeys((prev) => [newKey, ...prev]);
    setHasUserCreatedKey(true);
    setNewKeyReveal({ id: newKey.id, fullKey });
    setShowCreateDialog(false);
    setFormData({ name: "", scopes: ["rest", "read"], expiration: "never" });
    addToast({ type: "success", title: t("apiKeys.newKey"), description: t("apiKeys.newKeyDesc") });
  }, [formData, addToast, t]);

  const handleRotate = useCallback(
    (id: string) => {
      const fullKey = generateKey();
      setKeys((prev) =>
        prev.map((k) =>
          k.id === id
            ? { ...k, fullKey, maskedKey: maskKey(fullKey), status: "active" as ApiKeyStatus, lastUsedAt: "—" }
            : k
        )
      );
      setNewKeyReveal({ id, fullKey });
      addToast({ type: "success", title: t("apiKeys.keyRotated"), description: t("apiKeys.newKeyDesc") });
    },
    [addToast, t]
  );

  const handleToggleStatus = useCallback(
    (id: string) => {
      setKeys((prev) =>
        prev.map((k) => {
          if (k.id !== id) return k;
          const nextStatus: ApiKeyStatus = k.status === "active" ? "disabled" : "active";
          return { ...k, status: nextStatus };
        })
      );
      const key = keys.find((k) => k.id === id);
      if (key) {
        const toastTitle = key.status === "active" ? t("apiKeys.keyDisabled") : t("apiKeys.keyEnabled");
        addToast({ type: "info", title: toastTitle });
      }
    },
    [keys, addToast, t]
  );

  const handleDelete = useCallback(
    (id: string) => {
      setKeys((prev) => prev.filter((k) => k.id !== id));
      setDeleteConfirmId(null);
      addToast({ type: "success", title: t("apiKeys.keyDeleted") });
    },
    [addToast, t]
  );

  const toggleScope = useCallback((scope: ApiKeyScope) => {
    setFormData((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter((s) => s !== scope)
        : [...prev.scopes, scope],
    }));
  }, []);

  if (!mounted) return null;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="animate-page-in min-h-[calc(100vh-7rem)]">
      {/* ─── Page Header ──────────────────────────────────────────────── */}
      <div className="border-b border-border bg-surface/50">
        <Container className="py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center">
                <Key className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                  {t("apiKeys.title")}
                </h1>
                <p className="text-sm text-muted-2 mt-0.5">{t("apiKeys.subtitle")}</p>
                <div className="flex items-center gap-2 mt-2">
                  <ContextualHelp section="api-keys" />
                  <DemoBadge />
                </div>
                {hasUserCreatedKey && <BusinessResult type="configured" className="mt-4" />}
              </div>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4" />
              {t("apiKeys.create")}
            </Button>
          </div>
        </Container>
      </div>

      {/* ─── Main Content ─────────────────────────────────────────────── */}
      <Container className="py-6">
        <AnimatePresence mode="wait">
          {keys.length === 0 ? (
            /* ─── Empty State ─────────────────────────────────────────── */
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-6">
                <Key className="w-8 h-8 text-muted" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {t("apiKeys.noKeys")}
              </h2>
              <p className="text-muted-2 max-w-md mb-8">
                {t("apiKeys.noKeysDesc")}
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4" />
                {t("apiKeys.create")}
              </Button>
            </motion.div>
          ) : (
            /* ─── Keys Table ──────────────────────────────────────────── */
            <motion.div
              key="table"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              {/* Desktop Table */}
              <div className="hidden lg:block rounded-xl bg-surface border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider text-left font-medium">
                          {t("apiKeys.name")}
                        </th>
                        <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider text-left font-medium">
                          {t("apiKeys.key")}
                        </th>
                        <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider text-left font-medium">
                          {t("apiKeys.scopes")}
                        </th>
                        <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider text-left font-medium">
                          Status
                        </th>
                        <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider text-left font-medium">
                          {t("apiKeys.created")}
                        </th>
                        <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider text-left font-medium">
                          {t("apiKeys.expires")}
                        </th>
                        <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider text-left font-medium">
                          {t("apiKeys.lastUsed")}
                        </th>
                        <th className="px-4 py-3 text-xs text-muted uppercase tracking-wider text-right font-medium">
                          &nbsp;
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {keys.map((apiKey, i) => (
                        <motion.tr
                          key={apiKey.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04, duration: 0.2 }}
                          className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors group"
                        >
                          {/* Name */}
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <Key className="w-3.5 h-3.5 text-muted shrink-0" />
                              <span className="font-medium text-foreground">{apiKey.name}</span>
                            </div>
                          </td>
                          {/* Key */}
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-1.5">
                              <code className="text-xs font-mono text-muted-2 bg-surface-2 px-2 py-1 rounded">
                                {showFullKey === apiKey.id ? apiKey.fullKey : apiKey.maskedKey}
                              </code>
                              <button
                                onClick={() => setShowFullKey(showFullKey === apiKey.id ? null : apiKey.id)}
                                className="p-1 rounded hover:bg-surface-2 transition-colors text-muted hover:text-foreground"
                                title={showFullKey === apiKey.id ? "Hide" : "Reveal"}
                              >
                                {showFullKey === apiKey.id ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleCopy(showFullKey === apiKey.id ? apiKey.fullKey : apiKey.maskedKey)}
                                className="p-1 rounded hover:bg-surface-2 transition-colors text-muted hover:text-foreground"
                                title={t("apiKeys.copy")}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          {/* Scopes */}
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {apiKey.scopes.map((scope) => (
                                <ScopeBadge key={scope} scope={scope} t={t} />
                              ))}
                            </div>
                          </td>
                          {/* Status */}
                          <td className="px-4 py-3">
                            <StatusBadge status={apiKey.status} t={t} />
                          </td>
                          {/* Created */}
                          <td className="px-4 py-3 text-sm text-muted-2">{apiKey.createdAt}</td>
                          {/* Expires */}
                          <td className="px-4 py-3 text-sm text-muted-2">
                            {apiKey.expiresAt ?? t("apiKeys.never")}
                          </td>
                          {/* Last Used */}
                          <td className="px-4 py-3 text-sm text-muted-2">{apiKey.lastUsedAt}</td>
                          {/* Actions */}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleRotate(apiKey.id)}
                                className="p-1.5 rounded-md hover:bg-surface-2 transition-colors text-muted hover:text-cyan"
                                title={t("apiKeys.rotate")}
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(apiKey.id)}
                                className="p-1.5 rounded-md hover:bg-surface-2 transition-colors text-muted hover:text-amber"
                                title={apiKey.status === "active" ? t("apiKeys.disable") : t("apiKeys.enable")}
                              >
                                {apiKey.status === "active" ? (
                                  <PowerOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Power className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(apiKey.id)}
                                className="p-1.5 rounded-md hover:bg-surface-2 transition-colors text-muted hover:text-red"
                                title={t("apiKeys.delete")}
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
                {keys.map((apiKey, i) => (
                  <motion.div
                    key={apiKey.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.25 }}
                    className="p-4 rounded-xl bg-surface border border-border"
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Key className="w-4 h-4 text-accent shrink-0" />
                        <span className="font-medium text-foreground text-sm truncate">{apiKey.name}</span>
                      </div>
                      <StatusBadge status={apiKey.status} t={t} />
                    </div>

                    {/* Key */}
                    <div className="flex items-center gap-1.5 mb-3">
                      <code className="text-xs font-mono text-muted-2 bg-surface-2 px-2 py-1 rounded flex-1 min-w-0 truncate">
                        {showFullKey === apiKey.id ? apiKey.fullKey : apiKey.maskedKey}
                      </code>
                      <button
                        onClick={() => setShowFullKey(showFullKey === apiKey.id ? null : apiKey.id)}
                        className="p-1.5 rounded-md hover:bg-surface-2 transition-colors text-muted hover:text-foreground shrink-0"
                      >
                        {showFullKey === apiKey.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleCopy(showFullKey === apiKey.id ? apiKey.fullKey : apiKey.maskedKey)}
                        className="p-1.5 rounded-md hover:bg-surface-2 transition-colors text-muted hover:text-foreground shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Scopes */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {apiKey.scopes.map((scope) => (
                        <ScopeBadge key={scope} scope={scope} t={t} />
                      ))}
                    </div>

                    {/* Meta info */}
                    <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                      <div>
                        <span className="text-muted block">{t("apiKeys.created")}</span>
                        <span className="text-muted-2">{apiKey.createdAt}</span>
                      </div>
                      <div>
                        <span className="text-muted block">{t("apiKeys.expires")}</span>
                        <span className="text-muted-2">{apiKey.expiresAt ?? t("apiKeys.never")}</span>
                      </div>
                      <div>
                        <span className="text-muted block">{t("apiKeys.lastUsed")}</span>
                        <span className="text-muted-2">{apiKey.lastUsedAt}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <Button size="sm" variant="ghost" onClick={() => handleRotate(apiKey.id)}>
                        <RefreshCw className="w-3.5 h-3.5" />
                        {t("apiKeys.rotate")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(apiKey.id)}>
                        {apiKey.status === "active" ? (
                          <>
                            <PowerOff className="w-3.5 h-3.5" />
                            {t("apiKeys.disable")}
                          </>
                        ) : (
                          <>
                            <Power className="w-3.5 h-3.5" />
                            {t("apiKeys.enable")}
                          </>
                        )}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteConfirmId(apiKey.id)} className="ml-auto text-red hover:text-red">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Container>

      {/* ─── Create Key Dialog ────────────────────────────────────────── */}
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
              className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent-muted flex items-center justify-center">
                    <Key className="w-4 h-4 text-accent" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">{t("apiKeys.create")}</h2>
                </div>
                <button
                  onClick={() => setShowCreateDialog(false)}
                  className="p-1.5 rounded-md hover:bg-surface-2 transition-colors text-muted hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {/* Name */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    {t("apiKeys.name")}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder={t("apiKeys.namePlaceholder")}
                    className="w-full px-3 py-2.5 text-sm rounded-lg bg-surface-2 border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
                    autoFocus
                  />
                </div>

                {/* Scopes */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2.5 block">
                    {t("apiKeys.scopes")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_SCOPES.map((scope) => {
                      const checked = formData.scopes.includes(scope);
                      return (
                        <button
                          key={scope}
                          type="button"
                          onClick={() => toggleScope(scope)}
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
                            {checked && <CheckCircle2 className="w-3 h-3 text-background" />}
                          </span>
                          {t(`apiKeys.scope.${scope}`)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Expiration */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2.5 block">
                    {t("apiKeys.expiration")}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EXPIRATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, expiration: opt.value }))}
                        className={`px-3.5 py-2 rounded-lg text-sm border transition-all ${
                          formData.expiration === opt.value
                            ? "bg-accent-muted border-accent/30 text-accent"
                            : "bg-surface-2 border-border text-muted-2 hover:text-foreground hover:border-border-light"
                        }`}
                      >
                        {t(opt.key)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface-2/50">
                <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
                  {t("apiKeys.close")}
                </Button>
                <Button onClick={handleCreateKey} disabled={!formData.name.trim() || formData.scopes.length === 0}>
                  <Plus className="w-4 h-4" />
                  {t("apiKeys.create")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── New Key Reveal Dialog ─────────────────────────────────────── */}
      <AnimatePresence>
        {newKeyReveal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setNewKeyReveal(null)}
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
              className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent-muted flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-accent" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">{t("apiKeys.newKey")}</h2>
                </div>
                <button
                  onClick={() => setNewKeyReveal(null)}
                  className="p-1.5 rounded-md hover:bg-surface-2 transition-colors text-muted hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {/* Warning */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber/10 border border-amber/20">
                  <AlertTriangle className="w-5 h-5 text-amber shrink-0 mt-0.5" />
                  <p className="text-sm text-amber">{t("apiKeys.warning")}</p>
                </div>

                {/* Key display */}
                <div className="p-4 rounded-lg bg-surface-2 border border-border">
                  <code className="text-sm font-mono text-accent break-all leading-relaxed block select-all">
                    {newKeyReveal.fullKey}
                  </code>
                </div>

                {/* Copy button */}
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => handleCopy(newKeyReveal.fullKey)}
                    className="min-w-[180px]"
                  >
                    <Copy className="w-4 h-4" />
                    {t("apiKeys.copy")}
                  </Button>
                </div>

                <p className="text-xs text-muted-2 text-center">
                  {t("apiKeys.newKeyDesc")}
                </p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-center px-6 py-4 border-t border-border bg-surface-2/50">
                <Button variant="ghost" onClick={() => setNewKeyReveal(null)}>
                  {t("apiKeys.close")}
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
                <h3 className="text-lg font-semibold text-foreground mb-2">{t("apiKeys.delete")}</h3>
                <p className="text-sm text-muted-2">{t("apiKeys.confirmDelete")}</p>
              </div>
              <div className="flex items-center gap-3 px-6 py-4 border-t border-border bg-surface-2/50">
                <Button variant="ghost" className="flex-1" onClick={() => setDeleteConfirmId(null)}>
                  {t("apiKeys.close")}
                </Button>
                <Button
                  className="flex-1 bg-red text-white hover:bg-red/90 border-0"
                  onClick={() => handleDelete(deleteConfirmId)}
                >
                  <Trash2 className="w-4 h-4" />
                  {t("apiKeys.delete")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionFAQ section="api-keys" />
        <SmartNextStep {...RECOMMENDATION_CHAINS["api-keys"]} />
      </div>
    </div>
  );
}
