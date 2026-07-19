"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";
import { useI18n } from "@/lib/i18n-context";
import { ArrowLeft } from "lucide-react";

const endpoints = [
  { method: "GET", path: "/api/v1/scans", descKey: "docs.api.ep1.desc" },
  { method: "POST", path: "/api/v1/scans", descKey: "docs.api.ep2.desc" },
  { method: "GET", path: "/api/v1/scans/:id", descKey: "docs.api.ep3.desc" },
  { method: "DELETE", path: "/api/v1/scans/:id", descKey: "docs.api.ep4.desc" },
  { method: "GET", path: "/api/v1/findings", descKey: "docs.api.ep5.desc" },
  { method: "GET", path: "/api/v1/findings/:id", descKey: "docs.api.ep6.desc" },
  { method: "PATCH", path: "/api/v1/findings/:id", descKey: "docs.api.ep7.desc" },
  { method: "GET", path: "/api/v1/targets", descKey: "docs.api.ep8.desc" },
  { method: "POST", path: "/api/v1/targets", descKey: "docs.api.ep9.desc" },
  { method: "GET", path: "/api/v1/reports", descKey: "docs.api.ep10.desc" },
  { method: "POST", path: "/api/v1/graphql", descKey: "docs.api.ep11.desc" },
];

const methodColors: Record<string, string> = {
  GET: "text-accent",
  POST: "text-amber",
  PATCH: "text-cyan",
  DELETE: "text-red",
};

export default function ApiPage() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t("docs.breadcrumb.docs"), href: "/app/docs" }, { label: t("docs.api.title") }]}
        title={t("docs.api.title")}
        description={t("docs.api.subtitle")}
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

        <div className="max-w-3xl mx-auto">
          <div className="mb-8 p-4 rounded-lg bg-surface border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-2">{t("docs.api.baseUrl")}</h3>
            <code className="text-sm text-accent font-mono">https://api.sec-scanner.pro/v1</code>
            <p className="text-xs text-muted mt-2">{t("docs.api.auth")}</p>
          </div>

          <div className="space-y-2">
            {endpoints.map((ep) => (
              <div
                key={`${ep.method}-${ep.path}`}
                className="flex items-center gap-4 p-4 rounded-lg bg-surface border border-border hover:border-border-light transition-colors"
              >
                <span className={`text-xs font-mono font-bold w-14 ${methodColors[ep.method]}`}>
                  {ep.method}
                </span>
                <code className="text-sm text-foreground font-mono flex-1">{ep.path}</code>
                <span className="text-sm text-muted-2 hidden sm:block">{t(ep.descKey)}</span>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}
