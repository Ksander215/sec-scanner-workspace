"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { useI18n } from "@/lib/i18n-context";
import { ArrowLeft } from "lucide-react";

const sdks = [
  {
    nameKey: "docs.sdk.python.name",
    descKey: "docs.sdk.python.desc",
    install: "pip install sec-scanner-sdk",
  },
  {
    nameKey: "docs.sdk.typescript.name",
    descKey: "docs.sdk.typescript.desc",
    install: "npm install @sec-scanner/sdk",
  },
  {
    nameKey: "docs.sdk.go.name",
    descKey: "docs.sdk.go.desc",
    install: "go get github.com/sec-scanner/go-sdk",
  },
  {
    nameKey: "docs.sdk.rust.name",
    descKey: "docs.sdk.rust.desc",
    install: 'sec-scanner-sdk = "0.9"',
  },
];

export default function SdkPage() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t("docs.breadcrumb.docs"), href: "/app/docs" }, { label: t("docs.sdk.title") }]}
        title={t("docs.sdk.title")}
        description={t("docs.sdk.subtitle")}
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
          {sdks.map((sdk) => (
            <Card key={sdk.nameKey} title={t(sdk.nameKey)} description={t(sdk.descKey)}>
              <div className="mt-4 p-3 rounded-lg bg-background border border-border">
                <code className="text-xs text-accent font-mono">{sdk.install}</code>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </>
  );
}
