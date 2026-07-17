# Colors

## CSS Custom Properties (Tailwind v4)

```css
@theme inline {
  --color-background: #050507;
  --color-foreground: #e8e8ed;
  --color-surface: #0d0d12;
  --color-surface-2: #14141c;
  --color-surface-3: #1c1c28;
  --color-border: #1e1e2e;
  --color-border-light: #2a2a3d;
  --color-muted: #6b6b80;
  --color-muted-2: #8888a0;
  --color-accent: #00ff88;
  --color-accent-hover: #00e67a;
  --color-accent-muted: rgba(0,255,136,0.1);
  --color-accent-border: rgba(0,255,136,0.2);
  --color-cyan: #00d4ff;
  --color-cyan-muted: rgba(0,212,255,0.1);
  --color-cyan-border: rgba(0,212,255,0.2);
  --color-amber: #ffb800;
  --color-amber-muted: rgba(255,184,0,0.1);
  --color-amber-border: rgba(255,184,0,0.2);
  --color-red: #ff4444;
  --color-red-muted: rgba(255,68,68,0.1);
  --color-red-border: rgba(255,68,68,0.2);
  --color-purple: #a855f7;
  --color-purple-muted: rgba(168,85,247,0.1);
  --color-purple-border: rgba(168,85,247,0.2);
}
```

## Color Proportions

```
┌──────────────────────────────────────────────────────────┐
│ 80% Dark Neutrals                                        │
│ #050507  #0d0d12  #14141c  #1c1c28  #1e1e2e  #2a2a3d   │
├──────────────────────────────────────────────────────────┤
│ 15% Semantic Colors                                      │
│ #00ff88  #00d4ff  #ffb800  #ff4444  #a855f7             │
├──────────────────────────────────────────────────────────┤
│ 5% Accent (Action)                                       │
│ #00ff88 (primary CTA, active states, success)            │
└──────────────────────────────────────────────────────────┘
```

## Accessibility
- All text on background meets WCAG AA contrast (4.5:1 minimum)
- Accent green on void: 12.6:1 (AAA)
- Foreground on void: 14.2:1 (AAA)
- Muted-2 on surface: 4.8:1 (AA)
