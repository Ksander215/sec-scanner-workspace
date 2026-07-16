import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";
import { Terminal } from "lucide-react";

export const metadata: Metadata = {
  title: "Demo — Security Intelligence Platform",
  description: "Try the Security Intelligence Platform with an interactive demo environment. No signup required.",
  openGraph: {
    title: "Demo — Security Intelligence Platform",
    description: "Try the Security Intelligence Platform with an interactive demo.",
  },
};

export default function DemoPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Product" }, { label: "Demo" }]}
        title="Interactive Demo"
        description="Experience the platform with a pre-configured demo environment. Scan real targets, explore findings, and see the correlation engine in action."
      />

      <Container className="py-16">
        {/* Terminal mockup */}
        <div className="rounded-xl bg-surface border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <div className="w-3 h-3 rounded-full bg-red/60" />
            <div className="w-3 h-3 rounded-full bg-amber/60" />
            <div className="w-3 h-3 rounded-full bg-accent/60" />
            <span className="ml-2 text-xs text-muted font-mono">sec-scanner — demo</span>
          </div>
          <div className="p-6 font-mono text-sm leading-relaxed">
            <div className="text-muted">$ sec-scanner scan --target demo.sec-scanner.pro --profile full</div>
            <div className="mt-2 text-accent">[*] Initializing scan engine...</div>
            <div className="text-accent">[*] Target: demo.sec-scanner.pro (203.0.113.42)</div>
            <div className="text-cyan">[*] Running port discovery...</div>
            <div className="text-cyan">  → Found 4 open ports: 80, 443, 8080, 8443</div>
            <div className="text-amber">[*] Running DAST scanner...</div>
            <div className="text-amber">  → Crawling 147 endpoints...</div>
            <div className="text-amber">  → Testing for OWASP Top 10...</div>
            <div className="mt-3 text-red">[!] CRITICAL: SQL Injection in /api/v1/users?id=</div>
            <div className="text-red">[!] HIGH: XSS (Reflected) in /search?q=</div>
            <div className="text-amber">[!] MEDIUM: Missing Content-Security-Policy header</div>
            <div className="text-accent">[!] LOW: Information disclosure in /server-status</div>
            <div className="mt-3 text-accent">[*] Running correlation engine...</div>
            <div className="text-accent">  → Deduplicated 12 findings into 8 unique issues</div>
            <div className="text-accent">  → Risk score: 78/100 (HIGH)</div>
            <div className="mt-3 text-foreground">Scan complete. 8 findings (1 critical, 1 high, 4 medium, 2 low)</div>
            <div className="text-foreground">Report saved to: ./reports/demo-2024-01-15.json</div>
            <div className="mt-2 flex items-center text-muted">
              <span>$ </span>
              <span className="ml-1 w-2 h-4 bg-accent animate-blink" />
            </div>
          </div>
        </div>

        <div className="mt-12 grid sm:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-base font-semibold text-foreground mb-2">Real Scanning Engine</h3>
            <p className="text-sm text-muted-2">
              The demo runs the same scanning engine used in production. Results are generated from live analysis of our test target.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-base font-semibold text-foreground mb-2">Correlation in Action</h3>
            <p className="text-sm text-muted-2">
              See how findings from multiple scanners are deduplicated, enriched, and prioritized by the correlation engine.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-base font-semibold text-foreground mb-2">No Signup Required</h3>
            <p className="text-sm text-muted-2">
              Try the demo instantly — no account, no email, no credit card. Just open and explore the platform.
            </p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <a
            href="/app/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors"
          >
            <Terminal className="w-4 h-4" />
            Open Full Dashboard
          </a>
        </div>
      </Container>
    </>
  );
}
