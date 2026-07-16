# Security Intelligence Platform — Information Architecture

## Site Map

### Root (/)
Landing page — Hero, Platform, Capabilities, Architecture, Demo, Pricing, Marketplace, Roadmap, Community

### Product
- /platform          — Platform overview (deep dive)
- /capabilities      — Capabilities detail (scanning engines, intelligence, integrations)
- /architecture      — Architecture detail (layers, tech stack, data flow)
- /pricing           — Pricing plans (Free, Starter, Professional, Enterprise)
- /demo              — Interactive demo (full-page, immersive)
- /changelog         — Product changelog

### Marketplace
- /marketplace                    — Marketplace hub
- /marketplace/plugins            — Plugins catalog
- /marketplace/rules              — Detection rules
- /marketplace/connectors         — Connectors & integrations
- /marketplace/templates          — Templates (reports, pipelines, policies)
- /marketplace/dashboards         — Dashboard templates
- /marketplace/integrations       — Integration packs
- /marketplace/themes             — UI themes
- /marketplace/ai-prompts         — AI prompt library

### Documentation
- /docs                           — Documentation portal (landing)
- /docs/getting-started           — Getting started guide
- /docs/guides                    — Guides & tutorials
- /docs/guides/first-scan         — Your first scan
- /docs/guides/ci-cd              — CI/CD integration
- /docs/guides/custom-rules       — Custom detection rules
- /docs/architecture              — Architecture deep-dive
- /docs/architecture/layers       — Layer descriptions
- /docs/architecture/data-flow    — Data flow diagrams
- /docs/api                       — API reference (OpenAPI/Swagger)
- /docs/api/rest                  — REST API endpoints
- /docs/api/graphql               — GraphQL schema
- /docs/api/webhooks              — Webhook events
- /docs/cli                       — CLI documentation
- /docs/cli/commands              — Command reference
- /docs/cli/configuration         — Configuration files
- /docs/sdk                       — SDK documentation
- /docs/sdk/typescript            — TypeScript SDK
- /docs/sdk/python                — Python SDK
- /docs/marketplace               — Publishing to marketplace
- /docs/plugins                   — Plugin development
- /docs/deployment                — Deployment guides
- /docs/deployment/docker         — Docker deployment
- /docs/deployment/kubernetes     — Kubernetes deployment
- /docs/deployment/on-premise     — On-premise deployment
- /docs/security                  — Security documentation
- /docs/compliance                — Compliance (SOC2, ISO 27001, GDPR)

### Community
- /community                      — Community hub
- /community/discord              — Discord server info
- /community/telegram             — Telegram group
- /community/contributing         — Contributing guide
- /community/roadmap              — Public roadmap
- /community/feature-requests     — Feature requests

### Resources
- /blog                           — Blog
- /examples                       — Examples & templates
- /examples/owasp                 — OWASP examples
- /examples/nmap                  — Nmap scan examples
- /examples/nuclei                — Nuclei templates
- /examples/semgrep               — Semgrep rules
- /examples/trivy                 — Trivy scans
- /examples/docker                — Docker security
- /examples/kubernetes            — Kubernetes security
- /examples/aws                   — AWS security
- /examples/azure                 — Azure security
- /examples/gcp                   — GCP security

### Legal
- /legal/privacy                  — Privacy Policy
- /legal/terms                    — Terms of Service
- /legal/security                 — Security Policy
- /legal/dpa                      — Data Processing Agreement

### SaaS (future, stubs)
- /app                            — SaaS Dashboard redirect
- /app/dashboard                  — Dashboard
- /app/projects                   — Projects
- /app/scans                      — Scans
- /app/findings                   — Findings
- /app/risk                       — Risk
- /app/assets                     — Assets
- /app/knowledge-graph            — Knowledge Graph
- /app/reports                    — Reports
- /app/recommendations            — Recommendations
- /app/users                      — Users & Settings

## Navigation Structure

### Desktop Header
Logo | Product ▾ | Marketplace ▾ | Docs ▾ | Community ▾ | Pricing | [Search] [GitHub] [Try Demo]

### Mobile Header
Logo | [Search] [Menu ☰]

### Footer
4 columns: Product | Developers | Community | Legal + Social links + Copyright

## Localization
- Default: RU
- Secondary: EN
- URL pattern: /en/... for English, /... for Russian (default)
- i18n config in next.js

## Search
- Static index built at build time
- Covers: docs pages, blog, examples, marketplace
- Keyboard shortcut: Cmd+K / Ctrl+K
- Modal overlay with categories
