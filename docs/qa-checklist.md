# QA Checklist — sec-scanner.pro

> Full interactive audit of every clickable element, form, filter, and flow.
> Status flow: OPEN → FIXED → SELF VERIFIED → FOUNDER VERIFIED → CLOSED
> Format: "Automated verification passed." or "Founder QA passed."

---

## 1. Landing Page

### 1.1 Header
- [x] Logo → `/` (Link)
- [x] `#platform` anchor → scrolls to Platform section (`id="platform"`)
- [x] `#metrics` anchor → scrolls to Metrics section (`id="metrics"`)
- [x] `#demo` anchor → scrolls to Demo section (`id="demo"`)
- [x] `#community` anchor → scrolls to Community section (`id="community"`)
- [x] Dashboard → `/app/dashboard` (Link)
- [x] Docs → `/app/docs` (Link)
- [x] GitHub → external (target="_blank")
- [x] "Open Platform" CTA → `/app/dashboard` (Link)
- [x] Mobile hamburger → toggle menu
- [x] Mobile nav links → same as desktop

### 1.2 Hero
- [x] Primary CTA "Open Interactive Demo" → `/app/demo` (`<a>`)
- [x] Secondary CTA "View on GitHub" → external GitHub (`<a>`, target="_blank")
- [x] Animated counters → visual (no click expected)
- [x] Terminal preview → visual (no click expected)

### 1.3 Platform
- [x] Card 1 "Multi-Engine Scanning" → `/app/scans` (`<motion.a>`)
- [x] Card 2 "AI-Powered Analysis" → `/app/dashboard` (`<motion.a>`)
- [x] Card 3 "Knowledge Graph" → `/app/demo/knowledge-graph` (`<motion.a>`)
- [x] Card 4 "Automated Workflows" → `/app/workspace/pipelines` (`<motion.a>`)
- [x] Card 5 "Risk Quantification" → `/app/risks` (`<motion.a>`)
- [x] Card 6 "Enterprise Security" → `/app/docs/security` (`<motion.a>`)
- [x] "Learn more" → appears on hover, card is clickable link

### 1.4 Metrics
- [x] Card "Modules" → `/app/docs` (`<motion.a>`)
- [x] Card "Source Files" → GitHub external (`<motion.a>`, target="_blank")
- [x] Card "Tests" → GitHub external (`<motion.a>`, target="_blank")
- [x] Card "TS Errors" → `/app/docs` (`<motion.a>`)
- [x] Card "Open Source" → GitHub external (`<motion.a>`, target="_blank")
- [x] Card "Command Install" → `/app/playground` (`<motion.a>`)
- [x] Hover → cursor-pointer, bg-surface-2, label color change

### 1.5 Demo Preview
- [x] Screenshot → `/app/demo` (`<motion.a>`)
- [x] Hover overlay → "Open Interactive Demo" button
- [x] Feature card "Live Pipeline" → `/app/demo` (`<motion.a>`)
- [x] Feature card "Knowledge Graph" → `/app/demo/knowledge-graph` (`<motion.a>`)
- [x] Feature card "Attack Paths" → `/app/demo/attack-paths` (`<motion.a>`)
- [x] Feature card "AI Copilot" → `/app/dashboard` (`<motion.a>`)
- [x] CTA "Open Interactive Demo" → `/app/demo` (`<a>`)

### 1.6 Pricing (Landing)
- [x] Free "Начать бесплатно" → `/app/demo` (`<a>`)
- [x] Starter "Start Free Trial" → `/app/demo` (`<a>`)
- [x] Professional "Start Free Trial" → `/app/demo` (`<a>`)
- [x] Enterprise "Contact Sales" → `mailto:hello@sec-scanner.pro` (`<a>`)

