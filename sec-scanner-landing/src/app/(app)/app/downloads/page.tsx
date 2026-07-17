"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Download,
  Terminal,
  Container as ContainerIcon,
  Ship,
  Code,
  Puzzle,
  Monitor,
  CheckCircle2,
  Copy,
  Apple,
  MonitorSmartphone,
} from "lucide-react";

function InstallCommand({ command, label }: { command: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-surface-2 border border-border font-mono text-xs text-foreground">
      <span className="text-muted">$</span>
      <span className="flex-1">{command}</span>
      <button onClick={handleCopy} className="text-muted hover:text-foreground transition-colors">
        {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export default function DownloadCenterPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Download className="w-5 h-5 text-accent" />
            Download Center
          </h1>
          <p className="text-sm text-muted-2 mt-1">Get started with Security Intelligence Platform — install, deploy, and integrate</p>
        </div>
      </div>

      <Container className="py-8">
        {/* Community Edition — Hero */}
        <div className="p-8 rounded-2xl bg-surface border border-accent/20 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <Badge variant="low">Free & Open Source</Badge>
              <Badge variant="info">v1.0.0</Badge>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Community Edition</h2>
            <p className="text-sm text-muted-2 max-w-2xl mb-6">
              Full security scanning platform with DAST, SAST, API testing, and knowledge graph. Self-hosted, no limits, no credit card required. Includes all core scanning engines and the correlation pipeline.
            </p>
            <div className="space-y-2 max-w-lg">
              <InstallCommand command="curl -fsSL https://get.sec-scanner.pro | sh" label="Quick Install" />
              <InstallCommand command="docker run -p 8080:8080 secscanner/platform:latest" label="Docker" />
            </div>
          </div>
        </div>

        {/* Installation options grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[
            {
              icon: Terminal,
              title: "CLI Tools",
              description: "Command-line interface for scanning, reporting, and pipeline management. Works on macOS, Linux, and WSL.",
              commands: [
                "npm install -g @sec-scanner/cli",
                "sec-scanner scan --target example.com",
              ],
              badge: "Recommended",
            },
            {
              icon: ContainerIcon,
              title: "Docker Image",
              description: "Pre-built Docker image for quick deployment. Includes all engines and the web dashboard.",
              commands: [
                "docker pull secscanner/platform:latest",
                "docker compose up -d",
              ],
              badge: null,
            },
            {
              icon: Ship,
              title: "Helm Chart",
              description: "Kubernetes deployment with Helm. Supports production-grade setup with autoscaling and persistence.",
              commands: [
                "helm repo add sec-scanner https://charts.sec-scanner.pro",
                "helm install sec-scanner sec-scanner/platform",
              ],
              badge: null,
            },
            {
              icon: Code,
              title: "SDK / Library",
              description: "TypeScript/Node.js SDK for programmatic access. Integrate scanning into your CI/CD and applications.",
              commands: [
                "npm install @sec-scanner/sdk",
                "import { Scanner } from '@sec-scanner/sdk'",
              ],
              badge: "New",
            },
            {
              icon: Puzzle,
              title: "VS Code Extension",
              description: "Real-time security feedback directly in your editor. Findings highlighted in-code with quick-fix suggestions.",
              commands: [
                "code --install-extension sec-scanner.vscode-security",
              ],
              badge: null,
            },
            {
              icon: Monitor,
              title: "Enterprise Trial",
              description: "30-day full-featured enterprise trial with SSO, RBAC, priority support, and advanced compliance modules.",
              commands: [
                "sec-scanner enterprise trial --email you@company.com",
              ],
              badge: "Trial",
            },
          ].map((option) => (
            <div key={option.title} className="p-5 rounded-xl bg-surface border border-border hover:border-border-light transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center">
                  <option.icon className="w-5 h-5 text-accent" />
                </div>
                {option.badge && <Badge variant={option.badge === "New" ? "info" : option.badge === "Trial" ? "medium" : "low"}>{option.badge}</Badge>}
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1.5">{option.title}</h3>
              <p className="text-xs text-muted-2 leading-relaxed mb-4">{option.description}</p>
              <div className="space-y-2">
                {option.commands.map((cmd, i) => (
                  <InstallCommand key={i} command={cmd} label={`${option.title} ${i + 1}`} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Platform support */}
        <div className="p-6 rounded-xl bg-surface border border-border">
          <h3 className="text-sm font-semibold text-foreground mb-4">Platform Support</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { name: "macOS", icon: Apple, arch: "Apple Silicon + Intel" },
              { name: "Linux", icon: Terminal, arch: "x86_64 + ARM64" },
              { name: "Windows", icon: MonitorSmartphone, arch: "WSL2 + Native" },
              { name: "Docker", icon: ContainerIcon, arch: "All platforms" },
            ].map((platform) => (
              <div key={platform.name} className="p-3 rounded-lg bg-surface-2 border border-border text-center">
                <platform.icon className="w-6 h-6 text-muted mx-auto mb-2" />
                <div className="text-sm font-medium text-foreground">{platform.name}</div>
                <div className="text-xs text-muted-2">{platform.arch}</div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
}
