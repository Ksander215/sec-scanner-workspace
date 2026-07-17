"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useI18n } from "@/lib/i18n-context";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Settings as SettingsIcon, Globe, Palette, Bell, Shield, Key, Monitor, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [sidebarPos, setSidebarPos] = useState<"left" | "right">("left");
  const [notifications, setNotifications] = useState({
    criticalFindings: true,
    scanCompleted: true,
    newRecommendations: true,
    communityUpdates: false,
  });
  const [show2FA, setShow2FA] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyGenerated, setApiKeyGenerated] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerateKey = () => {
    setApiKeyGenerated(true);
    setTimeout(() => setApiKeyGenerated(false), 3000);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-[calc(100vh-7rem)]">
      <Container className="py-8 max-w-3xl">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3 mb-8">
          <SettingsIcon className="w-6 h-6 text-accent" />
          Settings
        </h1>

        <div className="space-y-6">
          {/* Appearance */}
          <div className="p-6 rounded-xl bg-surface border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Palette className="w-5 h-5 text-purple" />
              <h2 className="text-base font-semibold text-foreground">Appearance</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-foreground">Theme</div>
                  <div className="text-xs text-muted-2">Choose your preferred color scheme</div>
                </div>
                <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-2 border border-border">
                  {(["dark", "light", "system"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        theme === t ? "bg-accent text-background" : "text-muted-2 hover:text-foreground"
                      }`}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-foreground">Sidebar Position</div>
                  <div className="text-xs text-muted-2">Set sidebar to left or right</div>
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
          </div>

          {/* Language */}
          <div className="p-6 rounded-xl bg-surface border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-5 h-5 text-cyan" />
              <h2 className="text-base font-semibold text-foreground">Language & Region</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground">Interface Language</div>
                <div className="text-xs text-muted-2">Change the display language</div>
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
          </div>

          {/* Notifications */}
          <div className="p-6 rounded-xl bg-surface border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-5 h-5 text-amber" />
              <h2 className="text-base font-semibold text-foreground">Notifications</h2>
            </div>
            <div className="space-y-3">
              {[
                { key: "criticalFindings" as const, name: "Critical findings", enabled: notifications.criticalFindings },
                { key: "scanCompleted" as const, name: "Scan completed", enabled: notifications.scanCompleted },
                { key: "newRecommendations" as const, name: "New recommendations", enabled: notifications.newRecommendations },
                { key: "communityUpdates" as const, name: "Community updates", enabled: notifications.communityUpdates },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-border">
                  <span className="text-sm text-foreground">{item.name}</span>
                  <button
                    role="switch"
                    aria-checked={item.enabled}
                    aria-label={`Toggle ${item.name} notifications`}
                    onClick={() => toggleNotification(item.key)}
                    className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${item.enabled ? "bg-accent/20" : "bg-surface-3"}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${item.enabled ? "right-0.5 bg-accent" : "left-0.5 bg-muted"}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Security */}
          <div className="p-6 rounded-xl bg-surface border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-red" />
              <h2 className="text-base font-semibold text-foreground">Security</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-border">
                <div>
                  <div className="text-sm text-foreground">Two-Factor Authentication</div>
                  <div className="text-xs text-muted-2">Add an extra layer of security</div>
                </div>
                {show2FA ? (
                  <Badge variant="low">Enabled</Badge>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setShow2FA(true)}>
                    Enable
                  </Button>
                )}
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-border">
                <div>
                  <div className="text-sm text-foreground">Active Sessions</div>
                  <div className="text-xs text-muted-2">Manage your logged-in devices</div>
                </div>
                <Badge variant="info">1 active</Badge>
              </div>
            </div>
          </div>

          {/* API Keys */}
          <div className="p-6 rounded-xl bg-surface border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Key className="w-5 h-5 text-accent" />
              <h2 className="text-base font-semibold text-foreground">API Keys</h2>
            </div>
            <div className="p-3 rounded-lg bg-surface-2 border border-border font-mono text-xs text-muted-2">
              {apiKeyGenerated ? (
                <span className="text-accent">ssi_prod_****{Math.random().toString(36).slice(2, 6)} · Just now</span>
              ) : (
                <span>ssi_prod_****7f3a · Created Jun 1, 2026</span>
              )}
            </div>
            <Button size="sm" variant="outline" className="mt-3" onClick={handleGenerateKey}>
              {apiKeyGenerated ? (
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" /> Generated</span>
              ) : (
                "Generate New Key"
              )}
            </Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
