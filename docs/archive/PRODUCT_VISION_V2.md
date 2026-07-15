> **Superseded by:** [PRODUCT_MARKET_FIT_BLUEPRINT.md](../PRODUCT_MARKET_FIT_BLUEPRINT.md)
> **Archived reason:** Product vision v2, positioning and personas now in PMF Blueprint
> **Archived date:** 2026-07-15
> **Migration:** MIG-001

---

# PRODUCT VISION V2 — Continuous Application Security Platform

> **Document Type:** Product Strategy — Vision
> **Version:** 2.0
> **Status:** Draft
> **Prepared by:** Lead Engineer (TASK-004)
> **Depends on:** DOMAIN_MODEL_V2.md, SECURITY_STATE.md, EVENT_MODEL.md, BOUNDED_CONTEXTS.md

---

## 1. The Problem We Actually Solve

### What Users Think They Want

"I need to scan my web application for vulnerabilities."

This is what users say when they first find Sec Scanner. It's a commodity request — there are hundreds of tools that do this, from free OWASP ZAP to enterprise Acunetix. Competing on "better scanning" is a losing game against well-funded incumbents.

### What Users Actually Need

"I need to **know** if my applications are secure, **prove** it to stakeholders, and **stay** secure over time."

The difference between "scanning" and "knowing" is the difference between a thermometer and a health dashboard. A thermometer tells you your temperature right now. A health dashboard shows your temperature trend, flags anomalies, reminds you of checkups, and alerts you when something changes.

**Sec Scanner must become the health dashboard for application security.**

---

## 2. Product Positioning

### Current Position (Implicit)

> "Sec Scanner is a DAST tool that scans web applications for OWASP Top 10 vulnerabilities."

**Problem:** This positions the product as a feature, not a platform. Users compare it to free tools and ask "why pay for this?"

### Target Position

> "Sec Scanner is a Continuous Application Security Platform that gives teams real-time visibility into their security posture, tracks improvements over time, and alerts them when risks increase."

**Key Differentiators from "DAST Scanner" positioning:**

| Dimension | DAST Scanner | Continuous Security Platform |
|-----------|-------------|------------------------------|
| Usage pattern | On-demand, when you remember | Continuous, always monitoring |
| Primary output | A list of vulnerabilities | A security score with trend |
| User returns because | They need another scan | They check their dashboard daily |
| Value to CTO | "We found 12 vulnerabilities" | "Our security score improved from 52 to 78 this quarter" |
| Value to developer | "Fix this XSS" | "Your fix resolved 3 findings and improved the score by 5 points" |
| Competitive moat | Scanner quality (easily copied) | Historical data + trends + integrations (hard to replicate) |

---

## 3. Target User Personas

### Primary: Security Engineer (Alex)

**Demographics:** 25-35, works at a 10-200 person SaaS company, reports to CTO or VP Engineering.

**Current workflow:**
1. Runs OWASP ZAP or Burp Suite manually before releases
2. Copies findings into a Jira ticket or Confluence page
3. Forgets about them until the next release
4. Has no idea if security is improving or declining over time

**Pain points:**
- No continuous visibility — only sees security at a point in time
- Manual work to track findings across scans
- No way to demonstrate security improvement to management
- Findings get lost between tools (ZAP → Jira → code → ??)
- No alerting when a previously fixed vulnerability reappears

**What Alex needs from Sec Scanner:**
- Add targets once, scan continuously
- See a single security score that trends over time
- Get alerted when new critical findings appear or old ones regress
- Export reports that management understands
- Integrate with existing tools (Jira, Slack, GitHub)

**Why Alex opens the product daily:**
To check the dashboard. Not to start a scan, but to see "did anything change overnight?" This is the critical behavior shift from tool to platform.

---

### Secondary: CTO / VP Engineering (Maria)

**Demographics:** 30-50, leads a 20-100 person engineering organization, cares about risk and compliance.

