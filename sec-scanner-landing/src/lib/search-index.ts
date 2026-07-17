export interface SearchEntry {
  title: string;
  description: string;
  category: string;
  href: string;
}

export const searchIndex: SearchEntry[] = [
  // Platform
  { title: "Dashboard", description: "Security posture overview with KPIs and trends", category: "Platform", href: "/app/dashboard" },
  { title: "Platform", description: "Security Intelligence Platform overview", category: "Platform", href: "/app/platform" },
  { title: "Capabilities", description: "Core capabilities and features", category: "Platform", href: "/app/capabilities" },
  { title: "Architecture", description: "Interactive architecture explorer", category: "Platform", href: "/app/architecture" },
  { title: "Pricing", description: "Plans and pricing", category: "Platform", href: "/app/pricing" },
  { title: "Changelog", description: "Release notes and updates", category: "Platform", href: "/app/changelog" },

  // Workspace
  { title: "Workspace Overview", description: "Manage your security workspace", category: "Workspace", href: "/app/workspace" },
  { title: "Assets", description: "Manage and monitor your assets", category: "Workspace", href: "/app/workspace/assets" },
  { title: "Pipelines", description: "Configure and run scan pipelines", category: "Workspace", href: "/app/workspace/pipelines" },
  { title: "History", description: "View scan and job history", category: "Workspace", href: "/app/workspace/history" },
  { title: "Jobs", description: "Monitor running and queued jobs", category: "Workspace", href: "/app/workspace/jobs" },
  { title: "Monitoring", description: "Real-time monitoring and alerts", category: "Workspace", href: "/app/workspace/monitoring" },

  // Projects
  { title: "Projects", description: "Manage security projects", category: "Projects", href: "/app/projects" },

  // Security
  { title: "Scans", description: "View and manage security scans", category: "Security", href: "/app/scans" },
  { title: "Findings", description: "Browse security findings and vulnerabilities", category: "Security", href: "/app/findings" },
  { title: "Risks", description: "Risk assessment and management", category: "Security", href: "/app/risks" },
  { title: "Knowledge Graph", description: "Explore security relationships interactively", category: "Security", href: "/app/demo/knowledge-graph" },
  { title: "Attack Paths", description: "Visualize and explore attack paths", category: "Security", href: "/app/demo/attack-paths" },
  { title: "Reports", description: "Generate and view security reports", category: "Security", href: "/app/reports" },

  // Demo
  { title: "Demo Workspace", description: "Interactive demo with live pipeline analysis", category: "Demo", href: "/app/demo" },
  { title: "Playground", description: "Upload, analyze, and explore security data", category: "Demo", href: "/app/playground" },

  // Marketplace
  { title: "Marketplace", description: "Browse extensions and integrations store", category: "Marketplace", href: "/app/marketplace" },
  { title: "Plugins", description: "Extend platform functionality with plugins", category: "Marketplace", href: "/app/marketplace/plugins" },
  { title: "Rules", description: "Custom security rules and detection logic", category: "Marketplace", href: "/app/marketplace/rules" },
  { title: "Connectors", description: "Data source connectors", category: "Marketplace", href: "/app/marketplace/connectors" },
  { title: "Templates", description: "Pre-built scan templates", category: "Marketplace", href: "/app/marketplace/templates" },
  { title: "Dashboards", description: "Visualization dashboards", category: "Marketplace", href: "/app/marketplace/dashboards" },
  { title: "Integrations", description: "Third-party integrations", category: "Marketplace", href: "/app/marketplace/integrations" },
  { title: "Themes", description: "UI themes and appearance", category: "Marketplace", href: "/app/marketplace/themes" },
  { title: "AI Prompts", description: "AI-powered prompt templates", category: "Marketplace", href: "/app/marketplace/ai-prompts" },

  // Documentation
  { title: "Documentation", description: "Platform documentation hub", category: "Documentation", href: "/app/docs" },
  { title: "Getting Started", description: "Quick start guide", category: "Documentation", href: "/app/docs/getting-started" },
  { title: "Guides", description: "How-to guides and tutorials", category: "Documentation", href: "/app/docs/guides" },
  { title: "API Reference", description: "REST API documentation", category: "Documentation", href: "/app/docs/api" },
  { title: "CLI", description: "Command-line interface reference", category: "Documentation", href: "/app/docs/cli" },
  { title: "SDK", description: "Software development kits", category: "Documentation", href: "/app/docs/sdk" },
  { title: "Architecture Docs", description: "Technical architecture documentation", category: "Documentation", href: "/app/docs/architecture" },
  { title: "Deployment", description: "Deployment guides and options", category: "Documentation", href: "/app/docs/deployment" },
  { title: "Security", description: "Security best practices", category: "Documentation", href: "/app/docs/security" },
  { title: "Compliance", description: "Compliance frameworks and reports", category: "Documentation", href: "/app/docs/compliance" },
  { title: "Marketplace Docs", description: "Marketplace documentation", category: "Documentation", href: "/app/docs/marketplace" },
  { title: "Plugin Development", description: "How to develop plugins", category: "Documentation", href: "/app/docs/plugins" },

  // Community
  { title: "Community", description: "Join the community", category: "Community", href: "/app/community" },
  { title: "Contributing", description: "How to contribute", category: "Community", href: "/app/community/contributing" },
  { title: "Roadmap", description: "Interactive product roadmap", category: "Community", href: "/app/community/roadmap" },
  { title: "Feature Requests", description: "Request new features", category: "Community", href: "/app/community/feature-requests" },

  // Downloads & Cloud
  { title: "Download Center", description: "Install CLI, Docker, SDK, Helm, VS Code extension", category: "Downloads", href: "/app/downloads" },
  { title: "Cloud Workspace", description: "SaaS workspace with projects, billing, and API keys", category: "Cloud", href: "/app/cloud" },

  // Resources
  { title: "Blog", description: "Latest news and articles", category: "Resources", href: "/app/blog" },
  { title: "Examples", description: "Code examples and templates", category: "Resources", href: "/app/examples" },

  // Legal
  { title: "Privacy Policy", description: "Data privacy information", category: "Legal", href: "/app/legal/privacy" },
  { title: "Terms of Service", description: "Terms and conditions", category: "Legal", href: "/app/legal/terms" },
  { title: "Security Policy", description: "Security disclosure policy", category: "Legal", href: "/app/legal/security" },

  // Settings
  { title: "Settings", description: "Appearance, language, notifications, security", category: "Settings", href: "/app/settings" },
];
