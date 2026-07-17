"use client";

import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Settings as SettingsIcon, Globe, Palette, Bell, Shield, Key, Monitor } from "lucide-react";

export default function SettingsPage() {
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
                  <button className="px-3 py-1.5 text-xs font-medium rounded-md bg-accent text-background">Dark</button>
                  <button className="px-3 py-1.5 text-xs font-medium rounded-md text-muted-2">Light</button>
                  <button className="px-3 py-1.5 text-xs font-medium rounded-md text-muted-2">System</button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-foreground">Sidebar Position</div>
                  <div className="text-xs text-muted-2">Set sidebar to left or right</div>
                </div>
                <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-2 border border-border">
                  <button className="px-3 py-1.5 text-xs font-medium rounded-md bg-accent text-background">Left</button>
                  <button className="px-3 py-1.5 text-xs font-medium rounded-md text-muted-2">Right</button>
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
                <button className="px-3 py-1.5 text-xs font-medium rounded-md text-muted-2">RU</button>
                <button className="px-3 py-1.5 text-xs font-medium rounded-md bg-accent text-background">EN</button>
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
                { name: "Critical findings", enabled: true },
                { name: "Scan completed", enabled: true },
                { name: "New recommendations", enabled: true },
                { name: "Community updates", enabled: false },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-border">
                  <span className="text-sm text-foreground">{item.name}</span>
                  <button
                    role="switch"
                    aria-checked={item.enabled}
                    aria-label={`Toggle ${item.name} notifications`}
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
                <Button size="sm" variant="outline">Enable</Button>
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
              ssi_prod_****7f3a · Created Jun 1, 2026
            </div>
            <Button size="sm" variant="outline" className="mt-3">Generate New Key</Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