### 1.7 Community
- [x] Discord → GitHub Discussions (coming soon, opacity-60)
- [x] Telegram → GitHub Discussions (coming soon, opacity-60)
- [x] GitHub Discussions → GitHub Discussions (external)
- [x] Public Roadmap → `/app/community/roadmap` (`<motion.a>`)
- [x] Feature Requests → `/app/community/feature-requests` (`<motion.a>`)
- [x] Contributors → GitHub repo (external)
- [x] Banner "Star on GitHub" → GitHub (external)
- [x] Banner "Contribute" → CONTRIBUTING.md (external)

### 1.8 Footer
- [x] Logo → `/` (Link)
- [x] Product: Platform → `/app/platform`
- [x] Product: Dashboard → `/app/dashboard`
- [x] Product: Pricing → `/app/pricing`
- [x] Product: Marketplace → `/app/marketplace`
- [x] Product: Demo → `/app/demo`
- [x] Developers: Documentation → `/app/docs`
- [x] Developers: API Reference → `/app/docs/api`
- [x] Developers: CLI → `/app/docs/cli`
- [x] Developers: SDK → `/app/docs/sdk`
- [x] Developers: GitHub → external
- [x] Community: Discord (Soon) → `/app/community` (opacity-50, cursor-default)
- [x] Community: Telegram (Soon) → `/app/community` (opacity-50, cursor-default)
- [x] Community: GitHub Discussions → external
- [x] Community: Roadmap → `/app/community/roadmap`
- [x] Community: Contributing → CONTRIBUTING.md (external)
- [x] Legal: Privacy → `/app/legal/privacy`
- [x] Legal: Terms → `/app/legal/terms`
- [x] Legal: Security → `/app/legal/security`
- [x] Legal: License → LICENSE (external)
- [x] Social: GitHub → external
- [x] Social: X/Twitter → external (Coming soon, opacity-50)
- [x] Social: Telegram → external (Coming soon, opacity-50)
- [x] Social: Discord → external (Coming soon, opacity-50)
- [x] Email → `mailto:hello@sec-scanner.pro`

---

## 2. Dashboard (`/app/dashboard`)

### 2.1 Cards
- [x] Risk Score gauge → visual
- [x] Severity chart → visual
- [x] Compliance badges → visual
- [x] Risk trend sparkline → visual

### 2.2 Buttons
- [x] "Load Demo Data" → onClick={handleLoadDemo} (loads demo, runs pipeline animation)
- [x] Severity filter pills → onClick to filter findings
- [x] AI Copilot chat input → onSubmit / onClick
- [x] Knowledge Graph link → `/app/demo/knowledge-graph`
- [x] Attack Paths link → `/app/demo/attack-paths`

### 2.3 Tabs / Filters
- [x] Severity filter (Critical/High/Medium/Low) → onClick
- [x] Finding expand/collapse → onClick

### 2.4 Findings List
- [x] Each finding row → expandable with details

---

## 3. Marketplace (`/app/marketplace`)

### 3.1 Search
- [x] Search input → onChange filters by name, description, tags

### 3.2 Filters
- [x] Category tabs (All + 8) → onClick setActiveCategory
- [x] Sort toggle (Popular / Top Rated) → onClick setSortBy

### 3.3 Install
- [x] Install button → onClick={handleInstall}, simulated 1.5s delay
- [x] State transitions: "Install" → "Installing..." → "Installed ✓"
- [x] Uninstall: click "Installed ✓" → toggles back

### 3.4 Categories
- [x] All 8 categories render with icons: Plugins, Rules, Dashboards, Templates, AI Prompts, Integrations, Connectors, Themes
- [x] Category filtering works

### 3.5 Details
- [x] Card shows: name, verified badge, author, description, tags (max 3), rating, installs, version, license

---

## 4. Docs (`/app/docs/*`)

### 4.1 Sidebar Links
- [x] Getting Started → `/app/docs/getting-started`
- [x] Guides → `/app/docs/guides`
- [x] API Reference → `/app/docs/api`
- [x] CLI → `/app/docs/cli`
- [x] SDK → `/app/docs/sdk`
- [x] Architecture → `/app/docs/architecture`
- [x] Deployment → `/app/docs/deployment`
- [x] Security → `/app/docs/security`
- [x] Compliance → `/app/docs/compliance`
- [x] Marketplace → `/app/docs/marketplace`
- [x] Plugin Development → `/app/docs/plugins`
- [x] Active state highlighting via usePathname()

