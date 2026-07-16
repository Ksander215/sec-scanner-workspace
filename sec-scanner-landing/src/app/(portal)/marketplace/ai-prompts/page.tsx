import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "AI Prompts — Marketplace — Security Intelligence Platform",
  description: "Curated AI prompt templates for vulnerability analysis, report writing, and remediation guidance.",
  openGraph: { title: "AI Prompts — Marketplace", description: "AI prompt templates." },
};

const prompts = [
  { name: "Vulnerability Triage", category: "Analysis", description: "Pre-configured prompts for AI-assisted finding classification and severity assessment." },
  { name: "Remediation Advisor", category: "Remediation", description: "Generate step-by-step remediation guidance with code examples for common vulnerabilities." },
  { name: "Report Summarizer", category: "Reporting", description: "Condense lengthy scan reports into executive summaries with actionable recommendations." },
  { name: "Threat Modeling", category: "Analysis", description: "AI-powered threat modeling prompts for architecture review and attack surface analysis." },
  { name: "Compliance Narrator", category: "Compliance", description: "Generate compliance gap explanations and remediation narratives for auditors." },
  { name: "Code Reviewer", category: "Remediation", description: "Context-aware code review prompts that identify security patterns and anti-patterns." },
];

export default function AiPromptsPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Marketplace", href: "/marketplace" }, { label: "AI Prompts" }]}
        title="AI Prompts"
        description="Curated prompt templates for AI-assisted vulnerability analysis, remediation, and reporting."
      />

      <Container className="py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prompts.map((prompt) => (
            <Card key={prompt.name} title={prompt.name} description={prompt.description}>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="info">AI</Badge>
                <Badge variant="category">{prompt.category}</Badge>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-12 p-8 rounded-xl bg-surface border border-border text-center">
          <Sparkles className="w-8 h-8 text-accent mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Custom AI Prompts</h3>
          <p className="text-sm text-muted-2 max-w-lg mx-auto">
            Create and share your own prompt templates. The platform supports OpenAI, Anthropic, and local LLM providers.
          </p>
        </div>
      </Container>
    </>
  );
}
