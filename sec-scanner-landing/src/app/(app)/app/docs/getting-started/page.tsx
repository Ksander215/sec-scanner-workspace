"use client";

import { useRouter } from "next/navigation";
import { DocsSidebar } from "@/components/layout/DocsSidebar";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/i18n-context";
import { ArrowLeft } from "lucide-react";

const steps = [
  { step: "1", titleKey: "docs.gs.step1.title", descKey: "docs.gs.step1.desc", code: "curl -fsSL https://get.sec-scanner.pro | bash", alt: "npm install -g @sec-scanner/cli" },
  { step: "2", titleKey: "docs.gs.step2.title", descKey: "docs.gs.step2.desc", code: "sec-scanner init", alt: "sec-scanner init --project my-app" },
  { step: "3", titleKey: "docs.gs.step3.title", descKey: "docs.gs.step3.desc", code: "sec-scanner scan --target https://your-app.com", alt: "sec-scanner scan --target api.example.com --profile full" },
  { step: "4", titleKey: "docs.gs.step4.title", descKey: "docs.gs.step4.desc", code: "sec-scanner report --format json", alt: "sec-scanner report --format pdf --output report.pdf" },
];

const nextSteps = [
  { labelKey: "docs.gs.next.guides", href: "/app/docs/guides" },
  { labelKey: "docs.gs.next.api", href: "/app/docs/api" },
  { labelKey: "docs.gs.next.cli", href: "/app/docs/cli" },
  { labelKey: "docs.gs.next.marketplace", href: "/app/marketplace" },
];

export default function GettingStartedPage() {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <div className="flex min-h-[calc(100vh-7rem)]">
      <DocsSidebar />
      <div className="flex-1 py-8 px-8 max-w-3xl">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-muted-2 hover:text-foreground transition-colors mb-6 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>{t("docs.back")}</span>
        </button>

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-sm mb-4">
          <a href="/app/docs" className="text-muted hover:text-foreground transition-colors">
            {t("docs.breadcrumb.docs")}
          </a>
          <span className="text-muted">/</span>
          <span className="text-foreground font-medium">{t("docs.gs.title")}</span>
        </nav>

        <div className="mb-8">
          <Badge variant="low">{t("docs.gs.badge")}</Badge>
          <h1 className="text-3xl font-bold text-foreground mt-3">{t("docs.gs.title")}</h1>
          <p className="text-lg text-muted-2 mt-2">
            {t("docs.gs.subtitle")}
          </p>
        </div>

        <div className="space-y-8">
          {steps.map((s) => (
            <div key={s.step} className="scroll-mt-32" id={`step-${s.step}`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-full bg-accent text-background flex items-center justify-center text-sm font-bold shrink-0">
                  {s.step}
                </span>
                <h2 className="text-xl font-semibold text-foreground">{t(s.titleKey)}</h2>
              </div>
              <p className="text-sm text-muted-2 mb-3 leading-relaxed ml-11">{t(s.descKey)}</p>
              <div className="ml-11 p-4 rounded-xl bg-surface border border-border font-mono text-sm">
                <div className="text-muted">$ <span className="text-accent">{s.code}</span></div>
                {s.alt && (
                  <div className="text-muted mt-1 text-xs opacity-60"># {s.alt}</div>
                )}
              </div>
            </div>
          ))}

          <div className="p-6 rounded-xl bg-accent-muted border border-accent-border">
            <h3 className="text-base font-semibold text-accent mb-3">{t("docs.gs.nextSteps")}</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {nextSteps.map((next) => (
                <a
                  key={next.href}
                  href={next.href}
                  className="flex items-center gap-2 p-3 rounded-lg bg-surface border border-border hover:border-accent/20 transition-colors text-sm text-foreground hover:text-accent"
                >
                  → {t(next.labelKey)}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
