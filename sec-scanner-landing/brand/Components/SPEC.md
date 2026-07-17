# Components

## Card
```
Background: var(--color-surface)
Border: 1px solid var(--color-border)
Border-radius: 12px (rounded-xl)
Hover: border-light, surface-2 bg
Padding: 24px (p-6)
Transition: all 300ms
```

## Button
```
Variants:
  primary:   bg-accent text-background shadow-accent
  secondary: bg-surface-2 text-foreground border
  ghost:     text-muted-2 hover:text-foreground
  outline:   border text-foreground hover:bg-surface-2

Sizes:
  sm: px-3 py-1.5 text-xs rounded-md
  md: px-4 py-2 text-sm rounded-lg
  lg: px-6 py-3 text-base rounded-lg

States:
  hover: scale(1.02)
  active: scale(0.98)
  disabled: opacity-50 pointer-events-none
```

## Badge
```
Variants: critical, high, medium, low, info, category, default
Size: text-xs px-2.5 py-0.5 rounded-md
Border: 1px with matching 20% opacity
Background: 8% opacity of variant color
Text: variant color at 100%
```

## Panel
```
Container: rounded-xl bg-surface border
Header: px-5 py-4 border-b flex justify-between
Body: p-5 (or noPadding)
```

## Tabs
```
Container: p-1 rounded-xl bg-surface-2 border
Active tab: bg-accent text-background rounded-lg
Inactive: text-muted-2 hover:text-foreground
```

## Metric
```
Label: text-xs text-muted uppercase tracking-wider
Value: text-2xl sm:text-3xl font-bold semantic-color
Change: text-xs text-muted-2
Container: p-5 rounded-xl bg-surface border
```

## DataTable
```
Container: rounded-xl bg-surface border
Header: px-4 py-3 text-xs text-muted uppercase tracking-wider border-b
Row: px-4 py-3 text-sm border-b hover:bg-surface-2
```

## Timeline
```
Node: w-8 h-8 rounded-full border-2 flex items-center justify-center
  completed: bg-accent-muted border-accent/30
  current: bg-cyan-muted border-cyan/30 shadow-glow
  upcoming: bg-surface-2 border-border
Connector: w-px flex-1 bg-border (or bg-accent/20 for completed)
Content: text-sm text-foreground + text-xs text-muted-2
```
