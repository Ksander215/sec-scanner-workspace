# Investor Demo Script — sec-scanner.pro

**Date:** 2026-07-17  
**Task:** INT-023F — Product Review & Enterprise Polish  
**Duration:** ~5–7 minutes  
**Audience:** Investors, enterprise buyers, security leadership

---

## Demo Flow

### Stop 1: Landing Page (30 seconds)

**URL:** https://sec-scanner.pro/

**Talking points:**
- "Security Intelligence Platform — open-source, enterprise-grade"
- Point to the tagline: vulnerability intelligence, attack path analysis, AI-powered operations
- Show the terminal demo — 4 lines of output that explain the product in 5 seconds
- Click **Open Interactive Demo** → transitions to Dashboard

**Key message:** This is not a weekend project. This is a production-ready security operations platform.

---

### Stop 2: Dashboard (60 seconds)

**URL:** https://sec-scanner.pro/app/dashboard

**Talking points:**
- **Today's Overview**: Security Score 78/100 — instant posture assessment
- **Active Incidents**: 4 open critical findings with pulsing red indicators
- **AI Recommendation**: "Enable Redis authentication — eliminates 1 attack path in 5 minutes"
- **Risk Trend**: 30-day chart showing risk score trajectory
- **Latest Scans**: Real-time scan status with running/completed indicators
- **Compliance**: OWASP, CIS, PCI DSS progress bars
- **Recent Reports**: Executive Summary, Vulnerability Assessment, PCI-DSS

**Key message:** The dashboard gives CISOs everything they need in one view — no tool-hopping.

---

### Stop 3: Playground (60 seconds)

**URL:** https://sec-scanner.pro/app/playground

**Talking points:**
- Click **"Use Demo Dataset"** — watch the upload simulation
- Pipeline runs through 8 stages: Normalize → Correlate → KG → Risk Score → Attack Paths → Recommendations → Explainability → Report
- Show the Knowledge Graph preview with node/edge counts
- Show Risk Analysis: Score 78/100 (HIGH), 4 critical findings
- Export options: PDF, SARIF, JSON

**Key message:** Anyone can try the full analysis pipeline in under 3 minutes — no signup, no install.

---

### Stop 4: Knowledge Graph (60 seconds)

**URL:** https://sec-scanner.pro/app/demo/knowledge-graph

**Talking points:**
- **34 nodes, 29 edges, 7 types, 5 critical** — visible in stats bar
- Type any query in the search bar: "Redis" — watch nodes filter
- Click a node → Detail panel shows connections, severity, type
- Filter by type: CVEs only → 5 nodes highlighted
- Legend at bottom explains all node types and edge colors
- Animated edges show exploitation paths in red

**Key message:** This is the product's differentiator. Flat vulnerability lists miss hidden attack vectors. The knowledge graph makes them visible.

---

### Stop 5: Attack Paths (60 seconds)

**URL:** https://sec-scanner.pro/app/demo/attack-paths

**Talking points:**
- 3 attack paths, each showing a different compromise scenario
- Click **"SQL Injection Data Breach"** path
- Click an edge → Detail panel shows:
  - Probability: 95% → 85%
  - **Time to Compromise: <1 hour** → **<6 hours** (total path)
  - **Business Risk: "Full data breach"**
  - **CVSS: 9.8**
  - **MITRE ATT&CK: T1190 → T1555 → T1005**
  - **CVE: CVE-2024-23956**
  - Exploitable: Yes — Active exploit available
- Switch to "Redis RCE to Cluster Takeover" → shows 5-step chain ending in K8s takeover

**Key message:** This is what board members ask: "How fast can we be compromised?" The answer is here.

---

### Stop 6: Marketplace (30 seconds)

**URL:** https://sec-scanner.pro/app/marketplace

**Talking points:**
- 8 categories: Plugins, Rules, Dashboards, Templates, AI Prompts, Integrations, Connectors, Themes
- Sort by Popular or Top Rated
- Each extension: Author, Version, Rating, Installs, Install button
- Verified badge on official extensions
- Search across all extensions

**Key message:** The platform is extensible. Community-driven. Growing ecosystem.

---

### Stop 7: Documentation (30 seconds)

**URL:** https://sec-scanner.pro/app/docs

**Talking points:**
- Stripe-like layout: Left sidebar + Right content
- 11 documentation sections: Getting Started, Guides, API, CLI, SDK, Architecture, Deployment, Security, Compliance, Marketplace, Plugin Development
- Every section has code examples, tables, and real content
- Getting Started page: Install → Configure → First scan in under 5 minutes

**Key message:** Enterprise-ready documentation. Not a README — a full developer portal.

---

### Stop 8: Pricing (30 seconds)

**URL:** https://sec-scanner.pro/app/pricing

**Talking points:**
- 3 tiers: Free (open source), Team ($49/user/mo), Enterprise (custom)
- Free tier includes: Unlimited scans, Knowledge Graph, Attack Paths, AI Copilot
- Team adds: SSO, RBAC, Priority support
- Enterprise adds: SLA, Custom integrations, Dedicated support

**Key message:** Open-source core with clear enterprise upgrade path.

---

### Stop 9: GitHub (30 seconds)

**URL:** https://github.com/Ksander215/sec-scanner-workspace

**Talking points:**
- Open source, MIT license
- 370+ source files, 2,350+ tests, 0 TypeScript errors
- Active development, community contributions
- Transparent — every line of code is auditable

**Key message:** Trust through transparency. No black-box security tools.

---

### Stop 10: Roadmap (30 seconds)

**URL:** https://sec-scanner.pro/app/community/roadmap

**Talking points:**
- Public roadmap with status indicators: Completed, In Progress, Planned, Community Ideas
- Upvote system for feature prioritization
- Shows product velocity and direction

**Key message:** The product is evolving. Community has a voice. Investors see momentum.

---

## Closing Statement

"Security Intelligence Platform is the first open-source security operations platform that combines scanning, correlation, knowledge graph, attack path analysis, and AI-powered remediation in a single product. It's production-ready, enterprise-grade, and free to try — right now, in your browser."

---

## Key Metrics to Mention

| Metric | Value |
|--------|-------|
| Platform modules | 20 |
| Source files | 370+ |
| Test coverage | 2,350+ tests |
| TypeScript errors | 0 |
| License | 100% Open Source (MIT) |
| Install time | <30 seconds (1 command) |
| Demo access | No signup, no credit card |
| Pages / Routes | 59 |
| Marketplace categories | 8 |
| Documentation sections | 11 |
