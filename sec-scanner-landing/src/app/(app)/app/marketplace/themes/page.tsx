import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Palette } from "lucide-react";

export const metadata: Metadata = {
  title: "Themes — Marketplace — Security Intelligence Platform",
  description: "Custom UI themes and appearance packages for the platform dashboard.",
  openGraph: { title: "Themes — Marketplace", description: "Custom UI themes." },
};

const themes = [
  { name: "Midnight Green", style: "Dark", description: "Deep green tones for extended monitoring sessions with reduced eye strain." },
  { name: "Nordic Light", style: "Light", description: "Clean light theme with Nordic-inspired colors for daylight work." },
  { name: "Cyberpunk", style: "Dark", description: "Neon accents on dark backgrounds — perfect for the security ops aesthetic." },
  { name: "High Contrast", style: "Accessibility", description: "WCAG AAA compliant high-contrast theme for accessibility." },
  { name: "Dracula", style: "Dark", description: "Popular Dracula color scheme adapted for the platform dashboard." },
  { name: "Solarized", style: "Both", description: "Classic Solarized light and dark modes in one theme package." },
];

export default function ThemesPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Marketplace", href: "/marketplace" }, { label: "Themes" }]}
        title="Themes"
        description="Customize the platform dashboard with community and official UI themes."
      />

      <Container className="py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {themes.map((theme) => (
            <Card key={theme.name} title={theme.name} description={theme.description}>
              <div className="mt-3">
                <Badge variant="category">{theme.style}</Badge>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-12 p-8 rounded-xl bg-surface border border-border text-center">
          <Palette className="w-8 h-8 text-accent mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Create a Theme</h3>
          <p className="text-sm text-muted-2 max-w-lg mx-auto">
            Design custom themes using CSS variables. Share your creation with the community.
          </p>
        </div>
      </Container>
    </>
  );
}
