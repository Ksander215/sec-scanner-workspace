"use client";

import { DocsSidebar } from "@/components/layout/DocsSidebar";
import { Badge } from "@/components/ui/Badge";

const steps = [
  { step: "1", title: "Install", code: "curl -fsSL https://get.sec-scanner.pro | bash", description: "Install the CLI with a single command. Available for macOS, Linux, and Windows (WSL). Docker and Helm also available.", alt: "npm install -g @sec-scanner/cli" },
  { step: "2", title: "Initialize", code: "sec-scanner init", description: "Create your first project, configure scanning targets, and set up notification channels.", alt: "sec-scanner init --project my-app" },
  { step: "3", title: "Scan", code: "sec-scanner scan --target https://your-app.com", description: "Run your first security scan against a target URL. Supports DAST, SAST, API, and infrastructure scanning.", alt: "sec-scanner scan --target api.example.com --profile full" },
  { step: "4", title: "Review", code: "sec-scanner report --format json", description: "View findings, risk scores, and remediation guidance. Export to PDF, SARIF, or integrate with your tools.", alt: "sec-scanner report --format pdf --output report.pdf" },
];

export default function GettingStartedPage() {
  return (
    <div className="flex min-h-[calc(100vh-7rem)]">
      <DocsSidebar />
      <div className="flex-1 py-8 px-8 max-w-3xl">
        <div className="mb-8">
          <Badge variant="low">5 min read</Badge>
          <h1 className="text-3xl font-bold text-foreground mt-3">Getting Started</h1>
          <p className="text-lg text-muted-2 mt-2">
            Get up and running with the Security Intelligence Platform in under 5 minutes.
          </p>
        </div>

        <div className="space-y-8">
          {steps.map((s) => (
            <div key={s.step} className="scroll-mt-32" id={`step-${s.step}`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-full bg-accent text-background flex items-center justify-center text-sm font-bold shrink-0">
                  {s.step}
                </span>
                <h2 className="text-xl font-semibold text-foreground">{s.title}</h2>
              </div>
              <p className="text-sm text-muted-2 mb-3 leading-relaxed ml-11">{s.description}</p>
              <div className="ml-11 p-4 rounded-xl bg-surface border border-border font-mono text-sm">
                <div className="text-muted">$ <span className="text-accent">{s.code}</span></div>
                {s.alt && (
                  <div className="text-muted mt-1 text-xs opacity-60"># {s.alt}</div>
                )}
              </div>
            </div>
          ))}

          <div className="p-6 rounded-xl bg-accent-muted border border-accent-border">
            <h3 className="text-base font-semibold text-accent mb-3">Next Steps</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { label: "Step-by-step Guides", href: "/docs/guides" },
                { label: "API Reference", href: "/docs/api" },
                { label: "CLI Commands", href: "/docs/cli" },
                { label: "Browse Marketplace", href: "/marketplace" },
              ].map((next) => (
                <a
                  key={next.href}
                  href={next.href}
                  className="flex items-center gap-2 p-3 rounded-lg bg-surface border border-border hover:border-accent/20 transition-colors text-sm text-foreground hover:text-accent"
                >
                  → {next.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
