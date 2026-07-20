"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getLatestFindings,
  type Finding,
  type Severity,
} from "@/lib/engine";
import { useI18n } from "@/lib/i18n-context";
import { useToast } from "@/components/ui/Toast";
import {
  Bug,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  CheckSquare,
  UserPlus,
  RefreshCw,
  X,
  Shield,
  Code,
  FileText,
  Link2,
  Target,
  Send,
  Paperclip,
  AtSign,
  Calendar,
  User,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ThumbsUp,
  Heart,
  PartyPopper,
  ExternalLink,
  ClipboardList,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { ContextualHelp } from "@/components/ui/ContextualHelp";
import { SectionFAQ } from "@/components/ui/SectionFAQ";
import { SmartNextStep, RECOMMENDATION_CHAINS } from "@/components/ui/SmartNextStep";
import { BusinessResult } from "@/components/ui/BusinessResult";

const severityConfig: Record<Severity, { color: string; bg: string; border: string }> = {
  critical: { color: "text-red", bg: "bg-red-muted", border: "border-red/20" },
  high: { color: "text-amber", bg: "bg-amber-muted", border: "border-amber/20" },
  medium: { color: "text-cyan", bg: "bg-cyan-muted", border: "border-cyan/20" },
  low: { color: "text-muted-2", bg: "bg-surface-2", border: "border-border" },
  info: { color: "text-muted-2", bg: "bg-surface-2", border: "border-border" },
};

const statusColors: Record<string, { color: string; bg: string }> = {
  open: { color: "text-red", bg: "bg-red-muted" },
  acknowledged: { color: "text-amber", bg: "bg-amber-muted" },
  remediated: { color: "text-accent", bg: "bg-accent-muted" },
  false_positive: { color: "text-muted-2", bg: "bg-surface-2" },
};

const severityOptions: Severity[] = ["critical", "high", "medium", "low", "info"];
const statusOptions = ["open", "acknowledged", "remediated", "false_positive"] as const;

export default function FindingsPage() {
  const { t } = useI18n();
  const { addToast } = useToast();
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [showBulkStatus, setShowBulkStatus] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [commentText, setCommentText] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["description", "evidence"]));
  const initRef = useRef(false);

  const toggleSection = (s: string) => {
    setExpandedSections(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
  };

  // Mock discussion comments for selected finding
  const mockComments = [
    { id: "c1", author: "Иван Петров", role: "Admin", content: "Проверьте эту уязвимость на проде. Критический приоритет.", createdAt: "2025-07-18T10:30:00Z", reactions: { "👍": ["Анна Соколова"] } },
    { id: "c2", author: "Пётр Иванов", role: "Member", content: "Исправил. Добавил параметризованные запросы и валидацию входных данных.", createdAt: "2025-07-18T14:15:00Z", reactions: { "❤️": ["Иван Петров", "Анна Соколова"] } },
    { id: "c3", author: "Анна Соколова", role: "Manager", content: "Подтверждаю. Проверила — уязвимость закрыта. Перевожу в Remediated.", createdAt: "2025-07-18T16:45:00Z", reactions: { "🎉": ["Иван Петров", "Пётр Иванов"] } },
  ];

  const mockTeamMembers = [
    { id: "m1", name: "Иван Петров", role: "Admin", initials: "ИП", color: "bg-red" },
    { id: "m2", name: "Пётр Иванов", role: "Member", initials: "ПИ", color: "bg-accent" },
    { id: "m3", name: "Анна Соколова", role: "Manager", initials: "АС", color: "bg-amber" },
    { id: "m4", name: "Дмитрий Козлов", role: "Viewer", initials: "ДК", color: "bg-cyan" },
  ];

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const latest = getLatestFindings().map((f, idx) => ({
      ...f,
      discussionCount: f.discussionCount ?? (idx % 5),
    }));
    setFindings(latest);
    setLoaded(true);
  }, []);

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      if (severityFilter !== "all" && f.severity !== severityFilter) return false;
      if (statusFilter !== "all" && f.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          f.title.toLowerCase().includes(q) ||
          f.id.toLowerCase().includes(q) ||
          f.asset.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [findings, severityFilter, statusFilter, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredFindings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFindings.map((f) => f.id)));
    }
  };

  const handleBulkStatus = (status: string) => {
    setFindings((prev) =>
      prev.map((f) =>
        selectedIds.has(f.id)
          ? { ...f, status: status as Finding["status"] }
          : f
      )
    );
    addToast({ type: "success", title: t("finding.changeStatus"), description: `${selectedIds.size} findings updated` });
    setSelectedIds(new Set());
    setShowBulkStatus(false);
  };

  const handleBulkAssign = (name: string) => {
    setFindings((prev) =>
      prev.map((f) =>
        selectedIds.has(f.id) ? { ...f, assignedTo: name } : f
      )
    );
    addToast({ type: "success", title: t("finding.assignTo"), description: `${selectedIds.size} findings assigned to ${name}` });
    setSelectedIds(new Set());
    setShowBulkAssign(false);
  };

  if (!loaded) {
    return (
      <div className="animate-page-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">{t("findings.title")}</h1>
          <p className="mt-2 text-muted-2">{t("findings.subtitle")}</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (findings.length === 0) {
    return (
      <div className="animate-page-in">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">{t("findings.title")}</h1>
          <p className="mt-2 text-muted-2">{t("findings.subtitle")}</p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4">
            <Bug className="w-8 h-8 text-muted-2" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">No findings yet</h2>
          <p className="text-sm text-muted-2 max-w-md mb-6">
            Run a scan first to discover security findings and vulnerabilities.
          </p>
          <Link
            href="/app/scanner"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-background font-medium text-sm hover:bg-accent-hover transition-colors"
          >
            Go to Scanner
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="animate-page-in">
      <div id="findings-header" data-scroll-section={t("scroll.findings.overview")} className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t("findings.title")}</h1>
        <p className="mt-2 text-muted-2">{t("findings.subtitle")}</p>
        <div className="flex items-center gap-2 mt-2">
          <ContextualHelp section="findings" />
        </div>
        {findings.length > 0 && <BusinessResult type="risks_known" className="mt-4" />}
      </div>

      {/* ─── Stats / Filter Bar ─────────────────────────────────────────────────── */}
      <div id="findings-stats" data-scroll-section={t("scroll.findings.stats")} className="flex flex-wrap items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("findings.filter.search")}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-2 border border-border text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>

        {/* Severity Filter */}
        <div className="relative">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-surface-2 border border-border text-sm text-foreground cursor-pointer focus:outline-none focus:border-accent/50 transition-colors"
          >
            <option value="all">{t("findings.filter.severity")}: {t("findings.filter.all")}</option>
            {severityOptions.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-surface-2 border border-border text-sm text-foreground cursor-pointer focus:outline-none focus:border-accent/50 transition-colors"
          >
            <option value="all">{t("findings.filter.status")}: {t("findings.filter.all")}</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {t(`finding.status${s.charAt(0).toUpperCase() + s.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`)}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
        </div>

        {/* Reset */}
        {(severityFilter !== "all" || statusFilter !== "all" || searchQuery) && (
          <button
            onClick={() => {
              setSeverityFilter("all");
              setStatusFilter("all");
              setSearchQuery("");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-muted hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* ─── Bulk Actions ───────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-accent-muted border border-accent/20"
        >
          <CheckSquare className="w-4 h-4 text-accent" />
          <span className="text-sm text-accent font-medium">
            {selectedIds.size} selected
          </span>

          {/* Assign Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowBulkAssign(!showBulkAssign); setShowBulkStatus(false); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-surface-2 border border-border text-foreground hover:border-border-light transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {t("findings.bulk.assign")}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showBulkAssign && (
              <div className="absolute top-full left-0 mt-1 w-48 rounded-lg bg-surface border border-border shadow-lg z-20 py-1">
                {["Ivan Petrov", "Anna Sokolova", "Petr Ivanov"].map((name) => (
                  <button
                    key={name}
                    onClick={() => handleBulkAssign(name)}
                    className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-surface-2 transition-colors"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Set Status Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowBulkStatus(!showBulkStatus); setShowBulkAssign(false); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-surface-2 border border-border text-foreground hover:border-border-light transition-colors"
            >
              <Filter className="w-3.5 h-3.5" />
              {t("findings.bulk.setStatus")}
              <ChevronDown className="w-3 h-3" />
            </button>
            {showBulkStatus && (
              <div className="absolute top-full left-0 mt-1 w-48 rounded-lg bg-surface border border-border shadow-lg z-20 py-1">
                {statusOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleBulkStatus(s)}
                    className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-surface-2 transition-colors capitalize"
                  >
                    {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-muted hover:text-foreground transition-colors"
          >
            Clear selection
          </button>
        </motion.div>
      )}

      {/* ─── Findings Table ─────────────────────────────────────────────── */}
      {filteredFindings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-8 h-8 text-muted-2 mb-3" />
          <p className="text-sm text-muted-2">{t("findings.noResults")}</p>
        </div>
      ) : (
        <div id="findings-list" data-scroll-section={t("scroll.findings.list")} className="rounded-xl bg-surface border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredFindings.length && filteredFindings.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-border accent-accent cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Finding</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Severity</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">CVSS</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Asset</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {t("findings.discussionCount")}
                    </span>
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredFindings.map((finding, i) => {
                  const sev = severityConfig[finding.severity];
                  const st = statusColors[finding.status] || statusColors.open;
                  return (
                    <motion.tr
                      key={finding.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="group hover:bg-surface-2 transition-colors cursor-pointer"
                    >
                      <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(finding.id)}
                          onChange={() => toggleSelect(finding.id)}
                          className="w-4 h-4 rounded border-border accent-accent cursor-pointer"
                        />
                      </td>
                      <td className="px-5 py-3.5" onClick={() => setSelectedFinding(finding)}>
                        <div className="flex items-center gap-3">
                          <Bug className={`w-4 h-4 ${sev.color} shrink-0`} />
                          <div>
                            <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">{finding.title}</p>
                            <p className="text-xs text-muted">{finding.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5" onClick={() => setSelectedFinding(finding)}>
                        <span className={`px-2 py-0.5 rounded-md text-xs font-semibold uppercase ${sev.bg} ${sev.color} border ${sev.border}`}>
                          {finding.severity}
                        </span>
                      </td>
                      <td className="px-5 py-3.5" onClick={() => setSelectedFinding(finding)}>
                        <span className="text-sm font-mono text-foreground">{finding.cvss.toFixed(1)}</span>
                      </td>
                      <td className="px-5 py-3.5" onClick={() => setSelectedFinding(finding)}>
                        <span className="text-sm text-muted-2">{finding.asset}</span>
                      </td>
                      <td className="px-5 py-3.5" onClick={() => setSelectedFinding(finding)}>
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium capitalize ${st.bg} ${st.color}`}>
                          {finding.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5" onClick={() => setSelectedFinding(finding)}>
                        <span className="inline-flex items-center gap-1 text-sm text-muted-2">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {finding.discussionCount ?? 0}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right" onClick={() => setSelectedFinding(finding)}>
                        <span className="text-sm text-muted-2">{finding.discoveredAt.split("T")[0]}</span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-5 py-3 border-t border-border bg-surface-2/50 flex items-center justify-between">
            <p className="text-xs text-muted">
              {filteredFindings.length} of {findings.length} findings
            </p>
            {filteredFindings.length > 0 && (
              <div className="flex items-center gap-3">
                {severityOptions.map((s) => {
                  const count = filteredFindings.filter((f) => f.severity === s).length;
                  if (count === 0) return null;
                  const sev = severityConfig[s];
                  return (
                    <span key={s} className={`text-xs font-medium ${sev.color}`}>
                      {count} {s}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Finding Detail Modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {selectedFinding && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedFinding(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="fixed inset-4 md:inset-8 z-[70] overflow-hidden rounded-xl bg-surface border border-border shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedFinding(null)} className="p-1 rounded-lg hover:bg-surface-2 transition-colors">
                    <ArrowLeft className="w-4 h-4 text-muted" />
                  </button>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-bold uppercase ${severityConfig[selectedFinding.severity].bg} ${severityConfig[selectedFinding.severity].color} border ${severityConfig[selectedFinding.severity].border}`}>
                    {selectedFinding.severity}
                  </span>
                  <h2 className="text-lg font-bold text-foreground">{selectedFinding.title}</h2>
                </div>
                <button onClick={() => setSelectedFinding(null)} className="p-1 rounded-lg hover:bg-surface-2 transition-colors">
                  <X className="w-5 h-5 text-muted" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col lg:flex-row">
                  {/* Left column - Finding details + Discussion */}
                  <div className="flex-1 p-6 space-y-6">
                    {/* Meta row */}
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="flex items-center gap-1.5 text-muted-2"><Shield className="w-3.5 h-3.5" />CVSS: <span className="font-mono text-foreground">{selectedFinding.cvss.toFixed(1)}</span></span>
                      {selectedFinding.cwe && <span className="flex items-center gap-1.5 text-muted-2"><Target className="w-3.5 h-3.5" />{selectedFinding.cwe}</span>}
                      {selectedFinding.cve && <span className="flex items-center gap-1.5 text-amber"><AlertTriangle className="w-3.5 h-3.5" />{selectedFinding.cve}</span>}
                      <span className="flex items-center gap-1.5 text-muted-2"><Clock className="w-3.5 h-3.5" />{selectedFinding.discoveredAt.split("T")[0]}</span>
                      <span className="flex items-center gap-1.5 text-muted-2"><Bug className="w-3.5 h-3.5" />{selectedFinding.tool}</span>
                      <span className="flex items-center gap-1.5 text-muted-2"><FileText className="w-3.5 h-3.5" />{selectedFinding.asset}</span>
                    </div>

                    {/* Expandable sections */}
                    {[
                      { key: "description", icon: FileText, title: "Description", content: selectedFinding.description },
                      { key: "evidence", icon: Code, title: "Evidence", content: selectedFinding.evidence },
                      { key: "recommendation", icon: Shield, title: "Recommendation", content: selectedFinding.recommendation },
                      { key: "references", icon: Link2, title: "References", content: selectedFinding.references.join("\n") },
                      { key: "mitre", icon: Target, title: "MITRE ATT&CK", content: selectedFinding.mitre || "N/A" },
                    ].map(section => (
                      <div key={section.key} className="rounded-lg bg-surface-2/50 border border-border overflow-hidden">
                        <button
                          onClick={() => toggleSection(section.key)}
                          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-surface-2 transition-colors"
                        >
                          <span className="flex items-center gap-2"><section.icon className="w-4 h-4 text-accent" />{section.title}</span>
                          {expandedSections.has(section.key) ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
                        </button>
                        {expandedSections.has(section.key) && (
                          <div className={`px-4 pb-3 text-sm text-muted-2 whitespace-pre-wrap ${section.key === "evidence" ? "font-mono text-xs bg-surface-2 rounded mx-3 mb-3 p-3 border border-border/50" : ""}`}>
                            {section.content}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Discussion Thread */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <MessageSquare className="w-5 h-5 text-accent" />
                        <h3 className="text-base font-semibold text-foreground">{t("discussion.title")}</h3>
                        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-accent-muted text-accent border border-accent/20">{t("discussion.statusResolved")}</span>
                      </div>

                      {/* Status flow */}
                      <div className="flex items-center gap-2 mb-4">
                        {[
                          { label: t("discussion.statusOpen"), active: true },
                          { label: t("discussion.statusInProgress"), active: true },
                          { label: t("discussion.statusResolved"), active: true },
                        ].map((step, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${step.active ? "bg-accent-muted text-accent border border-accent/20" : "bg-surface-2 text-muted-2 border border-border"}`}>
                              {step.label}
                            </span>
                            {i < 2 && <div className="w-4 h-0.5 bg-accent/30" />}
                          </div>
                        ))}
                      </div>

                      {/* Comments */}
                      <div className="space-y-3">
                        {mockComments.map((comment) => (
                          <div key={comment.id} className="p-4 rounded-lg bg-surface border border-border">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-7 h-7 rounded-full bg-accent-muted flex items-center justify-center text-[10px] font-bold text-accent">
                                {comment.author.split(" ").map(n => n[0]).join("")}
                              </div>
                              <span className="text-sm font-medium text-foreground">{comment.author}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-muted-2 border border-border">{comment.role}</span>
                              <span className="text-xs text-muted ml-auto">{new Date(comment.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-muted-2 mb-2">{comment.content}</p>
                            <div className="flex items-center gap-2">
                              {Object.entries(comment.reactions).map(([emoji, users]) => (
                                <span key={emoji} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-2 text-xs text-muted-2 border border-border hover:border-accent/30 cursor-pointer transition-colors">
                                  {emoji} {users.length}
                                </span>
                              ))}
                              <button className="text-xs text-muted hover:text-accent transition-colors">+</button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Comment input */}
                      <div className="mt-3 rounded-lg bg-surface-2/50 border border-border p-3">
                        <textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder={`${t("discussion.write")}... (@${t("discussion.mention").toLowerCase()})`}
                          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted resize-none focus:outline-none min-h-[60px]"
                        />
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                          <div className="flex items-center gap-2">
                            <button className="p-1.5 rounded hover:bg-surface-2 transition-colors text-muted hover:text-foreground"><Paperclip className="w-4 h-4" /></button>
                            <button className="p-1.5 rounded hover:bg-surface-2 transition-colors text-muted hover:text-foreground"><AtSign className="w-4 h-4" /></button>
                          </div>
                          <button
                            onClick={() => {
                              if (commentText.trim()) {
                                addToast({ type: "success", title: t("discussion.comment"), description: "Comment added" });
                                setCommentText("");
                              }
                            }}
                            disabled={!commentText.trim()}
                            className="px-3 py-1.5 rounded-lg bg-accent text-background text-xs font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                          >
                            <Send className="w-3 h-3" />{t("discussion.reply")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right column - Quick Actions + Team + Activity */}
                  <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-border p-4 space-y-4">
                    {/* Quick Actions */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">{t("common.actions")}</h4>
                      <div className="space-y-1.5">
                        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-surface-2 transition-colors">
                          <Shield className="w-4 h-4 text-amber" />{t("finding.changeStatus")}
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-surface-2 transition-colors">
                          <User className="w-4 h-4 text-accent" />{t("finding.assignTo")}
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-surface-2 transition-colors">
                          <Calendar className="w-4 h-4 text-cyan" />{t("finding.setDeadline")}
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-surface-2 transition-colors">
                          <ClipboardList className="w-4 h-4 text-purple" />Create Jira Issue
                        </button>
                        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-surface-2 transition-colors">
                          <Share2 className="w-4 h-4 text-muted-2" />{t("emailReports.share")}
                        </button>
                      </div>
                    </div>

                    {/* Team */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">{t("team.members")}</h4>
                      <div className="space-y-2">
                        {mockTeamMembers.map(m => (
                          <div key={m.id} className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full ${m.color}/20 flex items-center justify-center text-[10px] font-bold ${m.color.replace("bg-", "text-")}`}>
                              {m.initials}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-foreground">{m.name}</p>
                              <p className="text-[10px] text-muted-2">{m.role}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Activity Log */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Activity</h4>
                      <div className="space-y-2">
                        {[
                          { time: "16:45", text: "Анна: Status → Remediated", icon: CheckCircle2, color: "text-accent" },
                          { time: "14:15", text: "Пётр: Added comment", icon: MessageSquare, color: "text-cyan" },
                          { time: "10:30", text: "Иван: Assigned to Пётр", icon: User, color: "text-amber" },
                          { time: "09:00", text: "System: Finding detected", icon: AlertTriangle, color: "text-red" },
                        ].map((act, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <act.icon className={`w-3.5 h-3.5 ${act.color} mt-0.5 shrink-0`} />
                            <div>
                              <span className="text-foreground">{act.text}</span>
                              <span className="text-muted ml-1.5">{act.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div id="findings-faq" data-scroll-section={t("scroll.findings.faq")} className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionFAQ section="findings" />
        <SmartNextStep {...RECOMMENDATION_CHAINS["findings"]} />
      </div>
    </div>
  );
}