### 4.2 Breadcrumbs
- [x] Docs hub breadcrumbs → correct
- [x] Subpage breadcrumbs → `/app/docs` (FIXED BUG-004)

### 4.3 Internal Links (Getting Started)
- [x] "Step-by-step Guides" → `/app/docs/guides`
- [x] "API Reference" → `/app/docs/api`
- [x] "CLI Commands" → `/app/docs/cli`
- [x] "Browse Marketplace" → `/app/marketplace`

---

## 5. Knowledge Graph (`/app/demo/knowledge-graph`)

### 5.1 Search
- [x] Input → onChange={handleSearch}, filters nodes by opacity

### 5.2 Filter
- [x] All / Hosts / Services / Findings / CVEs / Creds / Recs → onClick={handleFilter}
- [x] Active filter highlighted

### 5.3 Hover
- [x] Node hover → CSS transitions (scale, ring, shadow)

### 5.4 Node Click
- [x] onNodeClick → opens detail panel (label, detail, severity, connections)
- [x] Close button on detail panel → onClick={setSelectedNode(null)}
- [x] onPaneClick → deselects node

### 5.5 Legend
- [x] 7 node type colors (host, service, finding, cve, credential, asset, recommendation)
- [x] 3 edge types (Exploits, Affects, Remediates)

### 5.6 Graph Controls
- [x] ReactFlow Controls (zoom in/out/fit)
- [x] MiniMap
- [x] Drag/pan nodes

---

## 6. Attack Paths (`/app/demo/attack-paths`)

### 6.1 Path Selection
- [x] 3 path selector buttons → onClick switches activePath
- [x] Visual distinction: active = red/10 bg + red border + glow

### 6.2 CVE
- [x] Edge click → detail panel shows CVE tags (red bg, monospace)
- [x] Each CVE rendered as individual tag

### 6.3 MITRE ATT&CK
- [x] Edge click → detail panel shows MITRE technique tags (purple bg, monospace)

### 6.4 Probability
- [x] Edge detail → probability bar + percentage
- [x] Color-coded (red for high probability)

### 6.5 Business Risk
- [x] Edge detail → "Business Risk" text field
- [x] "Time to Compromise" card
- [x] "CVSS Score" card
- [x] "Exploitable" indicator (Yes/No)

### 6.6 Edge Click
- [x] onEdgeClick → opens detail panel
- [x] Close button → onClick={setSelectedEdge(null)}

---

## 7. Playground (`/app/playground`)

### 7.1 Upload
- [x] Upload area click → onClick={handleUpload}
- [x] "Use Demo Dataset" button → onClick={handleUpload}
- [x] Simulated processing (1.5s) → auto-advances to Pipeline

### 7.2 Pipeline
- [x] 8 pipeline stages displayed with status
- [x] "View Knowledge Graph" button → advances to Graph step
- [x] "Back" button → returns to Upload

### 7.3 Graph
- [x] Summary statistics grid (Hosts, Services, Findings, CVEs, Credentials, Recommendations, Edges, Attack Paths)
- [x] "Open Full Graph →" → `/app/demo/knowledge-graph` (`<a>`)
- [x] "Risk Analysis" button → advances to Risk step
- [x] "Back" → returns to Pipeline

### 7.4 Risk
- [x] Risk score display (78/100, HIGH)
- [x] Critical findings count
- [x] Attack path list with "View →" → `/app/demo/attack-paths`
- [x] "Export" button → advances to Export step
- [x] "Back" → returns to Graph

### 7.5 Export
- [x] PDF format button → visual only (no download action) ⚠️
- [x] SARIF format button → visual only (no download action) ⚠️
- [x] JSON format button → visual only (no download action) ⚠️
- [x] "Back" → returns to Risk
- [x] "Start Over" → returns to Upload

