"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Store, Upload, DollarSign, BarChart3, PackageCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { ArrowLeft } from "lucide-react";

const topics = [
  { icon: Store, titleKey: "docs.mp.browsing.title", descKey: "docs.mp.browsing.desc" },
  { icon: Upload, titleKey: "docs.mp.publishing.title", descKey: "docs.mp.publishing.desc" },
  { icon: PackageCheck, titleKey: "docs.mp.review.title", descKey: "docs.mp.review.desc" },
  { icon: BarChart3, titleKey: "docs.mp.analytics.title", descKey: "docs.mp.analytics.desc" },
  { icon: DollarSign, titleKey: "docs.mp.monetization.title", descKey: "docs.mp.monetization.desc" },
];

export default function DocsMarketplacePage() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t("docs.breadcrumb.docs"), href: "/app/docs" }, { label: t("docs.mp.title") }]}
        title={t("docs.mp.title")}
        description={t("docs.mp.subtitle")}
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
          {topics.map((topic) => (
            <Card key={topic.titleKey} icon={topic.icon} title={t(topic.titleKey)} description={t(topic.descKey)} />
          ))}
        </div>
      </Container>
    </>
  );
}
