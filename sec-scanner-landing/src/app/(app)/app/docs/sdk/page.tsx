import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "SDK — Docs — Security Intelligence Platform",
  description: "Language SDKs for Python, TypeScript, Go, and Rust to integrate with the platform programmatically.",
  openGraph: { title: "SDK — Docs", description: "Language SDKs." },
};

const sdks = [
  {
    name: "Python SDK",
    lang: "python",
    description: "Full-featured Python SDK with async support, type hints, and Jupyter integration.",
    install: "pip install sec-scanner-sdk",
  },
  {
    name: "TypeScript SDK",
    lang: "typescript",
    description: "Node.js and browser-compatible TypeScript SDK with full API coverage.",
    install: "npm install @sec-scanner/sdk",
  },
  {
    name: "Go SDK",
    lang: "go",
    description: "Idiomatic Go client with context support and streaming responses.",
    install: "go get github.com/sec-scanner/go-sdk",
  },
  {
    name: "Rust SDK",
    lang: "rust",
    description: "Async Rust client with Tokio support and zero-copy deserialization.",
    install: 'sec-scanner-sdk = "0.9"',
  },
];

export default function SdkPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "SDK" }]}
        title="SDK"
        description="Official language SDKs for programmatic access to the Security Intelligence Platform."
      />

      <Container className="py-16">
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {sdks.map((sdk) => (
            <Card key={sdk.name} title={sdk.name} description={sdk.description}>
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
