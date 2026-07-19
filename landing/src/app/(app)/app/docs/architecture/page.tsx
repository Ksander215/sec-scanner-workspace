"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Layers, Server, Plug, ArrowRightLeft, Brain, BarChart3 } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { ArrowLeft } from "lucide-react";

const components = [
  { icon: Server, titleKey: "docs.arch.scanEngine.title", descKey: "docs.arch.scanEngine.desc" },
  { icon: ArrowRightLeft, titleKey: "docs.arch.correlationBus.title", descKey: "docs.arch.correlationBus.desc" },
  { icon: Plug, titleKey: "docs.arch.pluginRuntime.title", descKey: "docs.arch.pluginRuntime.desc" },
  { icon: Brain, titleKey: "docs.arch.mlPipeline.title", descKey: "docs.arch.mlPipeline.desc" },
  { icon: BarChart3, titleKey: "docs.arch.storageLayer.title", descKey: "docs.arch.storageLayer.desc" },
  { icon: Layers, titleKey: "docs.arch.apiGateway.title", descKey: "docs.arch.apiGateway.desc" },
];

export default function DocsArchitecturePage() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t("docs.breadcrumb.docs"), href: "/app/docs" }, { label: t("docs.arch.title") }]}
        title={t("docs.arch.title")}
        description={t("docs.arch.subtitle")}
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

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {components.map((comp) => (
            <Card key={comp.titleKey} icon={comp.icon} title={t(comp.titleKey)} description={t(comp.descKey)} />
          ))}
        </div>

        <div className="mt-12 max-w-4xl mx-auto p-6 rounded-xl bg-surface border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-3">{t("docs.arch.dataFlow")}</h3>
          <div className="font-mono text-sm text-muted-2 leading-loose">
            <div>{t("docs.arch.flow.step1")}</div>
            <div className="text-accent pl-4">{t("docs.arch.flow.step2")}</div>
            <div className="text-cyan pl-8">{t("docs.arch.flow.step3")}</div>
            <div className="text-amber pl-12">{t("docs.arch.flow.step4")}</div>
          </div>
        </div>
      </Container>
    </>
  );
}