---

## 8. Responsive

### 8.1 Desktop
- [x] Sidebar visible (hidden md:block)
- [x] TopBar adapts (left-60 / left-16)
- [x] Grid layouts use lg: breakpoints

### 8.2 Tablet
- [x] Grid cols adjust with md: breakpoints
- [x] Sidebar collapsible

### 8.3 Mobile
- [x] Mobile hamburger menu → md:hidden
- [x] Mobile nav drawer with AnimatePresence
- [x] Grid cols adjust with sm: breakpoints
- [x] Search input responsive width

---

## 9. App Navigation

### 9.1 App Sidebar
- [x] Dashboard → `/app/dashboard`
- [x] Workspace (expandable) → 6 sub-items
- [x] Projects → `/app/projects`
- [x] Scans → `/app/scans`
- [x] Findings → `/app/findings`
- [x] Risks → `/app/risks`
- [x] Knowledge Graph → `/app/demo/knowledge-graph`
- [x] Attack Paths → `/app/demo/attack-paths`
- [x] Reports → `/app/reports`
- [x] Marketplace → `/app/marketplace`
- [x] Playground → `/app/playground`
- [x] Documentation → `/app/docs`
- [x] Community → `/app/community`
- [x] Downloads → `/app/downloads`
- [x] Settings → `/app/settings`
- [x] Collapse toggle → onClick={onToggle}
- [x] Tooltip on collapsed items → hover
- [x] Active state detection → usePathname()

### 9.2 App TopBar
- [x] Search (⌘K) → onClick={onSearchOpen}
- [x] Theme toggle → setTheme (dark/light/system)
- [x] Language toggle → setLocale (RU/EN)
- [x] GitHub → external
- [x] User menu → Profile/Preferences/Sign Out
- [x] Profile → `/app/settings`
- [x] Preferences → `/app/settings`
- [ ] Notifications bell → no onClick ⚠️ (BUG-022)
- [ ] Sign Out → no onClick ⚠️ (BUG-023)

---

## 10. Non-Functional Buttons (Known Bugs)

### 10.1 Scans (`/app/scans`)
- [ ] "New Scan" button → no onClick (BUG-017)
- [ ] Play buttons per scan (×5) → no onClick (BUG-018)

### 10.2 Workspace Pipelines (`/app/workspace/pipelines`)
- [ ] "New Pipeline" button → no onClick (BUG-015)
- [ ] Play buttons per pipeline (×4) → no onClick (BUG-016)

### 10.3 Reports (`/app/reports`)
- [ ] "Generate Report" button → no onClick (BUG-019)
- [ ] Download buttons per report (×6) → no onClick (BUG-020)

### 10.4 Community Roadmap (`/app/community/roadmap`)
- [ ] "Upvote this idea" button → no onClick (BUG-021)

### 10.5 Settings (`/app/settings`)
- [ ] Theme buttons (Dark/Light/System) → not wired, visual only (BUG-045)
- [ ] Sidebar position (Left/Right) → not wired (BUG-045)
- [ ] Language buttons (RU/EN) → not wired (BUG-046)
- [ ] Notification toggles (×4) → not wired (BUG-047)
- [ ] "Enable" 2FA → no onClick (BUG-045)
- [ ] "Generate New Key" → no onClick (BUG-045)

### 10.6 Playground Export
- [ ] PDF/SARIF/JSON format buttons → no onClick (BUG-056, NEW)

---

## Founder QA Verdict

### Landing Page: Founder QA passed.
### Dashboard: Founder QA passed.
### Marketplace: Founder QA passed.
### Docs: Founder QA passed.
### Knowledge Graph: Founder QA passed.
### Attack Paths: Founder QA passed.
### Playground: Automated verification passed. (Export buttons non-functional)
### Responsive: Automated verification passed. (CSS-based, needs live browser test)
