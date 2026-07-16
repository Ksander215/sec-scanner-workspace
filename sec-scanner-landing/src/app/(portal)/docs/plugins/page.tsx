import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Plugin Development — Docs — Security Intelligence Platform",
  description: "Build custom plugins for the Security Intelligence Platform using the Plugin SDK.",
  openGraph: { title: "Plugin Development — Docs", description: "Plugin SDK documentation." },
};

export default function DocsPluginsPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "Plugin Development" }]}
        title="Plugin Development"
        description="Build custom scanning engines, data processors, and workflow automations with the Plugin SDK."
      />

      <Container className="py-16">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">Quick Start</h3>
            <div className="p-4 rounded-lg bg-background border border-border font-mono text-sm space-y-1">
              <div className="text-muted"># Create a new plugin project</div>
              <div className="text-accent">sec-scanner plugin init my-scanner</div>
              <div className="text-accent">cd my-scanner</div>
              <div className="mt-2 text-muted"># Implement the scan handler</div>
              <div className="text-accent">code src/handler.ts</div>
              <div className="mt-2 text-muted"># Test locally</div>
              <div className="text-accent">sec-scanner plugin test</div>
              <div className="mt-2 text-muted"># Publish to marketplace</div>
              <div className="text-accent">sec-scanner plugin publish</div>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">Plugin Structure</h3>
            <div className="font-mono text-sm text-muted-2 space-y-1">
              <div>my-scanner/</div>
              <div>├── manifest.yaml</div>
              <div>├── src/</div>
              <div>│   ├── handler.ts</div>
              <div>│   └── rules/</div>
              <div>├── tests/</div>
              <div>└── README.md</div>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">Plugin API</h3>
            <p className="text-sm text-muted-2 leading-relaxed">
              The Plugin SDK provides a typed interface for implementing scan handlers, result processors,
              and data connectors. Plugins run in a sandboxed environment with configurable permissions
              and resource limits. Full API documentation is available in the SDK reference.
            </p>
          </div>
        </div>
      </Container>
    </>
  );
}
