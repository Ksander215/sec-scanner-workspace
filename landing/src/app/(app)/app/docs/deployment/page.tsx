"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Box, Cloud, Server } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { ArrowLeft } from "lucide-react";

const options = [
  {
    icon: Box,
    titleKey: "docs.deploy.docker.title",
    descKey: "docs.deploy.docker.desc",
    tagKey: "docs.deploy.docker.tag",
  },
  {
    icon: Server,
    titleKey: "docs.deploy.k8s.title",
    descKey: "docs.deploy.k8s.desc",
    tagKey: "docs.deploy.k8s.tag",
  },
  {
    icon: Cloud,
    titleKey: "docs.deploy.cloud.title",
    descKey: "docs.deploy.cloud.desc",
    tagKey: "docs.deploy.cloud.tag",
  },
];

export default function DeploymentPage() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t("docs.breadcrumb.docs"), href: "/app/docs" }, { label: t("docs.deploy.title") }]}
        title={t("docs.deploy.title")}
        description={t("docs.deploy.subtitle")}
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

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {options.map((opt) => (
            <Card key={opt.titleKey} icon={opt.icon} title={t(opt.titleKey)} description={t(opt.descKey)}>
              <div className="mt-3">
                <Badge variant="info">{t(opt.tagKey)}</Badge>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-12 max-w-3xl mx-auto p-6 rounded-xl bg-surface border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-3">{t("docs.deploy.quickStart")}</h3>
          <div className="p-4 rounded-lg bg-background border border-border font-mono text-sm space-y-2">
            <div className="text-muted">{t("docs.deploy.comment.clone")}</div>
            <div className="text-accent">git clone https://github.com/Ksander215/sec-scanner-workspace</div>
            <div className="text-accent">cd sec-scanner-workspace</div>
            <div className="mt-2 text-muted">{t("docs.deploy.comment.start")}</div>
            <div className="text-accent">docker compose up -d</div>
            <div className="mt-2 text-muted">{t("docs.deploy.comment.access")}</div>
            <div className="text-foreground">open http://localhost:3000</div>
          </div>
        </div>
      </Container>
    </>
  );
}
