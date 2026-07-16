import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "CLI — Docs — Security Intelligence Platform",
  description: "Command-line interface reference for the Security Intelligence Platform.",
  openGraph: { title: "CLI — Docs", description: "CLI reference." },
};

const commands = [
  { cmd: "sec-scanner scan", desc: "Run a security scan against one or more targets", usage: "sec-scanner scan --target <url> [--profile <name>] [--rules <path>]" },
  { cmd: "sec-scanner init", desc: "Initialize a new project configuration", usage: "sec-scanner init [--name <project>]" },
  { cmd: "sec-scanner report", desc: "Generate or view scan reports", usage: "sec-scanner report [--format json|pdf|html] [--scan <id>]" },
  { cmd: "sec-scanner target", desc: "Manage scanning targets", usage: "sec-scanner target [add|list|remove] [options]" },
  { cmd: "sec-scanner plugin", desc: "Install, update, or remove plugins", usage: "sec-scanner plugin [install|list|remove] <name>" },
  { cmd: "sec-scanner config", desc: "View and modify configuration", usage: "sec-scanner config [get|set|list] [key] [value]" },
  { cmd: "sec-scanner auth", desc: "Authentication management", usage: "sec-scanner auth [login|logout|status]" },
  { cmd: "sec-scanner version", desc: "Show version information", usage: "sec-scanner version" },
];

export default function CliPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "CLI" }]}
        title="CLI Reference"
        description="Complete command-line interface reference for the Security Intelligence Platform."
      />

      <Container className="py-16">
        <div className="max-w-3xl mx-auto space-y-4">
          {commands.map((cmd) => (
            <div key={cmd.cmd} className="p-5 rounded-xl bg-surface border border-border">
              <code className="text-sm text-accent font-mono font-bold">{cmd.cmd}</code>
              <p className="mt-1 text-sm text-muted-2">{cmd.desc}</p>
              <div className="mt-2 p-2 rounded bg-background border border-border font-mono text-xs text-muted">
                $ {cmd.usage}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </>
  );
}
