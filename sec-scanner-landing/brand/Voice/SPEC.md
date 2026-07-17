# Voice & Tone

## Brand Voice

**Calm Authority** — We are experts who speak clearly, not loudly.

| Dimension | We Are | We Are Not |
|-----------|--------|------------|
| Confidence | "Here's what the data shows" | "Your systems are under attack!" |
| Clarity | "3 critical findings, 80% exploit probability" | "Multiple severe vulnerabilities detected" |
| Action | "Parameterize SQL queries to block this path" | "Consider improving your security posture" |
| Empathy | "This finding requires attention" | "You failed to secure this endpoint" |

## Writing Guidelines

### Headlines
- Action-oriented: "Explore Attack Paths", "Launch Demo Workspace"
- Never clickbait: ✗ "You Won't Believe These Vulnerabilities"

### Error Messages
- State the problem: "Upload failed — file must be under 10MB"
- Suggest the fix: "Try a smaller file or use the demo dataset"
- Never blame: ✗ "You uploaded an invalid file"

### Security Findings
- Lead with impact: "SQL Injection allows unauthenticated database access"
- Include probability: "80% success probability on this attack path"
- End with action: "Parameterize queries to remediate"

### Button Copy
- Verb + Object: "Run Analysis", "Install Plugin", "Export Report"
- Never vague: ✗ "Submit", "Process", "Go"

### Empty States
- Explain what's missing: "No scan results yet"
- Provide a next step: "Run your first scan to see findings here"
- Never just say "No data" or show blank space

## Language

### Technical Terms
| Term | Usage | Don't |
|------|-------|-------|
| Finding | Security issue detected by scan | Vulnerability (too vague) |
| Asset | Scannable target (host, app, service) | Resource (ambiguous) |
| Attack Path | Chain of exploitable weaknesses | Hack chain |
| Risk Score | Composite 0-100 assessment | Threat level |
| Remediation | Action to fix a finding | Fix, patch (too simple) |

### Bilingual (RU/EN)
- UI is fully translatable via i18n context
- Default language: Russian (primary market)
- English available as toggle
- Technical terms kept in English: CVE, CVSS, MITRE ATT&CK, API, SDK
