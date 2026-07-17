# Security Intelligence Platform — Brand Book

## Brand Essence

**"What does a person feel when they first open Security Intelligence Platform?"**

*Clarity. Control. Confidence.*

The platform makes complex security data instantly understandable. The brand must convey the same: precision without coldness, intelligence without arrogance, power without intimidation.

---

## Brand Personality

| Trait | Description |
|-------|-------------|
| **Precise** | Every element has purpose. No decoration for decoration's sake. |
| **Calm Authority** | We know security. We don't need to shout about it. |
| **Intelligent** | The design thinks ahead — anticipates what the user needs. |
| **Trustworthy** | Consistency breeds trust. The same patterns repeat everywhere. |
| **Open** | We're open source. The design feels accessible, not gatekept. |

---

## Brand Voice

| Dimension | We Are | We Are Not |
|-----------|--------|------------|
| Tone | Confident, clear, measured | Aggressive, fear-driven, alarmist |
| Language | Technical but accessible | Jargon-heavy, condescending |
| Perspective | "Here's what we found and what to do" | "You're vulnerable, pay us" |
| Emotion | Calm urgency | Panic, FOMO, dread |

### Copy Examples

- ✅ "3 attack paths detected. Primary path has 80% success probability. Remediate by parameterizing SQL queries."
- ❌ "CRITICAL BREACH DETECTED! Your entire infrastructure is at risk! Act NOW!"

---

## Logo