**Current workflow:**
1. Asks Alex "are we secure?"
2. Gets a vague answer like "we have some findings but nothing critical"
3. Asks again next quarter

**Pain points:**
- No quantitative measure of security posture
- No trend data to show board/investors
- Relies on one person's judgment
- Doesn't know if security investment is paying off

**What Maria needs from Sec Scanner:**
- A single number (Security Score) that she can track in a weekly report
- Trend data: "are we getting better?"
- Comparison across projects: "which application is the riskiest?"
- Automated reports she can forward to the board

**Why Maria opens the product weekly:**
To check the workspace-level Security Score and trend. To review the automated report. To see if her engineering team is reducing risk.

---

### Tertiary: Developer (Sam)

**Demographics:** 22-30, full-stack developer, works on 2-3 applications.

**Current workflow:**
1. Gets assigned a Jira ticket from Alex: "Fix XSS in /search"
2. Fixes it, pushes code
3. Never hears back — doesn't know if the fix worked
4. Three months later, the same finding appears on a new scan

**Pain points:**
- No feedback loop on vulnerability fixes
- Doesn't know if the scanner is even running after the fix
- No visibility into security status of applications they own

**What Sam needs from Sec Scanner:**
- "This finding was resolved — your fix worked!" notification
- "This finding regressed — the vulnerability came back" alert
- A simple dashboard showing security status of their projects (not the full platform)

---

## 4. The Ideal Day

### Alex's Ideal Day with Sec Scanner

**9:00 AM** — Opens the dashboard with morning coffee. Sees:
- Workspace Security Score: 78/100 (↑ 3 from last week)
- No new critical findings overnight
- 2 regressions detected on `staging.example.com` (medium severity)

**9:05 AM** — Clicks on the regression. Sees:
- Finding: "SQL Injection in login form" (CWE-89)
- Previously resolved 12 days ago, now detected again
- Likely cause: recent deployment to staging

**9:10 AM** — Assigns the finding to Sam with a note: "Check the latest deploy to staging — this was fixed 12 days ago."

**9:15 AM** — Reviews the scheduled scans panel. All targets scanned in the last 24 hours. Coverage: 100%.

**9:20 AM** — Checks Slack. Sec Scanner posted a digest: "Nightly scan summary: 15 targets, 2 new findings (medium), 3 resolved. Overall score: 78/100."

**10:00 AM** — Gets a request from Maria: "Can you send me a security report for the board meeting tomorrow?"

**10:05 AM** — Goes to Reports, selects "Workspace Executive Report" template, clicks Generate. Downloads PDF.

**2:00 PM** — Adds a new target for a recently launched microservice. Sets schedule: daily.

**5:00 PM** — Receives notification: "Sam resolved the SQL injection finding. Target score improved to 82/100."

**Total interaction time: ~30 minutes.** But the value was continuous — the dashboard was always monitoring, the notifications were always alerting, the data was always being collected.

### What Changed from Current Product

| Current | Ideal Day |
|---------|-----------|
| Opens product to start a scan | Opens product to check status |
| Manually enters URL every time | Targets are persistent, scanned automatically |
| Sees a list of vulnerabilities | Sees a Security Score with trend |
| No way to track if things improved | Clear trend: improving/stable/declining |
| Shares individual scan results | Generates executive reports |
| No awareness of regressions | Instant regression alerts |
| Copies findings to Jira manually | Auto-creates Jira tickets |

---

## 5. North Star Metric

### Candidate Metrics Considered

| Metric | Problem |
|--------|---------|
| DAU (Daily Active Users) | Misleading — a user who opens the dashboard for 5 seconds counts the same as one who spends 30 minutes |
| Scans per week | Tool metric, not value metric. More scans ≠ more value |
| Vulnerabilities found | Inverse incentive — more vulnerabilities = "better" product? |
| Findings resolved | Good, but doesn't capture the ongoing value |
| **WAU × Avg. Session Depth** | **Our choice** — see below |

