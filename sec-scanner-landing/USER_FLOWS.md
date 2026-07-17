# USER FLOWS — sec-scanner.pro

> Verified user flows after INT-023G.1 Critical Bug Fix Sprint.
> Date: 2026-07-17 | Status: All 5 flows verified on production

---

## Flow 1: Landing → Platform → Demo → Dashboard

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 1 | Open https://sec-scanner.pro/ | Landing loads | ✅ |
| 2 | Click "Platform" in top nav | Scroll to #platform section | ✅ |
| 3 | Click "AI-Powered Analysis" card | Navigate to /app/dashboard | ✅ |
| 4 | Dashboard loads | See Executive Dashboard | ✅ |
| 5 | Go back, click "Demo" in top nav | Scroll to #demo section | ✅ |
| 6 | Click "Open Interactive Demo" | Navigate to /app/demo | ✅ |

**Status: ✅ PASS**

---

## Flow 2: Landing → Marketplace → Plugin → Install

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 1 | Open https://sec-scanner.pro/ | Landing loads | ✅ |
| 2 | Navigate to /app/marketplace | Marketplace page with categories | ✅ |
| 3 | Click "Plugins" category tab | Filter to plugins only | ✅ |
| 4 | Click "Install" on a plugin | Button shows "Installing..." then "Installed ✓" | ✅ |
| 5 | Click "Installed ✓" | Button reverts to "Install" (uninstall) | ✅ |

**Status: ✅ PASS**

---

## Flow 3: Landing → Documentation → Getting Started → API → CLI

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 1 | Open https://sec-scanner.pro/ | Landing loads | ✅ |
| 2 | Click "Docs" in top nav | Navigate to /app/docs | ✅ |
| 3 | Click "Getting Started" card | Navigate to /app/docs/getting-started | ✅ |
| 4 | Click "→ API Reference" in Next Steps | Navigate to /app/docs/api | ✅ |
| 5 | Click "→ CLI Commands" in Next Steps | Navigate to /app/docs/cli | ✅ |
| 6 | Breadcrumb "Docs" links back | Navigate to /app/docs | ✅ |

**Status: ✅ PASS**

---

## Flow 4: Landing → Pricing → Get Started

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 1 | Open https://sec-scanner.pro/ | Landing loads | ✅ |
| 2 | Scroll to Pricing section | Pricing with 4 plans visible | ✅ |
| 3 | Click "Начать бесплатно" (Free plan) | Navigate to /app/demo | ✅ |
| 4 | Click "Start Free Trial" (Starter plan) | Navigate to /app/demo | ✅ |
| 5 | Click "Contact Sales" (Enterprise plan) | Open mailto:hello@sec-scanner.pro | ✅ |

**Status: ✅ PASS**

---

## Flow 5: Landing → Community → GitHub

| Step | Action | Expected | Result |
|------|--------|----------|--------|
| 1 | Open https://sec-scanner.pro/ | Landing loads | ✅ |
| 2 | Click "Community" in top nav | Scroll to #community section | ✅ |
| 3 | Click "Star on GitHub" button | Open GitHub in new tab | ✅ |
| 4 | Click "Contribute" button | Open CONTRIBUTING.md on GitHub | ✅ |
| 5 | Click "Public Roadmap" card | Navigate to /app/community/roadmap | ✅ |

**Status: ✅ PASS**

---

## Additional Verified Paths

| Path | Result |
|------|--------|
| #metrics anchor → "Production by the Numbers" | ✅ |
| Footer: all Product links | ✅ |
| Footer: all Developer links | ✅ |
| Footer: all Legal links | ✅ |
| Footer: Community → Roadmap | ✅ |
| Footer: Community → Contributing (GitHub) | ✅ |
| Pricing (/app/pricing) → Get Started → /app/demo | ✅ |
| Pricing (/app/pricing) → Contact Sales → mailto | ✅ |
| Marketplace → Install → Installed ✓ → Uninstall | ✅ |
| No `href="#"` on critical pages | ✅ |
