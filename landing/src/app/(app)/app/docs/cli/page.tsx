"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";
import { useI18n } from "@/lib/i18n-context";
import { ArrowLeft } from "lucide-react";

const commands = [
  { cmd: "sec-scanner scan", descKey: "docs.cli.c1.desc", usage: "sec-scanner scan --target <url> [--profile <name>] [--rules <path>]" },
  { cmd: "sec-scanner init", descKey: "docs.cli.c2.desc", usage: "sec-scanner init [--name <project>]" },
  { cmd: "sec-scanner report", descKey: "docs.cli.c3.desc", usage: "sec-scanner report [--format json|pdf|html] [--scan <id>]" },
  { cmd: "sec-scanner target", descKey: "docs.cli.c4.desc", usage: "sec-scanner target [add|list|remove] [options]" },
  { cmd: "sec-scanner plugin", descKey: "docs.cli.c5.desc", usage: "sec-scanner plugin [install|list|remove] <name>" },
  { cmd: "sec-scanner config", descKey: "docs.cli.c6.desc", usage: "sec-scanner config [get|set|list] [key] [value]" },
  { cmd: "sec-scanner auth", descKey: "docs.cli.c7.desc", usage: "sec-scanner auth [login|logout|status]" },
  { cmd: "sec-scanner version", descKey: "docs.cli.c8.desc", usage: "sec-scanner version" },
];

export default function CliPage() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t("docs.breadcrumb.docs"), href: "/app/docs" }, { label: t("docs.cli.title") }]}
        title={t("docs.cli.title")}
        description={t("docs.cli.subtitle")}
      />

      <Container className="py-16">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-muted-2 hover:text-foreground transition-colors mb-8 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>{t("docs.back")}</span>
        </button>

        <div className="max-w-3xl mx-auto space-y-4">
          {commands.map((cmd) => (
            <div key={cmd.cmd} className="p-5 rounded-xl bg-surface border border-border">
              <code className="text-sm text-accent font-mono font-bold">{cmd.cmd}</code>
              <p className="mt-1 text-sm text-muted-2">{t(cmd.descKey)}</p>
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
