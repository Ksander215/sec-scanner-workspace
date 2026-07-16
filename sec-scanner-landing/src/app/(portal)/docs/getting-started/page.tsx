import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Getting Started — Docs — Security Intelligence Platform",
  description: "Install, configure, and run your first scan in under 5 minutes.",
  openGraph: { title: "Getting Started — Docs", description: "Quick start guide." },
};

const steps = [
  { step: "1", title: "Install", code: "curl -fsSL https://get.sec-scanner.pro | bash", description: "Install the CLI with a single command. Available for macOS, Linux, and Windows (WSL)." },
  { step: "2", title: "Initialize", code: "sec-scanner init", description: "Create your first project and configure scanning targets." },
  { step: "3", title: "Scan", code: "sec-scanner scan --target https://your-app.com", description: "Run your first security scan against a target URL." },
  { step: "4", title: "Review", code: "sec-scanner report --format json", description: "View findings, risk scores, and remediation guidance." },
];

export default function GettingStartedPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Getting Started" }]}
        title="Getting Started"
        description="Get up and running with the Security Intelligence Platform in under 5 minutes."
      />

      <Container className="py-16">
        <div className="max-w-3xl mx-auto space-y-8">
          {steps.map((s) => (
            <div key={s.step} className="p-6 rounded-xl bg-surface border border-border">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-full bg-accent text-background flex items-center justify-center text-sm font-bold">
                  {s.step}
                </span>
                <h3 className="text-lg font-semibold text-foreground">{s.title}</h3>
              </div>
              <p className="text-sm text-muted-2 mb-3">{s.description}</p>
              <div className="p-3 rounded-lg bg-background font-mono text-sm text-accent border border-border">
                $ {s.code}
              </div>
            </div>
          ))}

          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-2">Next Steps</h3>
            <ul className="space-y-2 text-sm text-muted-2">
              <li>→ <a href="/docs/guides" className="text-accent hover:underline">Follow the step-by-step guides</a></li>
              <li>→ <a href="/docs/api" className="text-accent hover:underline">Explore the API reference</a></li>
              <li>→ <a href="/docs/cli" className="text-accent hover:underline">Learn CLI commands</a></li>
              <li>→ <a href="/marketplace" className="text-accent hover:underline">Browse the marketplace</a></li>
            </ul>
          </div>
        </div>
      </Container>
    </>
  );
}
