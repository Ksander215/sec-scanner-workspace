"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { useI18n } from "@/lib/i18n-context";
import { useToast } from "@/components/ui/Toast";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Settings as SettingsIcon,
  User,
  Users,
  Key,
  Terminal,
  Bell,
  Plug,
  Shield,
  Palette,
  Globe,
  CreditCard,
  Store,
  Monitor,
  FileText,
  Activity,
  CheckCircle2,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  LogOut,
  Link2,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  avatar: string;
}

interface SshKey {
  id: string;
  name: string;
  fingerprint: string;
  created: string;
}

interface Session {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
  ip: string;
}

interface Token {
  id: string;
  name: string;
  created: string;
  lastUsed: string;
  permissions: ("read" | "write" | "admin")[];
  key: string;
}

interface AuditEntry {
  id: string;
  action: string;
  user: string;
  date: string;
  details: string;
}

interface InstalledTool {
  id: string;
  name: string;
  version: string;
  description: string;
}

// ─── Section Config ─────────────────────────────────────────────────────────

const sections = [
  { id: "profile", icon: User },
  { id: "team", icon: Users },
  { id: "api", icon: Key },
  { id: "ssh", icon: Terminal },
  { id: "notifications", icon: Bell },
  { id: "integrations", icon: Plug },
  { id: "security", icon: Shield },
  { id: "appearance", icon: Palette },
  { id: "language", icon: Globe },
  { id: "billing", icon: CreditCard },
  { id: "marketplace", icon: Store },
  { id: "sessions", icon: Monitor },
  { id: "tokens", icon: FileText },
  { id: "auditLog", icon: Activity },
] as const;

type SectionId = (typeof sections)[number]["id"];

