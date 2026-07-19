"use client";

import { useI18n } from "@/lib/i18n-context";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Send, MessageCircle, GitBranch, Map, Lightbulb, Users } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface Channel {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  membersKey: string;
  ctaKey: string;
  href: string;
  external?: boolean;
}

const channels: Channel[] = [
  {
    icon: Send,
    titleKey: "community.telegram",
    descKey: "community.telegram.desc",
    membersKey: "community.telegram.members",
    ctaKey: "community.telegram.cta",
    href: "https://t.me/sip_security_platform",
    external: true,
  },
  {
    icon: MessageCircle,
    titleKey: "community.discord",
    descKey: "community.discord.desc",
    membersKey: "community.discord.members",
    ctaKey: "community.discord.cta",
    href: "https://discord.gg/sip-security",
    external: true,
  },
  {
    icon: GitBranch,
    titleKey: "community.github",
    descKey: "community.github.desc",
    membersKey: "community.github.members",
    ctaKey: "community.github.cta",
    href: "https://github.com/Ksander215/sec-scanner-workspace",
    external: true,
  },
  {
    icon: Map,
    titleKey: "community.roadmap",
    descKey: "community.roadmap.desc",
    membersKey: "community.roadmap.members",
    ctaKey: "community.roadmap.cta",
    href: "/app/community/roadmap",
  },
  {
    icon: Lightbulb,
    titleKey: "community.contributing",
    descKey: "community.contributing.desc",
    membersKey: "community.contributing.members",
    ctaKey: "community.contributing.cta",
    href: "/app/community/contributing",
  },
  {
    icon: Lightbulb,
    titleKey: "community.featureRequests",
    descKey: "community.featureRequests.desc",
    membersKey: "community.featureRequests.members",
    ctaKey: "community.featureRequests.cta",
    href: "/app/community/feature-requests",
  },
];

export default function CommunityPage() {
  const { t } = useI18n();

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: t("community.title") }]}
        title={t("community.title")}
        description={t("community.subtitle")}
      />

      <Container className="py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map((ch) => {
            const Icon = ch.icon;
            return (
              <Card key={ch.titleKey} icon={Icon} title={t(ch.titleKey)} description={t(ch.descKey)}>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-2">
                  <Users className="w-3.5 h-3.5" />
                  <span>{t(ch.membersKey)}</span>
                </div>
                <div className="mt-4">
                  {ch.external ? (
                    <a
                      href={ch.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-accent text-background rounded-md hover:bg-accent-hover transition-colors"
                    >
                      {t(ch.ctaKey)}
                    </a>
                  ) : (
                    <Link
                      href={ch.href}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium bg-accent text-background rounded-md hover:bg-accent-hover transition-colors"
                    >
                      {t(ch.ctaKey)}
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Open Source Banner */}
        <div className="mt-16 p-8 sm:p-10 rounded-xl bg-surface border border-border text-center">
          <div className="w-12 h-12 rounded-xl bg-accent-muted flex items-center justify-center mx-auto mb-5">
            <GitBranch className="w-6 h-6 text-accent" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            {t("community.opensource.title")}
          </h2>
          <p className="text-muted-2 max-w-2xl mx-auto mb-6">
            {t("community.opensource.subtitle")}
          </p>
          <Link
            href="/app/community/contributing"
            className="inline-flex items-center px-5 py-2.5 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors"
          >
            {t("community.opensource.cta")}
          </Link>
        </div>
      </Container>
    </>
  );
}
