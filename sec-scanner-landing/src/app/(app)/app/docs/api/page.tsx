import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "API Reference — Docs — Security Intelligence Platform",
  description: "REST and GraphQL API documentation with request/response examples.",
  openGraph: { title: "API Reference — Docs", description: "REST and GraphQL API docs." },
};

const endpoints = [
  { method: "GET", path: "/api/v1/scans", description: "List all scans with filtering and pagination" },
  { method: "POST", path: "/api/v1/scans", description: "Create and start a new scan" },
  { method: "GET", path: "/api/v1/scans/:id", description: "Get scan details and status" },
  { method: "DELETE", path: "/api/v1/scans/:id", description: "Cancel or delete a scan" },
  { method: "GET", path: "/api/v1/findings", description: "List findings across all scans" },
  { method: "GET", path: "/api/v1/findings/:id", description: "Get finding details with remediation" },
  { method: "PATCH", path: "/api/v1/findings/:id", description: "Update finding status (accept, reject, remediate)" },
  { method: "GET", path: "/api/v1/targets", description: "List configured targets" },
  { method: "POST", path: "/api/v1/targets", description: "Add a new scanning target" },
  { method: "GET", path: "/api/v1/reports", description: "List and download generated reports" },
  { method: "POST", path: "/api/v1/graphql", description: "GraphQL endpoint for flexible queries" },
];

const methodColors: Record<string, string> = {
  GET: "text-accent",
  POST: "text-amber",
  PATCH: "text-cyan",
  DELETE: "text-red",
};

export default function ApiPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Docs", href: "/docs" }, { label: "API Reference" }]}
        title="API Reference"
        description="REST and GraphQL API documentation with request/response examples and authentication guides."
      />

      <Container className="py-16">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 p-4 rounded-lg bg-surface border border-border">
            <h3 className="text-sm font-semibold text-foreground mb-2">Base URL</h3>
            <code className="text-sm text-accent font-mono">https://api.sec-scanner.pro/v1</code>
            <p className="text-xs text-muted mt-2">Authentication via Bearer token in the Authorization header.</p>
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
                <span className="text-sm text-muted-2 hidden sm:block">{ep.description}</span>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}
