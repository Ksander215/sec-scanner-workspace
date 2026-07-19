"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";
import { useI18n } from "@/lib/i18n-context";
import { ArrowLeft } from "lucide-react";

export default function DocsSecurityPage() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t("docs.breadcrumb.docs"), href: "/app/docs" }, { label: t("docs.sec.title") }]}
        title={t("docs.sec.title")}
        description={t("docs.sec.subtitle")}
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
            <h3 className="text-lg font-semibold text-foreground mb-3">{t("docs.sec.disclosure")}</h3>
            <p className="text-sm text-muted-2 leading-relaxed">
              {t("docs.sec.disclosure.desc")}{" "}
              <a href="mailto:security@sec-scanner.pro" className="text-accent hover:underline">security@sec-scanner.pro</a>.{" "}
              {t("docs.sec.disclosure.commitment")}
            </p>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">{t("docs.sec.hardening")}</h3>
            <ul className="space-y-2 text-sm text-muted-2">
              <li className="flex items-start gap-2"><span className="text-accent">•</span> {t("docs.sec.hardening.1")}</li>
              <li className="flex items-start gap-2"><span className="text-accent">•</span> {t("docs.sec.hardening.2")}</li>
              <li className="flex items-start gap-2"><span className="text-accent">•</span> {t("docs.sec.hardening.3")}</li>
              <li className="flex items-start gap-2"><span className="text-accent">•</span> {t("docs.sec.hardening.4")}</li>
              <li className="flex items-start gap-2"><span className="text-accent">•</span> {t("docs.sec.hardening.5")}</li>
              <li className="flex items-start gap-2"><span className="text-accent">•</span> {t("docs.sec.hardening.6")}</li>
            </ul>
          </div>

          <div className="p-6 rounded-xl bg-surface border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-3">{t("docs.sec.dataSecurity")}</h3>
            <p className="text-sm text-muted-2 leading-relaxed">
              {t("docs.sec.dataSecurity.desc")}
            </p>
          </div>
        </div>
      </Container>
    </>
  );
}
