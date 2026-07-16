import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Contributing — Community — Security Intelligence Platform",
  description: "Learn how to contribute to the Security Intelligence Platform — code, docs, testing, and more.",
  openGraph: { title: "Contributing — Community", description: "How to contribute." },
};

export default function ContributingPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Community", href: "/community" }, { label: "Contributing" }]}
        title="Contributing"
        description="We welcome contributions from everyone — code, documentation, testing, design, and ideas."
      />

      <Container className="py-16">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">Getting Started</h3>
            <ol className="space-y-2 text-sm text-muted-2 list-decimal list-inside">
              <li>Fork the repository on GitHub</li>
              <li>Create a feature branch from <code className="text-accent font-mono">main</code></li>
              <li>Make your changes with tests</li>
              <li>Submit a pull request with a clear description</li>
              <li>Address review feedback and iterate</li>
            </ol>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">Ways to Contribute</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-surface-2 border border-border">
                <h4 className="text-sm font-semibold text-foreground mb-1">Code</h4>
                <p className="text-xs text-muted-2">Fix bugs, implement features, or build plugins. Check &quot;good first issue&quot; labels.</p>
              </div>
              <div className="p-4 rounded-lg bg-surface-2 border border-border">
                <h4 className="text-sm font-semibold text-foreground mb-1">Documentation</h4>
                <p className="text-xs text-muted-2">Improve guides, fix typos, write tutorials, or translate content.</p>
              </div>
              <div className="p-4 rounded-lg bg-surface-2 border border-border">
                <h4 className="text-sm font-semibold text-foreground mb-1">Testing</h4>
                <p className="text-xs text-muted-2">Report bugs, test pre-releases, and write automated tests.</p>
              </div>
              <div className="p-4 rounded-lg bg-surface-2 border border-border">
                <h4 className="text-sm font-semibold text-foreground mb-1">Community</h4>
                <p className="text-xs text-muted-2">Help others in Discord/Telegram, share use cases, review PRs.</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">Code of Conduct</h3>
            <p className="text-sm text-muted-2 leading-relaxed">
              We are committed to providing a welcoming and inclusive experience for everyone. Please read our
              Code of Conduct before participating. Be respectful, constructive, and supportive in all interactions.
            </p>
          </div>
        </div>
      </Container>
    </>
  );
}
