"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";
import { useI18n } from "@/lib/i18n-context";
import { ArrowLeft } from "lucide-react";

export default function DocsPluginsPage() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t("docs.breadcrumb.docs"), href: "/app/docs" }, { label: t("docs.plug.title") }]}
        title={t("docs.plug.title")}
        description={t("docs.plug.subtitle")}
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

        <div className="max-w-3xl mx-auto space-y-8">
          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">{t("docs.plug.quickStart")}</h3>
            <div className="p-4 rounded-lg bg-background border border-border font-mono text-sm space-y-1">
              <div className="text-muted">{t("docs.plug.comment.create")}</div>
              <div className="text-accent">sec-scanner plugin init my-scanner</div>
              <div className="text-accent">cd my-scanner</div>
              <div className="mt-2 text-muted">{t("docs.plug.comment.implement")}</div>
              <div className="text-accent">code src/handler.ts</div>
              <div className="mt-2 text-muted">{t("docs.plug.comment.test")}</div>
              <div className="text-accent">sec-scanner plugin test</div>
              <div className="mt-2 text-muted">{t("docs.plug.comment.publish")}</div>
              <div className="text-accent">sec-scanner plugin publish</div>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">{t("docs.plug.structure")}</h3>
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
            <h3 className="text-lg font-semibold text-foreground mb-3">{t("docs.plug.pluginApi")}</h3>
            <p className="text-sm text-muted-2 leading-relaxed">
              {t("docs.plug.pluginApi.desc")}
            </p>
          </div>
        </div>
      </Container>
    </>
  );
}