### Primary Logo
The Shield icon (lucide: Shield) rendered in accent green (#00ff88) represents protection and security intelligence.

### Logo Usage Rules
- Minimum size: 24px height
- Clear space: 1x shield height on all sides
- Never rotate, skew, or add effects
- Always use on dark backgrounds (our brand is dark-first)
- Monochrome: use #00ff88 on dark, #050507 on light

### Logo Variants
| Variant | Usage |
|---------|-------|
| Full (Shield + "sec-scanner") | Header, sidebar, large spaces |
| Icon only (Shield) | Favicon, small spaces, mobile |
| Wordmark only ("sec‑scanner") | When shield is implied by context |

---

## Color System

### Primary Palette

| Role | Name | Hex | Usage |
|------|------|-----|-------|
| Background | Void | `#050507` | Page background, the deepest layer |
| Surface | Surface | `#0d0d12` | Cards, panels, elevated containers |
| Surface 2 | Elevated | `#14141c` | Hover states, secondary elevation |
| Surface 3 | Raised | `#1c1c28` | Nested containers, code blocks |
| Accent | Neon Green | `#00ff88` | Primary actions, active states, CTAs |
| Cyan | Cyan | `#00d4ff` | Secondary actions, information, links |
| Amber | Amber | `#ffb800` | Warnings, high severity, attention |
| Red | Red | `#ff4444` | Critical, danger, destructive actions |
| Purple | Purple | `#a855f7` | AI features, ML pipeline, intelligence |

### Semantic Colors (Severity)

| Severity | Color | Background | Border |
|----------|-------|------------|--------|
| Critical | `#ff4444` | `rgba(255,68,68,0.08)` | `rgba(255,68,68,0.20)` |
| High | `#ffb800` | `rgba(255,184,0,0.08)` | `rgba(255,184,0,0.20)` |
| Medium | `#ffb800` | `rgba(255,184,0,0.08)` | `rgba(255,184,0,0.20)` |
| Low | `#00ff88` | `rgba(0,255,136,0.08)` | `rgba(0,255,136,0.20)` |
| Info | `#00d4ff` | `rgba(0,212,255,0.08)` | `rgba(0,212,255,0.20)` |

### Color Rules
1. **Background is always dark** — our brand is dark-first
2. **Accent green is for action** — buttons, active states, success
3. **Red is for danger only** — never decorative
4. **Purple = AI** — consistently used for all AI/ML features
5. **Never use accent green for text on dark backgrounds** — use foreground (#e8e8ed) instead
6. **Color proportions**: 80% dark neutrals, 15% semantic, 5% accent

---

## Typography

### Font Stack

| Role | Font | Fallback |
|------|------|----------|
| Headings | Geist Sans | Inter, system-ui |
| Body | Geist Sans | Inter, system-ui |
| Code | Geist Mono | JetBrains Mono, monospace |

### Type Scale

| Level | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| Display | 48-72px | 700 | 1.1 | Hero headlines only |
| H1 | 36-48px | 700 | 1.2 | Page titles |
| H2 | 24-30px | 600 | 1.3 | Section headers |
| H3 | 18-20px | 600 | 1.4 | Card titles, subsections |
| Body | 14-16px | 400 | 1.6 | Paragraphs, descriptions |
| Small | 12-13px | 400 | 1.5 | Metadata, secondary info |
| Caption | 10-11px | 500 | 1.4 | Labels, badges, timestamps |
| Code | 13-14px | 400 | 1.7 | Terminal output, code blocks |

### Typography Rules
1. **Never use all-caps for body text** — only for labels and badges (with letter-spacing)
2. **Maximum 2 font weights per component** — typically 600 for title + 400 for body
3. **Monospace for data** — IDs, CVSS scores, CVE references, code, file paths
4. **Gradient text sparingly** — only for hero headlines and key metrics

---

## Iconography

### Icon System
- **Library**: lucide-react v1.24+
- **Default size**: 18px (sidebar), 16px (inline), 20px (cards)
- **Stroke width**: 2px (default), 1.5px (dense), 2.5px (featured)
- **Color**: inherits from parent, or uses semantic color

### Icon + Text Rules
- Always 8px gap between icon and text
- Icon vertically centered with text
- Icon on the left of text (LTR), right (RTL)

### Custom Icons
| Icon | Usage | Source |
|------|-------|--------|
| GitHubIcon | GitHub links | Custom SVG (lucide removed this export) |

---

## Spacing System

### Base Unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight gaps, inline elements |
| sm | 8px | Icon-text gaps, badge padding |
| md | 12px | List item gaps, form fields |
| lg | 16px | Card padding, section gaps |
| xl | 24px | Section padding, card spacing |
| 2xl | 32px | Section dividers |
| 3xl | 48px | Major section breaks |

### Container
- Max width: 1280px (max-w-7xl)
- Horizontal padding: 16px mobile, 24px tablet, 32px desktop
- Content width for docs: 720px (max-w-3xl)

---

## Animations

### Motion Principles
1. **Purposeful** — every animation communicates a state change
2. **Fast** — 150-300ms for micro-interactions, 300-600ms for layout
3. **Natural** — ease-out for entrances, ease-in for exits
4. **Subtle** — opacity and transform only, never layout properties

### Animation Library

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| Fade in | 300ms | ease-out | Page transitions, modal open |
| Slide up | 400ms | ease-out | Card entrance, section reveal |
| Scale | 200ms | ease-out | Button hover, card interaction |
| Pulse | 2000ms | linear | Active status indicators |
| Blink | 1000ms | step-end | Terminal cursor |
| Float | 6000ms | ease-in-out | Decorative elements |
| Spin | 1000ms | linear | Loading states |
| Scan line | 3000ms | linear | Security scanning effect |

### Framer Motion Defaults
```typescript
const defaultTransition = { duration: 0.3, ease: "easeOut" };
const staggerChildren = { staggerChildren: 0.05 };
const viewportOnce = { once: true, margin: "-50px" };
```

---

## Component Design

### Card
- Background: surface (#0d0d12)
- Border: 1px solid border (#1e1e2e)
- Border radius: 12px (rounded-xl)
- Hover: border-light (#2a2a3d), surface-2 bg
- Padding: 24px (p-6)

### Button
| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| Primary | accent (#00ff88) | background (#050507) | none |
| Secondary | surface-2 (#14141c) | foreground | 1px border |
| Ghost | transparent | muted-2 | none |
| Outline | transparent | foreground | 1px border |

### Badge
- Size: xs text, px-2.5 py-0.5
- Variants: critical, high, medium, low, info, category, default
- Border radius: 6px (rounded-md)

### Panel
- Header: px-5 py-4, border-bottom, flex justify-between
- Body: p-5 (or noPadding)
- Border radius: 12px

### Input
- Background: surface-2
- Border: 1px border
- Focus: border-accent/40
- Height: 36px (sm), 40px (md)
- Font size: 14px, monospace for search

---

## Chart Style

### Principles
- Dark backgrounds (#0d0d12 for chart area)
- Low-saturation fills, high-saturation borders
- Grid lines: #1e1e2e, 0.5px
- Axis labels: 12px muted (#6b6b80)
- Data labels: 13px foreground
- Tooltips: surface-2 bg, 12px text

### Severity Color Mapping
| Severity | Chart Color |
|----------|------------|
| Critical | #ff4444 |
| High | #ffb800 |
| Medium | #ffb800 |
| Low | #00ff88 |
| Info | #00d4ff |

### Chart Types
| Type | Usage | Style |
|------|-------|-------|
| Donut | Risk score, severity distribution | Thin stroke, center label |
| Bar | Finding counts, compliance | Rounded caps, semantic colors |
| Line | Trend over time | 2px stroke, gradient fill below |
| Heatmap | Compliance, risk matrix | Color-scale cells, 8px gap |
| Sparkline | KPI cards | 1.5px stroke, no axes |

---

## Knowledge Graph Style

### Node Design
- Border radius: 8px (rounded-lg)
- Border: 2px, color matches type
- Background: 8% opacity of type color
- Icon: 14px, left-aligned
- Label: 12px, bold, type color
- Detail: 10px, muted-2, monospace
- Selected: ring-2 ring-accent/50, scale-105

### Node Type Colors
| Type | Color | Icon |
|------|-------|------|
| Host | #00d4ff (cyan) | Server |
| Service | #a855f7 (purple) | Monitor |
| Finding | #ff4444 (red) | AlertTriangle |
| CVE | #ffb800 (amber) | Bug |
| Credential | #ff4444 (red) | Key |
| Asset | #00ff88 (green) | Shield |
| Recommendation | #00ff88 (green) | Lightbulb |

### Edge Design
| Type | Color | Width | Animated |
|------|-------|-------|----------|
| Exploits | #ff4444 | 2px | Yes |
| Affects | #ffb800 | 2px | Yes |
| Remediates | #00ff88 | 1px | No |
| Authenticates | #ff4444 | 1px | No |
| Default | #4a4a6a | 1px | No |

---

## Attack Path Style

### Path Node
- Border: 2px, color matches risk
- Background: 15% opacity for highlighted, 8% for dimmed
- Glow: 30px shadow for highlighted nodes
- Icon: 16px in rounded container

### Path Edge
- Critical: #ff4444, 2px, animated
- High: #ffb800, 2px
- Medium: #00ff88, 1.5px
- Label: probability percentage in edge color

### Attack Path Node Types
| Type | Color | Icon |
|------|-------|------|
| Internet | #ff4444 | Globe |
| Firewall | #ffb800 | Shield |
| Proxy | #a855f7 | Server |
| Application | #00d4ff | Code |
| Cache | #ff4444 | Database |
| Secrets | #ff4444 | Key |
| Orchestrator | #ff4444 | Box |
| Database | #ffb800 | HardDrive |

---

## Dashboard Style

### Layout
- Full-width, no sidebar
- Tab navigation below header
- Grid: 4 columns for KPIs, 2 columns for charts
- Max content width: 1280px

### KPI Card
- Background: surface
- Metric: 3xl font, semantic color
- Change indicator: xs text, trend icon (up/down)
- Icon: top-right, muted color

### Chart Cards
- Title: sm font-semibold
- Chart: padded, constrained height
- Legend: bottom or right, muted text

---

## AI Assistant Style

### Chat Interface
- Input: rounded-xl, surface-2 bg
- User message: right-aligned, accent border-left
- AI response: left-aligned, with section dividers
- Sections: Reasoning (cyan), Connections (amber), Recommendations (green)

### Typing Effect
- Animated cursor: 1s step blink
- Line-by-line reveal: 200ms per line
- Progressive sections with fade-in

---

## Marketplace Style

### Store Layout
- Category tabs at top
- Grid: 3 columns desktop, 2 tablet, 1 mobile
- Search bar prominent

### Product Card
- Icon + title + author (verified badge)
- Description: 2 lines max, truncated
- Tags: max 3, xs rounded-md
- Footer: rating (star + number), installs, version, install button

---

## Documentation Style

### Layout (Stripe-inspired)
- Left sidebar: 224px, docs navigation
- Right content: max-w-3xl, flowing text
- No PageHeader — breadcrumbs handled by portal layout

### Content
- Headings: scroll-margin-top for anchor links
- Code blocks: surface bg, monospace, $ prefix for terminal
- Callouts: accent-muted bg for tips, amber-muted for warnings

---

## Motion

### Page Transitions
- Route changes: no animation (instant for performance)
- Section reveals: fade-up with stagger (whileInView, once: true)

### Interactive Feedback
- Buttons: scale(1.02) on hover, scale(0.98) on active
- Cards: border-light on hover, surface-2 bg
- Links: color transition 200ms

### Loading States
- Spinner: accent green, 1s rotation
- Skeleton: surface-2 bg, pulse animation
- Progress bar: accent green fill, 100ms linear transition
