import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";

export const metadata: Metadata = {
  title: "Feature Requests — Community — Security Intelligence Platform",
  description: "Suggest new features, vote on existing requests, and track development progress.",
  openGraph: { title: "Feature Requests — Community", description: "Suggest and vote on features." },
};

const requests = [
  { title: "WebSocket scanning support", votes: 47, status: "Under Review" },
  { title: "Terraform plan scanning", votes: 38, status: "Planned" },
  { title: "SAML SSO integration", votes: 31, status: "In Progress" },
  { title: "Dark/light theme auto-switch", votes: 24, status: "Completed" },
  { title: "Mobile responsive dashboard", votes: 22, status: "Completed" },
  { title: "Custom email notification templates", votes: 19, status: "Under Review" },
  { title: "Kubernetes operator", votes: 18, status: "Planned" },
  { title: "gRPC API scanning", votes: 15, status: "Under Review" },
];

const statusVariant: Record<string, "info" | "medium" | "low" | "category"> = {
  "Under Review": "category",
  "Planned": "medium",
  "In Progress": "info",
  "Completed": "low",
};

export default function FeatureRequestsPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Community", href: "/community" }, { label: "Feature Requests" }]}
        title="Feature Requests"
        description="Suggest new features, vote on existing requests, and help shape the product roadmap."
      />

      <Container className="py-16">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 p-4 rounded-lg bg-surface border border-border text-center">
            <p className="text-sm text-muted-2">
              Have an idea? Open a feature request on{" "}
              <a
                href="https://github.com/Ksander215/sec-scanner-workspace/discussions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                GitHub Discussions
              </a>
              .
            </p>
          </div>

          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.title} className="p-4 rounded-xl bg-surface border border-border flex items-center gap-4">
                <div className="flex flex-col items-center w-12 shrink-0">
                  <span className="text-xs text-muted">Votes</span>
                  <span className="text-lg font-bold text-foreground">{req.votes}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-foreground">{req.title}</h3>
                    <Badge variant={statusVariant[req.status]}>{req.status}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}