### North Star Metric: Weekly Active Users with Security Check

**Definition:** Number of unique users who, in a given week, viewed a Security Score (at any level: target, project, or workspace).

**Why this metric:**

1. **It measures engagement with the core value proposition.** A user who checks their Security Score is experiencing the product's primary value — understanding their security posture.

2. **It's a leading indicator of retention.** A user who checks their score weekly is unlikely to churn. They've built the product into their routine.

3. **It's not a vanity metric.** You can't game it — the user must actively engage with security data.

4. **It naturally drives product decisions.** To increase this metric, you must make the dashboard more useful, the scores more accurate, and the notifications more relevant.

**Secondary Metrics (Lagging Indicators):**
- **MRR (Monthly Recurring Revenue):** Commercial success
- **Finding Resolution Rate:** % of open findings resolved within 30 days (measures product value delivery)
- **Net Promoter Score (NPS):** User satisfaction
- **Regression Detection Rate:** % of regressions detected and alerted within 24 hours (measures core feature quality)

**Anti-Metrics (Things We Should NOT Optimize For):**
- Total scans (encourages scanning for scanning's sake)
- Total findings (inverse incentive)
- Time on site (more time ≠ more value — we want efficiency)

---

## 6. Retention Mechanisms

Why does a user keep coming back? The product must create **habits**, not just **utility**.

### Habit Loop: Cue → Routine → Reward

| Component | Implementation |
|-----------|---------------|
| **Cue** | Daily email digest: "Your security score: 78/100. 1 new finding. View dashboard →" |
| **Routine** | Open dashboard, check score, review new findings, assign if needed |
| **Reward** | Seeing the score improve over time; resolving a finding and seeing the score go up; getting an "all clear" notification |

### Specific Retention Features

**1. Daily Security Digest (Email)**
The most important retention feature. A daily email that says:
- "Your security score: 78/100 (↑ 2 from yesterday)"
- "1 new finding (medium): CORS misconfiguration on api.example.com"
- "2 findings resolved since yesterday"
- Link: "View full dashboard →"

This creates a daily cue to open the product. The email should be skimmable in 10 seconds.

**2. Regression Alerts (Push Notification)**
When a previously resolved finding reappears, send an immediate notification. This creates urgency and demonstrates ongoing value.

**3. Score Improvement Celebration**
When the Security Score improves by 5+ points, show a congratulations message. This positive reinforcement encourages continued engagement.

**4. Scheduled Reports (Automated Value)**
Weekly/monthly automated reports sent to stakeholders. The user doesn't need to do anything — the product delivers value on a schedule. This prevents the "out of sight, out of mind" problem.

**5. Slack Integration (Passive Visibility)**
Post a daily summary to a Slack channel. Even if the user doesn't open the product, they see the security status in their workflow tool. This maintains awareness without requiring active engagement.

---

## 7. Trust Mechanisms

Users must trust the product for it to become part of their workflow. Trust has multiple dimensions:

### 7.1 Accuracy Trust

"Do I trust the findings?"

**Current state:** The mock engine generates deterministic but fake findings. For a real product, accuracy trust comes from:
- Low false positive rate (scanner quality)
- Clear evidence for each finding (screenshot, HTTP request/response)
- Reproducibility (same finding on repeated scans)
- Confidence scoring (how sure is the scanner?)

**Building accuracy trust:**
- Always show evidence, not just a title
- Allow users to mark false positives (and learn from them to reduce future FPs)
- Show scanner confidence for each finding
- Be transparent: "We detected this with 87% confidence. Review the evidence."

### 7.2 Reliability Trust

"Will it be there when I need it?"

- Uptime monitoring and status page
- Scheduled scans must run on time
- Notifications must be delivered
- API must respond within SLA

### 7.3 Security Trust

"Is my data safe in this security product?"

- Encrypted data at rest and in transit
- Access control that actually works
- No exposure of one workspace's data to another
- Regular third-party security audits (once at scale)
- Transparency about data handling

### 7.4 Value Trust

"Is this product worth paying for?"

- Clear ROI: "We saved X hours per week by not manually running scans"
- Measurable improvement: "Our security score improved by 26 points in 3 months"
- Competitive comparison: "We're better than the free tools because..."

---

## 8. Competitive Landscape

### Direct Competitors

| Competitor | Strengths | Weaknesses | Sec Scanner's Angle |
|------------|-----------|------------|---------------------|
| **OWASP ZAP** | Free, open-source, community | No SaaS, no continuous monitoring, steep learning curve | Managed platform, continuous, easy to use |
| **Burp Suite** | Industry standard, powerful | Expensive, desktop-only, requires expertise | Cloud-native, team collaboration, automated |
| **Tenable.io** | Comprehensive, enterprise features | Expensive, complex, slow to configure | Focused on web apps, faster time to value |
| **Detectify** | Good UX, crowdsourced vulnerabilities | Limited to known vulnerabilities, expensive | Full control, custom targets, flexible pricing |
| **Probely** | Developer-friendly, good integrations | Less comprehensive scanning | Continuous security state focus, trend data |

### Indirect Competitors

| Competitor | Why They're Competitors |
|------------|----------------------|
| **Manual penetration testing** | Companies pay $5-20K per test. Sec Scanner provides continuous monitoring at a fraction of the cost. |
| **Bug bounty platforms (HackerOne, Bugcrowd)** | Provide real-world vulnerability discovery but are expensive and slow. Sec Scanner provides automated, continuous testing. |
| **Cloud provider tools (AWS Inspector, GCP Security Command Center)** | Free with cloud usage but limited to cloud-native resources. Sec Scanner covers any web application. |

### Sec Scanner's Unique Position

**"The only security platform that gives you a single Security Score that tracks your security posture over time, alerts you to regressions, and integrates with your existing workflow."**

This positioning is defensible because:
1. It requires historical data (a new competitor starts at zero)
2. It requires a well-designed event system (hard to bolt on)
3. It requires a focus on UX (security tools traditionally ignore UX)
4. It requires integrations (ecosystem lock-in)

---

## 9. Lead Engineer Concern: Is "Security Score" the Right North Star?

**The concern:** Security Score is a UX abstraction on top of findings data. It doesn't create new security value — it just presents existing data differently. Is this enough to differentiate from competitors who also show scores?

**My assessment: The score itself is not the differentiator. The continuous, automated, trend-tracking system behind it is.**

Competitors show scores per-scan. Sec Scanner shows scores over time, with:
- Automatic computation (no manual aggregation)
- Regression detection (unique capability)
- Confidence scoring (data freshness indicator)
- Cross-project/workspace aggregation
- Historical comparison

**But here's my real concern:** The Security Score could become a vanity metric that users game (by dismissing findings, deleting targets, etc.). The PRODUCT_VISION must be clear that the score is a **tool for improvement**, not a **goal in itself**.

**Recommendation:** Always pair the score with actionable context:
- "Your score dropped 5 points because a critical SQL injection regressed on api.example.com. [Fix it →]"
- "Your score improved 8 points this month. You resolved 12 findings — great work!"

The score without context is a number. The score with context is a call to action.

**One more concern:** For the current product with a mock scanner, the Security Score is meaningless because the findings are fake. This means Security Score should only be prominently surfaced **after** a real scanning engine is integrated. Until then, the product should focus on the scanning workflow and finding management.

**Recommendation:** Phase the vision:
1. Phase 1 (Months 1-3): Build the infrastructure (Target, Finding lifecycle, real scanner)
2. Phase 2 (Months 3-6): Surface Security Score (now the data is real)
3. Phase 3 (Months 6-12): Optimize for daily engagement (digests, integrations, reports)