// ─── Component ──────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const { addToast } = useToast();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [activeSection, setActiveSection] = useState<SectionId>("profile");
  const [sidebarPos, setSidebarPos] = useState<"left" | "right">("left");

  // Profile state
  const [profileName, setProfileName] = useState("Алексей Петров");
  const [profileEmail, setProfileEmail] = useState("alexey@sec-scanner.pro");

  // Notifications state
  const [notifications, setNotifications] = useState({
    criticalFindings: true,
    scanCompleted: true,
    newRecommendations: true,
    communityUpdates: false,
  });

  // 2FA state
  const [enabled2FA, setEnabled2FA] = useState(false);

  // API key state
  const [apiKeys, setApiKeys] = useState([
    { id: "1", key: "ssi_prod_****7f3a", created: "2026-06-01", lastUsed: "2026-08-15" },
  ]);
  const [newKeyVisible, setNewKeyVisible] = useState<string | null>(null);

  // SSH keys state
  const [sshKeys, setSshKeys] = useState<SshKey[]>([
    { id: "1", name: "Production Server", fingerprint: "SHA256:nThbg6kXUpJW...7W3IcV38", created: "2026-05-10" },
    { id: "2", name: "Staging", fingerprint: "SHA256:9pVq8fJ2kMzR...4yLbN1wX0", created: "2026-07-22" },
  ]);

  // Integrations state
  const [integrations, setIntegrations] = useState({
    slack: true,
    jira: false,
    github: true,
    gitlab: false,
  });

  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([
    { id: "1", device: "Chrome / macOS", location: "Москва, Россия", lastActive: "Сейчас", current: true, ip: "192.168.1.1" },
    { id: "2", device: "Firefox / Windows", location: "Санкт-Петербург, Россия", lastActive: "2 часа назад", current: false, ip: "10.0.0.5" },
    { id: "3", device: "Safari / iOS", location: "Москва, Россия", lastActive: "1 день назад", current: false, ip: "172.16.0.3" },
  ]);

  // Tokens state
  const [tokens, setTokens] = useState<Token[]>([
    { id: "1", name: "CI/CD Pipeline", created: "2026-06-15", lastUsed: "2026-08-20", permissions: ["read", "write"], key: "sip_tok_****a1b2" },
    { id: "2", name: "Monitoring Service", created: "2026-07-01", lastUsed: "2026-08-19", permissions: ["read"], key: "sip_tok_****c3d4" },
  ]);

  // Marketplace state
  const [installedTools, setInstalledTools] = useState<InstalledTool[]>([
    { id: "1", name: "Nuclei Scanner", version: "3.2.1", description: "Vulnerability scanner based on templates" },
    { id: "2", name: "Subfinder", version: "2.6.7", description: "Passive subdomain discovery tool" },
    { id: "3", name: "HTTPX", version: "1.6.0", description: "Fast and multi-purpose HTTP toolkit" },
    { id: "4", name: "Naabu", version: "2.3.0", description: "Port scanning tool" },
  ]);

  // Audit log state
  const [auditLog] = useState<AuditEntry[]>([
    { id: "1", action: "scan.started", user: "alexey@sec-scanner.pro", date: "2026-08-20 14:32", details: "Full scan initiated for api.example.com" },
    { id: "2", action: "user.login", user: "alexey@sec-scanner.pro", date: "2026-08-20 14:30", details: "Login from Chrome / macOS" },
    { id: "3", action: "api.key_generated", user: "alexey@sec-scanner.pro", date: "2026-08-20 12:15", details: "New API key generated" },
    { id: "4", action: "team.member_invited", user: "admin@sec-scanner.pro", date: "2026-08-19 10:00", details: "Invited maria@sec-scanner.pro" },
    { id: "5", action: "integration.connected", user: "alexey@sec-scanner.pro", date: "2026-08-18 16:45", details: "Slack integration enabled" },
    { id: "6", action: "settings.updated", user: "alexey@sec-scanner.pro", date: "2026-08-18 14:22", details: "Notification preferences changed" },
    { id: "7", action: "scan.completed", user: "alexey@sec-scanner.pro", date: "2026-08-18 11:00", details: "Scan completed: 12 findings" },
  ]);

  // Team state
  const [teamMembers] = useState<TeamMember[]>([
    { id: "1", name: "Алексей Петров", email: "alexey@sec-scanner.pro", role: "owner", avatar: "АП" },
    { id: "2", name: "Мария Иванова", email: "maria@sec-scanner.pro", role: "admin", avatar: "МИ" },
    { id: "3", name: "Дмитрий Козлов", email: "dmitry@sec-scanner.pro", role: "member", avatar: "ДК" },
  ]);
  const [inviteEmail, setInviteEmail] = useState("");

  // Billing state
  const [billingHistory] = useState([
    { id: "1", date: "2026-08-01", amount: "14 900 ₽", status: "paid" },
    { id: "2", date: "2026-07-01", amount: "14 900 ₽", status: "paid" },
    { id: "3", date: "2026-06-01", amount: "14 900 ₽", status: "paid" },
  ]);

  // Scroll spy
  useEffect(() => {
    if (!mounted) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as SectionId);
          }
        });
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [mounted]);

  const handleSave = useCallback(() => {
    addToast({ type: "success", title: t("settings.saved") });
  }, [addToast, t]);

  const toggleNotification = useCallback(
    (key: keyof typeof notifications) => {
      setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    []
  );

  const handleGenerateApiKey = useCallback(() => {
    const suffix = Math.random().toString(36).slice(2, 6);
    const newKey = `ssi_prod_****${suffix}`;
    const id = Date.now().toString();
    setApiKeys((prev) => [...prev, { id, key: newKey, created: new Date().toISOString().split("T")[0], lastUsed: "—" }]);
    setNewKeyVisible(id);
    addToast({ type: "success", title: t("toast.keyGenerated") });
    setTimeout(() => setNewKeyVisible(null), 5000);
  }, [addToast, t]);

  const handleCopyKey = useCallback(
    (key: string) => {
      navigator.clipboard?.writeText(key);
      addToast({ type: "success", title: t("toast.copied") });
    },
    [addToast, t]
  );

  const handleDeleteApiKey = useCallback(
    (id: string) => {
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      handleSave();
    },
    [handleSave]
  );

  const handleAddSshKey = useCallback(() => {
    const newKey: SshKey = {
      id: Date.now().toString(),
      name: `Key ${sshKeys.length + 1}`,
      fingerprint: `SHA256:${Math.random().toString(36).slice(2, 12)}...${Math.random().toString(36).slice(2, 6)}`,
      created: new Date().toISOString().split("T")[0],
    };
    setSshKeys((prev) => [...prev, newKey]);
    handleSave();
  }, [sshKeys.length, handleSave]);

  const handleDeleteSshKey = useCallback(
    (id: string) => {
      setSshKeys((prev) => prev.filter((k) => k.id !== id));
      handleSave();
    },
    [handleSave]
  );

  const handleToggleIntegration = useCallback(
    (key: keyof typeof integrations) => {
      setIntegrations((prev) => ({ ...prev, [key]: !prev[key] }));
      handleSave();
    },
    [handleSave]
  );

  const handleRevokeSession = useCallback(
    (id: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      handleSave();
    },
    [handleSave]
  );

  const handleRevokeAllSessions = useCallback(() => {
    setSessions((prev) => prev.filter((s) => s.current));
    handleSave();
  }, [handleSave]);

  const handleCreateToken = useCallback(() => {
    const suffix = Math.random().toString(36).slice(2, 6);
    const newToken: Token = {
      id: Date.now().toString(),
      name: `Token ${tokens.length + 1}`,
      created: new Date().toISOString().split("T")[0],
      lastUsed: "—",
      permissions: ["read"],
      key: `sip_tok_****${suffix}`,
    };
    setTokens((prev) => [...prev, newToken]);
    addToast({ type: "success", title: t("settings.tokens.create") });
  }, [tokens.length, addToast, t]);

  const handleDeleteToken = useCallback(
    (id: string) => {
      setTokens((prev) => prev.filter((t) => t.id !== id));
      handleSave();
    },
    [handleSave]
  );

  const handleRemoveTool = useCallback(
    (id: string) => {
      setInstalledTools((prev) => prev.filter((t) => t.id !== id));
      handleSave();
    },
    [handleSave]
  );

  const handleInviteTeamMember = useCallback(() => {
    if (inviteEmail.trim()) {
      setInviteEmail("");
      handleSave();
    }
  }, [inviteEmail, handleSave]);

  const handleToggle2FA = useCallback(() => {
    setEnabled2FA((prev) => !prev);
    handleSave();
  }, [handleSave]);

  const scrollToSection = useCallback((id: SectionId) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  if (!mounted) return null;

  // ─── Section title helper ─────────────────────────────────────────────

  const sectionTitle = (id: SectionId) => t(`settings.${id}`);

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-7rem)]">
      <Container className="py-8">
        {/* Page Header */}
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3 mb-8">
          <SettingsIcon className="w-6 h-6 text-accent" />
          {t("settings.title")}
        </h1>

        <div className="flex gap-8">
          {/* ─── Left Sidebar Navigation ─────────────────────────────── */}
          <aside className="hidden lg:block w-56 shrink-0">
            <nav className="sticky top-24 space-y-1">
              {sections.map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                    activeSection === id
                      ? "bg-accent/10 text-accent font-medium"
                      : "text-muted-2 hover:text-foreground hover:bg-surface-2"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {sectionTitle(id)}
                </button>
              ))}
            </nav>
          </aside>

          {/* ─── Main Content ────────────────────────────────────────── */}
          <main className="flex-1 min-w-0 space-y-6 max-w-3xl">
            {/* ─── 1. Profile ──────────────────────────────────────── */}
            <section id="profile" className="p-6 rounded-xl bg-surface border border-border scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <User className="w-5 h-5 text-accent" />
                <h2 className="text-base font-semibold text-foreground">{t("settings.profile")}</h2>
              </div>
              <div className="flex items-start gap-6 mb-5">
                <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-accent text-lg font-bold shrink-0">
                  АП
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="text-xs text-muted-2 mb-1 block">{t("settings.profile.name")}</label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-surface-2 border border-border text-foreground focus:outline-none focus:border-accent/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-2 mb-1 block">{t("settings.profile.email")}</label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-surface-2 border border-border text-foreground focus:outline-none focus:border-accent/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-2 mb-1 block">{t("settings.profile.role")}</label>
                    <div className="flex items-center gap-2">
                      <Badge variant="low">{t("settings.profile.role.owner")}</Badge>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={handleSave}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t("settings.profile.save")}
                </Button>
              </div>
            </section>

            {/* ─── 2. Team ─────────────────────────────────────────── */}
            <section id="team" className="p-6 rounded-xl bg-surface border border-border scroll-mt-24">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-cyan" />
                  <h2 className="text-base font-semibold text-foreground">{t("settings.team")}</h2>
                </div>
              </div>
              <div className="space-y-3 mb-4">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-bold shrink-0">
                        {member.avatar}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{member.name}</div>
                        <div className="text-xs text-muted-2">{member.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={member.role === "owner" ? "low" : member.role === "admin" ? "info" : "default"}>
                        {t(`settings.profile.role.${member.role}`)}
                      </Badge>
                      {member.role !== "owner" && (
                        <Button size="sm" variant="ghost" onClick={handleSave}>
                          <Trash2 className="w-3.5 h-3.5 text-red" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={t("settings.team.invitePlaceholder")}
                  className="flex-1 px-3 py-2 text-sm rounded-lg bg-surface-2 border border-border text-foreground placeholder:text-muted focus:outline-none focus:border-accent/50 transition-colors"
                />
                <Button size="sm" variant="outline" onClick={handleInviteTeamMember}>
                  <Plus className="w-3.5 h-3.5" />
                  {t("settings.team.invite")}
                </Button>
              </div>
            </section>

            {/* ─── 3. API Keys ──────────────────────────────────────── */}
            <section id="api" className="p-6 rounded-xl bg-surface border border-border scroll-mt-24">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-accent" />
                  <h2 className="text-base font-semibold text-foreground">{t("settings.api.keys")}</h2>
                </div>
                <Button size="sm" variant="outline" onClick={handleGenerateApiKey}>
                  <Plus className="w-3.5 h-3.5" />
                  {t("settings.api.generate")}
                </Button>
              </div>
              <div className="space-y-3">
                {apiKeys.map((apiKey) => (
                  <div key={apiKey.id} className="p-3 rounded-lg bg-surface-2 border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-xs font-mono text-accent">{apiKey.key}</code>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopyKey(apiKey.key)}
                          className="p-1.5 rounded-md hover:bg-surface-3 transition-colors text-muted-2 hover:text-foreground"
                          title={t("common.copy")}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteApiKey(apiKey.id)}
                          className="p-1.5 rounded-md hover:bg-surface-3 transition-colors text-muted-2 hover:text-red"
                          title={t("common.delete")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-2">
                      <span>{t("settings.ssh.created")}: {apiKey.created}</span>
                      <span>·</span>
                      <span>{t("settings.tokens.lastUsed")}: {apiKey.lastUsed}</span>
                    </div>
                    {newKeyVisible === apiKey.id && (
                      <div className="mt-2 p-2 rounded-md bg-accent/10 border border-accent/20 text-xs text-accent">
                        {locale === "en" ? "Make sure to copy your API key. You won't see it again!" : "Скопируйте API-ключ. Он больше не будет отображаться!"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* ─── 4. SSH Keys ──────────────────────────────────────── */}
            <section id="ssh" className="p-6 rounded-xl bg-surface border border-border scroll-mt-24">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <Terminal className="w-5 h-5 text-amber" />
                  <h2 className="text-base font-semibold text-foreground">{t("settings.ssh")}</h2>
                </div>
                <Button size="sm" variant="outline" onClick={handleAddSshKey}>
                  <Plus className="w-3.5 h-3.5" />
                  {t("settings.ssh.add")}
                </Button>
              </div>
              {sshKeys.length === 0 ? (
                <p className="text-sm text-muted-2 py-4 text-center">{t("settings.ssh.noKeys")}</p>
              ) : (
                <div className="space-y-3">
                  {sshKeys.map((ssh) => (
                    <div key={ssh.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-border">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground">{ssh.name}</div>
                        <code className="text-xs text-muted-2 font-mono block truncate">{ssh.fingerprint}</code>
                        <div className="text-xs text-muted-2 mt-0.5">{t("settings.ssh.created")}: {ssh.created}</div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteSshKey(ssh.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-red" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-2 mt-3">{t("settings.ssh.title")}</p>
            </section>

            {/* ─── 5. Notifications ─────────────────────────────────── */}
            <section id="notifications" className="p-6 rounded-xl bg-surface border border-border scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <Bell className="w-5 h-5 text-amber" />
                <h2 className="text-base font-semibold text-foreground">{t("settings.notifications")}</h2>
              </div>
              <div className="space-y-3">
                {[
                  { key: "criticalFindings" as const, nameKey: "settings.notifications.critical", enabled: notifications.criticalFindings },
                  { key: "scanCompleted" as const, nameKey: "settings.notifications.scanCompleted", enabled: notifications.scanCompleted },
                  { key: "newRecommendations" as const, nameKey: "settings.notifications.recommendations", enabled: notifications.newRecommendations },
                  { key: "communityUpdates" as const, nameKey: "settings.notifications.community", enabled: notifications.communityUpdates },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-border">
                    <span className="text-sm text-foreground">{t(item.nameKey)}</span>
                    <button
                      role="switch"
                      aria-checked={item.enabled}
                      aria-label={t(item.nameKey)}
                      onClick={() => toggleNotification(item.key)}
                      className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${item.enabled ? "bg-accent/20" : "bg-surface-3"}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${item.enabled ? "right-0.5 bg-accent" : "left-0.5 bg-muted"}`} />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* ─── 6. Integrations ──────────────────────────────────── */}
            <section id="integrations" className="p-6 rounded-xl bg-surface border border-border scroll-mt-24">
              <div className="flex items-center gap-3 mb-2">
                <Plug className="w-5 h-5 text-cyan" />
                <h2 className="text-base font-semibold text-foreground">{t("settings.integrations")}</h2>
              </div>
              <p className="text-xs text-muted-2 mb-5">{t("settings.integrations.title")}</p>
              <div className="space-y-3">
                {([
                  { key: "slack" as const, name: "Slack", color: "text-purple", icon: Link2, connected: integrations.slack },
                  { key: "jira" as const, name: "Jira", color: "text-cyan", icon: Link2, connected: integrations.jira },
                  { key: "github" as const, name: "GitHub", color: "text-foreground", icon: Link2, connected: integrations.github },
                  { key: "gitlab" as const, name: "GitLab", color: "text-amber", icon: Link2, connected: integrations.gitlab },
                ]).map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-border">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center ${item.color}`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{item.name}</div>
                        <div className="text-xs text-muted-2">
                          {item.connected ? t("settings.connected") : locale === "en" ? "Not connected" : "Не подключено"}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={item.connected ? "outline" : "primary"}
                      onClick={() => handleToggleIntegration(item.key)}
                    >
                      {item.connected ? t("settings.disconnect") : t("settings.connect")}
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            {/* ─── 7. Security ──────────────────────────────────────── */}
            <section id="security" className="p-6 rounded-xl bg-surface border border-border scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <Shield className="w-5 h-5 text-red" />
                <h2 className="text-base font-semibold text-foreground">{t("settings.security")}</h2>
              </div>
              <div className="space-y-3">
                {/* 2FA */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-border">
                  <div>
                    <div className="text-sm text-foreground">{t("settings.security.2fa")}</div>
                    <div className="text-xs text-muted-2">{t("settings.security.2fa.desc")}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={enabled2FA ? "low" : "default"}>
                      {enabled2FA ? t("settings.security.2fa.enabled") : t("settings.security.2fa.disabled")}
                    </Badge>
                    <Button size="sm" variant={enabled2FA ? "outline" : "primary"} onClick={handleToggle2FA}>
                      {enabled2FA ? t("settings.security.disable2fa") : t("settings.security.enable2fa")}
                    </Button>
                  </div>
                </div>
                {/* Active Sessions Summary */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-border">
                  <div>
                    <div className="text-sm text-foreground">{t("settings.security.sessions")}</div>
                    <div className="text-xs text-muted-2">{t("settings.security.sessions.desc")}</div>
                  </div>
                  <Badge variant="info">{sessions.length} {locale === "en" ? "active" : "активных"}</Badge>
                </div>
              </div>
            </section>

            {/* ─── 8. Appearance ────────────────────────────────────── */}
            <section id="appearance" className="p-6 rounded-xl bg-surface border border-border scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <Palette className="w-5 h-5 text-purple" />
                <h2 className="text-base font-semibold text-foreground">{t("settings.appearance")}</h2>
              </div>
              <div className="space-y-4">
                {/* Theme selector */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-foreground">{t("settings.appearance.theme")}</div>
                    <div className="text-xs text-muted-2">{t("settings.appearance.theme.desc")}</div>
                  </div>
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-2 border border-border">
                    {(["dark", "light", "system"] as const).map((th) => (
                      <button
                        key={th}
                        onClick={() => setTheme(th)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          theme === th ? "bg-accent text-background" : "text-muted-2 hover:text-foreground"
                        }`}
                      >
                        {th.charAt(0).toUpperCase() + th.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Sidebar position */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-foreground">{t("settings.appearance.sidebar")}</div>
                    <div className="text-xs text-muted-2">{t("settings.appearance.sidebar.desc")}</div>
                  </div>
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-2 border border-border">
                    {(["left", "right"] as const).map((pos) => (
                      <button
                        key={pos}
                        onClick={() => setSidebarPos(pos)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          sidebarPos === pos ? "bg-accent text-background" : "text-muted-2 hover:text-foreground"
                        }`}
                      >
                        {pos.charAt(0).toUpperCase() + pos.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ─── 9. Language ──────────────────────────────────────── */}
            <section id="language" className="p-6 rounded-xl bg-surface border border-border scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <Globe className="w-5 h-5 text-cyan" />
                <h2 className="text-base font-semibold text-foreground">{t("settings.language")}</h2>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-foreground">{t("settings.language.interface")}</div>
                  <div className="text-xs text-muted-2">{t("settings.language.interface.desc")}</div>
                </div>
                <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-2 border border-border">
                  {(["ru", "en"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLocale(l)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        locale === l ? "bg-accent text-background" : "text-muted-2 hover:text-foreground"
                      }`}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* ─── 10. Billing ──────────────────────────────────────── */}
            <section id="billing" className="p-6 rounded-xl bg-surface border border-border scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <CreditCard className="w-5 h-5 text-accent" />
                <h2 className="text-base font-semibold text-foreground">{t("settings.billing")}</h2>
              </div>
              {/* Current plan */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-accent/5 border border-accent/20 mb-4">
                <div>
                  <div className="text-xs text-muted-2 mb-0.5">{t("settings.billing.plan")}</div>
                  <div className="text-lg font-bold text-foreground">{t("settings.billing.planName")}</div>
                  <div className="text-xs text-muted-2">14 900 ₽/{locale === "en" ? "mo" : "мес"}</div>
                </div>
                <Button size="sm" variant="outline">
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t("settings.billing.change")}
                </Button>
              </div>
              {/* Payment history */}
              <div>
                <h3 className="text-sm font-medium text-foreground mb-3">{t("settings.billing.history")}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-2 border-b border-border">
                        <th className="text-left pb-2 font-medium">{t("settings.billing.date")}</th>
                        <th className="text-left pb-2 font-medium">{t("settings.billing.amount")}</th>
                        <th className="text-left pb-2 font-medium">{t("settings.billing.status")}</th>
                        <th className="text-right pb-2 font-medium">{t("settings.billing.invoices")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {billingHistory.map((item) => (
                        <tr key={item.id} className="border-b border-border/50 last:border-0">
                          <td className="py-2.5 text-foreground">{item.date}</td>
                          <td className="py-2.5 text-foreground">{item.amount}</td>
                          <td className="py-2.5">
                            <Badge variant="low">{t("settings.billing.paid")}</Badge>
                          </td>
                          <td className="py-2.5 text-right">
                            <button className="text-xs text-accent hover:underline">{t("common.download")}</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* ─── 11. Marketplace ──────────────────────────────────── */}
            <section id="marketplace" className="p-6 rounded-xl bg-surface border border-border scroll-mt-24">
              <div className="flex items-center gap-3 mb-5">
                <Store className="w-5 h-5 text-accent" />
                <h2 className="text-base font-semibold text-foreground">{t("settings.marketplace")}</h2>
              </div>
              <p className="text-xs text-muted-2 mb-4">{t("settings.marketplace.installedTools")}</p>
              {installedTools.length === 0 ? (
                <p className="text-sm text-muted-2 py-4 text-center">{t("settings.marketplace.noTools")}</p>
              ) : (
                <div className="space-y-3">
                  {installedTools.map((tool) => (
                    <div key={tool.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-border">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{tool.name}</span>
                          <Badge variant="category">v{tool.version}</Badge>
                        </div>
                        <div className="text-xs text-muted-2 mt-0.5">{tool.description}</div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleRemoveTool(tool.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-red" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ─── 12. Sessions ─────────────────────────────────────── */}
            <section id="sessions" className="p-6 rounded-xl bg-surface border border-border scroll-mt-24">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <Monitor className="w-5 h-5 text-cyan" />
                  <h2 className="text-base font-semibold text-foreground">{t("settings.sessions")}</h2>
                </div>
                {sessions.length > 1 && (
                  <Button size="sm" variant="outline" onClick={handleRevokeAllSessions}>
                    <LogOut className="w-3.5 h-3.5" />
                    {t("settings.security.terminateAll")}
                  </Button>
                )}
              </div>
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-2 py-4 text-center">{locale === "en" ? "No active sessions" : "Нет активных сессий"}</p>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div key={session.id} className={`flex items-center justify-between p-3 rounded-lg border ${session.current ? "bg-accent/5 border-accent/20" : "bg-surface-2 border-border"}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{session.device}</span>
                          {session.current && (
                            <Badge variant="low">{t("settings.sessions.current")}</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-2 mt-0.5">
                          {session.location} · IP: {session.ip} · {t("settings.sessions.lastActive")}: {session.lastActive}
                        </div>
                      </div>
                      {!session.current && (
                        <Button size="sm" variant="ghost" onClick={() => handleRevokeSession(session.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-red" />
                          {t("settings.security.terminateSession")}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ─── 13. Tokens ───────────────────────────────────────── */}
            <section id="tokens" className="p-6 rounded-xl bg-surface border border-border scroll-mt-24">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-amber" />
                  <h2 className="text-base font-semibold text-foreground">{t("settings.tokens")}</h2>
                </div>
                <Button size="sm" variant="outline" onClick={handleCreateToken}>
                  <Plus className="w-3.5 h-3.5" />
                  {t("settings.tokens.create")}
                </Button>
              </div>
              <p className="text-xs text-muted-2 mb-4">{t("settings.tokens.title")}</p>
              {tokens.length === 0 ? (
                <p className="text-sm text-muted-2 py-4 text-center">{t("settings.tokens.noTokens")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-2 border-b border-border">
                        <th className="text-left pb-2 font-medium">{t("settings.tokens.name")}</th>
                        <th className="text-left pb-2 font-medium">{t("settings.tokens.created")}</th>
                        <th className="text-left pb-2 font-medium">{t("settings.tokens.lastUsed")}</th>
                        <th className="text-left pb-2 font-medium">{t("settings.tokens.permissions")}</th>
                        <th className="text-right pb-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokens.map((token) => (
                        <tr key={token.id} className="border-b border-border/50 last:border-0">
                          <td className="py-2.5">
                            <div className="text-foreground">{token.name}</div>
                            <code className="text-xs text-muted-2 font-mono">{token.key}</code>
                          </td>
                          <td className="py-2.5 text-muted-2">{token.created}</td>
                          <td className="py-2.5 text-muted-2">{token.lastUsed}</td>
                          <td className="py-2.5">
                            <div className="flex gap-1">
                              {token.permissions.map((p) => (
                                <Badge key={p} variant={p === "admin" ? "high" : p === "write" ? "medium" : "info"}>
                                  {t(`settings.tokens.scope.${p}`)}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleCopyKey(token.key)}
                                className="p-1.5 rounded-md hover:bg-surface-3 transition-colors text-muted-2 hover:text-foreground"
                                title={t("common.copy")}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteToken(token.id)}
                                className="p-1.5 rounded-md hover:bg-surface-3 transition-colors text-muted-2 hover:text-red"
                                title={t("settings.tokens.delete")}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* ─── 14. Audit Log ────────────────────────────────────── */}
            <section id="auditLog" className="p-6 rounded-xl bg-surface border border-border scroll-mt-24">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-5 h-5 text-accent" />
                <h2 className="text-base font-semibold text-foreground">{t("settings.auditLog")}</h2>
              </div>
              <p className="text-xs text-muted-2 mb-5">{t("settings.auditLog.title")}</p>
              {auditLog.length === 0 ? (
                <p className="text-sm text-muted-2 py-4 text-center">{t("settings.auditLog.noLogs")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-2 border-b border-border">
                        <th className="text-left pb-2 font-medium">{t("settings.auditLog.action")}</th>
                        <th className="text-left pb-2 font-medium">{t("settings.auditLog.user")}</th>
                        <th className="text-left pb-2 font-medium">{t("settings.auditLog.date")}</th>
                        <th className="text-left pb-2 font-medium">{t("settings.auditLog.details")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLog.map((entry) => (
                        <tr key={entry.id} className="border-b border-border/50 last:border-0">
                          <td className="py-2.5">
                            <Badge variant={
                              entry.action.includes("delete") || entry.action.includes("revoke")
                                ? "critical"
                                : entry.action.includes("create") || entry.action.includes("generate")
                                ? "low"
                                : entry.action.includes("login")
                                ? "info"
                                : "default"
                            }>
                              {entry.action}
                            </Badge>
                          </td>
                          <td className="py-2.5 text-foreground font-mono text-xs">{entry.user}</td>
                          <td className="py-2.5 text-muted-2 whitespace-nowrap">{entry.date}</td>
                          <td className="py-2.5 text-muted-2 max-w-[200px] truncate">{entry.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </main>
        </div>
      </Container>
    </div>
  );
}
