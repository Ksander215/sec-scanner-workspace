import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { LayoutTemplate } from "lucide-react";

export const metadata: Metadata = {
  title: "Templates — Marketplace — Security Intelligence Platform",
  description: "Pre-built scan templates for common technology stacks.",
  openGraph: { title: "Templates — Marketplace", description: "Pre-built scan templates." },
};

const templates = [
  { name: "React SPA Full Scan", stack: "React", description: "Comprehensive scanning template for React single-page applications." },
  { name: "Spring Boot API", stack: "Java", description: "Full coverage for Spring Boot REST APIs including Actuator exposure." },
  { name: "Django Web App", stack: "Python", description: "Django-specific checks including debug mode, SECRET_KEY exposure, and CSRF." },
  { name: "Express.js API", stack: "Node.js", description: "Node.js/Express API scanning with dependency vulnerability checks." },
  { name: "Kubernetes Cluster", stack: "Infrastructure", description: "Complete K8s security assessment from pod policies to network segmentation." },
  { name: "AWS Well-Architected", stack: "Cloud", description: "AWS security review based on the Well-Architected Framework." },
];

export default function TemplatesPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Marketplace", href: "/app/marketplace" }, { label: "Templates" }]}
        title="Templates"
        description="Pre-built scan templates for common technology stacks. Get started quickly with proven configurations."
      />

      <Container className="py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tpl) => (
            <Card key={tpl.name} title={tpl.name} description={tpl.description}>
              <div className="mt-3">
                <Badge variant="category">{tpl.stack}</Badge>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-12 p-8 rounded-xl bg-surface border border-border text-center">
          <LayoutTemplate className="w-8 h-8 text-accent mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Create a Template</h3>
          <p className="text-sm text-muted-2 max-w-lg mx-auto">
            Share your scanning configuration with the community by publishing it as a reusable template.
          </p>
        </div>
      </Container>
    </>
  );
}
