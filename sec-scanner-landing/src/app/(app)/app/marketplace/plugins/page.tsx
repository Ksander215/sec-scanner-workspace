import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Puzzle } from "lucide-react";

export const metadata: Metadata = {
  title: "Plugins — Marketplace — Security Intelligence Platform",
  description: "Browse and install scanning engine plugins, data processors, and workflow automation tools.",
  openGraph: { title: "Plugins — Marketplace", description: "Scanning engine plugins and extensions." },
};

const plugins = [
  { name: "OWASP ZAP Bridge", author: "Official", description: "Deep integration with OWASP ZAP for advanced web application scanning.", tags: ["dast", "official"] },
  { name: "Nuclei Engine", author: "Community", description: "Run Nuclei templates as part of your scanning pipeline with result correlation.", tags: ["dast", "community"] },
  { name: "SSL/TLS Analyzer", author: "Official", description: "Comprehensive SSL/TLS configuration analysis with grade calculation.", tags: ["infrastructure", "official"] },
  { name: "JWT Inspector", author: "Community", description: "JWT token security analysis including algorithm confusion and key injection.", tags: ["api", "community"] },
  { name: "GraphQL Explorer", author: "Official", description: "Automated GraphQL schema discovery, introspection, and mutation testing.", tags: ["api", "official"] },
  { name: "Container Scanner", author: "Official", description: "Docker and container image vulnerability scanning with CIS benchmark checks.", tags: ["infrastructure", "official"] },
];

export default function PluginsPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Marketplace", href: "/marketplace" }, { label: "Plugins" }]}
        title="Plugins"
        description="Extend the platform with custom scanning engines, data processors, and workflow automation tools."
      />

      <Container className="py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plugins.map((plugin) => (
            <Card key={plugin.name} title={plugin.name} description={plugin.description}>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant={plugin.author === "Official" ? "low" : "category"}>
                  {plugin.author}
                </Badge>
                {plugin.tags.map((tag) => (
                  <Badge key={tag} variant="category">{tag}</Badge>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-12 p-8 rounded-xl bg-surface border border-border text-center">
          <Puzzle className="w-8 h-8 text-accent mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Build Your Own Plugin</h3>
          <p className="text-sm text-muted-2 max-w-lg mx-auto mb-4">
            Use the Plugin SDK to create custom scanning engines and integrations. Publish to the marketplace for the community.
          </p>
          <a href="/app/docs/plugins" className="inline-flex items-center px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors">
            Read Plugin SDK Docs
          </a>
        </div>
      </Container>
    </>
  );
}
