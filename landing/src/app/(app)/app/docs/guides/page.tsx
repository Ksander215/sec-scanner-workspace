"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { useI18n } from "@/lib/i18n-context";
import { ArrowLeft } from "lucide-react";

const guides = [
  { titleKey: "docs.guides.g1.title", descKey: "docs.guides.g1.desc" },
  { titleKey: "docs.guides.g2.title", descKey: "docs.guides.g2.desc" },
  { titleKey: "docs.guides.g3.title", descKey: "docs.guides.g3.desc" },
  { titleKey: "docs.guides.g4.title", descKey: "docs.guides.g4.desc" },
  { titleKey: "docs.guides.g5.title", descKey: "docs.guides.g5.desc" },
  { titleKey: "docs.guides.g6.title", descKey: "docs.guides.g6.desc" },
  { titleKey: "docs.guides.g7.title", descKey: "docs.guides.g7.desc" },
  { titleKey: "docs.guides.g8.title", descKey: "docs.guides.g8.desc" },
];

export default function GuidesPage() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t("docs.breadcrumb.docs"), href: "/app/docs" }, { label: t("docs.guides.title") }]}
        title={t("docs.guides.title")}
        description={t("docs.guides.subtitle")}
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
          {guides.map((guide) => (
            <Card key={guide.titleKey} title={t(guide.titleKey)} description={t(guide.descKey)} />
          ))}
        </div>
      </Container>
    </>
  );
}
