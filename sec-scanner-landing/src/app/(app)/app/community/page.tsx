import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { MessageCircle, Send, Code2, Map, Lightbulb } from "lucide-react";

export const metadata: Metadata = {
  title: "Community — Security Intelligence Platform",
  description: "Join the Security Intelligence Platform community — Discord, Telegram, contributing, roadmap, and feature requests.",
  openGraph: {
    title: "Community — Security Intelligence Platform",
    description: "Join the community and help shape the future of security intelligence.",
  },
};

const channels = [
  {
    icon: MessageCircle,
    title: "Discord",
    description: "Real-time discussions, support, and community events. Join 2,000+ security professionals.",
    href: "#",
    label: "Join Discord",
  },
  {
    icon: Send,
    title: "Telegram",
    description: "Russian-speaking community for discussions, announcements, and quick support.",
    href: "#",
    label: "Join Telegram",
  },
  {
    icon: Code2,
    title: "Contributing",
    description: "Start contributing to the platform. Good first issues, coding guidelines, and review process.",
    href: "/community/contributing",
    label: "Contribute",
  },
  {
    icon: Map,
    title: "Roadmap",
    description: "See what's planned next and help prioritize features by voting and discussing.",
    href: "/community/roadmap",
    label: "View Roadmap",
  },
  {
    icon: Lightbulb,
    title: "Feature Requests",
    description: "Suggest new features, vote on existing requests, and track development progress.",
    href: "/community/feature-requests",
    label: "Request Feature",
  },
];

export default function CommunityPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Community" }]}
        title="Community"
        description="Join thousands of security professionals building and improving the Security Intelligence Platform together."
      />

      <Container className="py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels.map((ch) => (
            <Card key={ch.title} icon={ch.icon} title={ch.title} description={ch.description}>
              <a
                href={ch.href}
                className="mt-4 inline-flex items-center px-3 py-1.5 text-xs font-medium bg-accent text-background rounded-md hover:bg-accent-hover transition-colors"
              >
                {ch.label}
              </a>
            </Card>
          ))}
        </div>

        <div className="mt-16 p-8 rounded-xl bg-surface border border-border text-center">
          <h2 className="text-2xl font-bold text-foreground mb-3">Open Source, Community Driven</h2>
          <p className="text-muted-2 max-w-2xl mx-auto">
            The Security Intelligence Platform is built in the open. Every feature, every fix, every decision
            is shaped by the community. Whether you code, write docs, report bugs, or just share feedback —
            you make the platform better for everyone.
          </p>
        </div>
      </Container>
    </>
  );
}
