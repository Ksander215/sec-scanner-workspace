# Design Review — sec-scanner.pro

**Date:** 2026-07-17  
**Task:** INT-023F — Product Review & Enterprise Polish

---

## Design System

### Color Palette

| Token | Dark | Light | Usage |
|-------|------|-------|-------|
| `background` | `#050507` | `#f8f9fa` | Page background |
| `foreground` | `#e8e8ed` | `#1a1a2e` | Primary text |
| `surface` | `#0d0d12` | `#ffffff` | Card backgrounds |
| `surface-2` | `#14141c` | `#f0f1f3` | Nested backgrounds |
| `surface-3` | `#1c1c28` | `#e8e9eb` | Hover states |
| `border` | `#1e1e2e` | `#d1d5db` | Borders |
| `border-light` | `#2a2a3d` | `#e5e7eb` | Hover borders |
| `muted` | `#6b6b80` | `#6b7280` | Secondary text |
| `muted-2` | `#8888a0` | `#9ca3af` | Tertiary text |
| `accent` | `#00ff88` | `#00b864` | Primary brand, CTAs |
| `cyan` | `#00d4ff` | `#0099cc` | Info, links |
| `amber` | `#ffb800` | `#d49900` | Warnings, medium severity |
| `red` | `#ff4444` | `#dc2626` | Critical, errors |
| `purple` | `#a855f7` | `#7c3aed` | AI features, special |

### Typography

| Role | Font | Size | Weight |
|------|------|------|--------|
| Display/Hero | Geist Sans | 48–72px | 700 |
| H1 | Geist Sans | 20–24px | 700 |
| H2 | Geist Sans | 16–18px | 600 |
| Body | Geist Sans | 14px | 400 |
| Small | Geist Sans | 12px | 400 |
| Mono/Code | Geist Mono | 12–14px | 400 |

### Spacing System

| Token | Value | Usage |
|-------|-------|-------|
| `p-2` | 8px | Compact padding (tags, small cards) |
| `p-3` | 12px | List items, small cards |
| `p-5` | 20px | Standard card padding |
| `p-6` | 24px | Hero cards, section padding |
| `p-8` | 32px | Large sections |
| `gap-3` | 12px | List gaps |
| `gap-4` | 16px | Card grid gaps |
| `gap-6` | 24px | Section gaps |

### Border Radius

| Element | Radius | Tailwind |
|---------|--------|----------|
| Buttons | 12px | `rounded-xl` |
| Cards | 12px | `rounded-xl` |
| Badges | 6px | `rounded-md` |
| Tags | 6px | `rounded-md` |
| Inputs | 8px | `rounded-lg` |
| Avatars | 9999px | `rounded-full` |

### Shadows

| Level | Dark Theme | Light Theme | Usage |
|-------|-----------|-------------|-------|
| None | none | none | Flat cards |
| Default | `0 1px 3px rgba(0,0,0,.12)` | `0 1px 3px rgba(0,0,0,.06)` | Standard cards |
| Hover | `0 4px 12px rgba(0,0,0,.15)` | `0 4px 12px rgba(0,0,0,.08)` | Card hover |
| Glow | `0 0 20px rgba(0,255,136,.15)` | `0 0 20px rgba(0,184,100,.15)` | Primary CTA |

---

## Component Inventory

### Buttons
| Variant | Style | Usage |
|---------|-------|-------|
| Primary | `bg-accent text-background rounded-xl` | Main CTAs |
| Outline | `border border-border text-foreground rounded-xl` | Secondary actions |
| Ghost | `text-muted-2 hover:text-foreground` | Tertiary actions |
| Danger | `text-red hover:bg-red-muted` | Destructive actions |

### Badges / Severity Tags
| Severity | Text | Background |
|----------|------|-----------|
| Critical | `text-red` | `bg-red-muted` |
| High | `text-amber` | `bg-amber-muted` |
| Medium | `text-cyan` | `bg-cyan-muted` |
| Low | `text-accent` | `bg-accent-muted` |
| Info | `text-cyan` | `bg-cyan-muted` |

### Cards
- Standard: `p-5 rounded-xl bg-surface border border-border`
- Hero: `p-6 rounded-xl bg-surface border border-border` (with glow accents)
- Interactive: `+ hover:border-border-light hover:bg-surface-2`

---

## UX Improvements Made

1. **Hero simplification** — 2 CTAs instead of 3, English tagline, clear product explanation
2. **Dashboard hierarchy** — Hero card (2-col), incident card (1-col), AI banner (full-width), trend (2-col) + scans (1-col)
3. **Knowledge Graph stats** — Visible node/edge/type/critical counters in header
4. **Attack Path detail** — Added Time to Compromise, Business Risk, CVSS Score
5. **Focus rings** — Consistent accent-colored focus-visible across all interactive elements
6. **Brand subtitle** — "Security Intelligence Platform" in sidebar under logo
7. **Metrics redesign** — Icon-based with descriptions, real measurable values
8. **Interface screenshot** — Visual representation of the dashboard on landing page
9. **Platform cards** — Larger with one-line descriptions and "Learn more" hover
10. **Hover effects** — Consistent lift, glow, and transition across all cards

---

## Visual Improvements Made

1. **Card shadows** — Theme-aware `.card-shadow` and `.card-shadow-hover` utilities
2. **Hover lift** — `.hover-lift` with smooth 2px Y-translate + shadow
3. **Button transitions** — `.btn-enterprise` with consistent cubic-bezier timing
4. **Status dots** — `.status-dot-critical` and `.status-dot-warning` pulse animations
5. **ReactFlow theme** — All hardcoded colors replaced with CSS custom properties
6. **SVG charts** — Grid lines, text fills, and legends all use theme-aware variables
7. **Brand mark** — `.brand-mark` and `.powered-by` utility classes for consistent branding
8. **Selection color** — Accent-tinted text selection in both themes

---

## Remaining Design Debt

1. **Logo system** — Need proper SVG logo (current: Shield icon + text)
2. **Illustration system** — No custom illustrations for empty states
3. **Empty states** — Pages with no data show nothing (need friendly empty states)
4. **Toast notifications** — No toast system for feedback (Install, Save, etc.)
5. **Modal system** — Theme dropdown and search modal need consistent styling
6. **Typography scale** — No formal type scale document (informal: 10/12/14/16/20/24/48/72px)
7. **Icon system** — Mix of lucide-react icons; need custom icon set for unique branding
8. **Page headers** — 3 patterns still exist (PageHeader / custom bar / simple h1)
