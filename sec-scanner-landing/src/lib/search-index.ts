export interface SearchEntry {
  title: string;
  description: string;
  category: string;
  href: string;
}

export const searchIndex: SearchEntry[] = [
  // Product
  { title: "Platform", description: "Security Intelligence Platform overview", category: "Product", href: "/platform" },
  { title: "Capabilities", description: "Core capabilities and features", category: "Product", href: "/capabilities" },
  { title: "Architecture", description: "System architecture and design", category: "Product", href: "/architecture" },
  { title: "Pricing", description: "Plans and pricing", category: "Product", href: "/pricing" },
  { title: "Demo", description: "Interactive demo environment", category: "Product", href: "/demo" },
  { title: "Changelog", description: "Release notes and updates", category: "Product", href: "/changelog" },

  // Marketplace
  { title: "Marketplace", description: "Browse extensions and integrations", category: "Marketplace", href: "/marketplace" },
  { title: "Plugins", description: "Extend platform functionality with plugins", category: "Marketplace", href: "/marketplace/plugins" },
  { title: "Rules", description: "Custom security rules and detection logic", category: "Marketplace", href: "/marketplace/rules" },
  { title: "Connectors", description: "Data source connectors", category: "Marketplace", href: "/marketplace/connectors" },
  { title: "Templates", description: "Pre-built scan templates", category: "Marketplace", href: "/marketplace/templates" },
  { title: "Dashboards", description: "Visualization dashboards", category: "Marketplace", href: "/marketplace/dashboards" },
  { title: "Integrations", description: "Third-party integrations", category: "Marketplace", href: "/marketplace/integrations" },
  { title: "Themes", description: "UI themes and appearance", category: "Marketplace", href: "/marketplace/themes" },
  { title: "AI Prompts", description: "AI-powered prompt templates", category: "Marketplace", href: "/marketplace/ai-prompts" },

  // Documentation
  { title: "Documentation", description: "Platform documentation hub", category: "Documentation", href: "/docs" },
  { title: "Getting Started", description: "Quick start guide", category: "Documentation", href: "/docs/getting-started" },
  { title: "Guides", description: "How-to guides and tutorials", category: "Documentation", href: "/docs/guides" },
  { title: "API Reference", description: "REST API documentation", category: "Documentation", href: "/docs/api" },
  { title: "CLI", description: "Command-line interface reference", category: "Documentation", href: "/docs/cli" },
  { title: "SDK", description: "Software development kits", category: "Documentation", href: "/docs/sdk" },
  { title: "Architecture Docs", description: "Technical architecture documentation", category: "Documentation", href: "/docs/architecture" },
  { title: "Deployment", description: "Deployment guides and options", category: "Documentation", href: "/docs/deployment" },
  { title: "Security", description: "Security best practices", category: "Documentation", href: "/docs/security" },
  { title: "Compliance", description: "Compliance frameworks and reports", category: "Documentation", href: "/docs/compliance" },
  { title: "Marketplace Docs", description: "Marketplace documentation", category: "Documentation", href: "/docs/marketplace" },
  { title: "Plugin Development", description: "How to develop plugins", category: "Documentation", href: "/docs/plugins" },

  // Community
  { title: "Community", description: "Join the community", category: "Community", href: "/community" },
  { title: "Contributing", description: "How to contribute", category: "Community", href: "/community/contributing" },
  { title: "Roadmap", description: "Product roadmap and plans", category: "Community", href: "/community/roadmap" },
  { title: "Feature Requests", description: "Request new features", category: "Community", href: "/community/feature-requests" },

  // Resources
  { title: "Blog", description: "Latest news and articles", category: "Resources", href: "/blog" },
  { title: "Examples", description: "Code examples and templates", category: "Resources", href: "/examples" },

  // Legal
  { title: "Privacy Policy", description: "Data privacy information", category: "Legal", href: "/legal/privacy" },
  { title: "Terms of Service", description: "Terms and conditions", category: "Legal", href: "/legal/terms" },
  { title: "Security Policy", description: "Security disclosure policy", category: "Legal", href: "/legal/security" },

  // App
  { title: "Dashboard", description: "Security dashboard", category: "App", href: "/app/dashboard" },
];
