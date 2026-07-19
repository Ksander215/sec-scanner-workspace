"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/i18n-context";
import { ArrowLeft } from "lucide-react";

const frameworks = [
  { nameKey: "docs.comp.fw1.name", statusKey: "docs.comp.status.supported", descKey: "docs.comp.fw1.desc", statusVariant: "low" as const },
  { nameKey: "docs.comp.fw2.name", statusKey: "docs.comp.status.supported", descKey: "docs.comp.fw2.desc", statusVariant: "low" as const },
  { nameKey: "docs.comp.fw3.name", statusKey: "docs.comp.status.supported", descKey: "docs.comp.fw3.desc", statusVariant: "low" as const },
  { nameKey: "docs.comp.fw4.name", statusKey: "docs.comp.status.supported", descKey: "docs.comp.fw4.desc", statusVariant: "low" as const },
  { nameKey: "docs.comp.fw5.name", statusKey: "docs.comp.status.beta", descKey: "docs.comp.fw5.desc", statusVariant: "medium" as const },
  { nameKey: "docs.comp.fw6.name", statusKey: "docs.comp.status.beta", descKey: "docs.comp.fw6.desc", statusVariant: "medium" as const },
];

export default function CompliancePage() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t("docs.breadcrumb.docs"), href: "/app/docs" }, { label: t("docs.comp.title") }]}
        title={t("docs.comp.title")}
        description={t("docs.comp.subtitle")}
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
          {frameworks.map((fw) => (
            <div key={fw.nameKey} className="p-5 rounded-xl bg-surface border border-border flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-base font-semibold text-foreground">{t(fw.nameKey)}</h3>
                  <Badge variant={fw.statusVariant}>{t(fw.statusKey)}</Badge>
                </div>
                <p className="text-sm text-muted-2">{t(fw.descKey)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 max-w-3xl mx-auto p-6 rounded-xl bg-surface border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-3">{t("docs.comp.auditTrail")}</h3>
          <p className="text-sm text-muted-2 leading-relaxed">
            {t("docs.comp.auditTrail.desc")}
          </p>
        </div>
      </Container>
    </>
  );
}
