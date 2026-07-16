import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Blog — Security Intelligence Platform",
  description: "Latest news, technical articles, and insights from the Security Intelligence Platform team.",
  openGraph: {
    title: "Blog — Security Intelligence Platform",
    description: "News, articles, and insights.",
  },
};

const posts = [
  {
    title: "Introducing AI-Powered False Positive Reduction",
    excerpt: "How we trained an on-device ML model to reduce false positives by 73% without sending data to the cloud.",
    date: "Jan 15, 2025",
    tag: "AI",
  },
  {
    title: "OWASP Top 10 2024: What Changed and Why It Matters",
    excerpt: "A deep dive into the updates in OWASP Top 10 2024 and how our detection rules cover the new categories.",
    date: "Dec 20, 2024",
    tag: "Security",
  },
  {
    title: "Building a Plugin from Scratch: A Step-by-Step Guide",
    excerpt: "Walk through creating a custom scanning plugin with the SDK, from idea to marketplace publication.",
    date: "Nov 15, 2024",
    tag: "Tutorial",
  },
  {
    title: "Correlation Engine Deep Dive",
    excerpt: "How the correlation bus deduplicates findings, enriches data, and computes risk scores in real time.",
    date: "Oct 8, 2024",
    tag: "Engineering",
  },
  {
    title: "Community Spotlight: Top Contributed Rules of Q3",
    excerpt: "Highlighting the best community-contributed detection rules and the stories behind them.",
    date: "Sep 30, 2024",
    tag: "Community",
  },
  {
    title: "PCI DSS 4.0 Compliance Made Easier",
    excerpt: "How the platform automates PCI DSS 4.0 compliance monitoring and generates audit-ready evidence.",
    date: "Sep 15, 2024",
    tag: "Compliance",
  },
];

const tagVariant: Record<string, "info" | "low" | "medium" | "high" | "category"> = {
  AI: "info",
  Security: "high",
  Tutorial: "low",
  Engineering: "medium",
  Community: "category",
  Compliance: "medium",
};

export default function BlogPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Blog" }]}
        title="Blog"
        description="Latest news, technical deep dives, and community stories from the Security Intelligence Platform."
      />

      <Container className="py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Card key={post.title} title={post.title} description={post.excerpt}>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant={tagVariant[post.tag]}>{post.tag}</Badge>
                <span className="text-xs text-muted">{post.date}</span>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </>
  );
}
