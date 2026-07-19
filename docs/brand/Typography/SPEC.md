# Typography

## Font Stack

```css
--font-sans: var(--font-geist-sans);  /* Geist Sans */
--font-mono: var(--font-geist-mono);  /* Geist Mono */
```

## Size Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| display | 48-72px | 700 | 1.1 | Hero headline |
| h1 | 36-48px | 700 | 1.2 | Page title |
| h2 | 24-30px | 600 | 1.3 | Section header |
| h3 | 18-20px | 600 | 1.4 | Card title |
| body | 14-16px | 400 | 1.6 | Paragraphs |
| small | 12-13px | 400 | 1.5 | Metadata |
| caption | 10-11px | 500 | 1.4 | Labels, badges |
| code | 13-14px | 400 | 1.7 | Terminal, code |

## Tailwind Classes

```
text-7xl font-bold tracking-tight    → Display
text-5xl font-bold tracking-tight    → H1
text-2xl font-semibold               → H2
text-base font-semibold              → H3
text-sm text-muted-2 leading-relaxed → Body
text-xs text-muted-2                 → Small
text-[10px] font-mono text-muted-2   → Caption
text-sm font-mono                    → Code
```

## Rules
1. Maximum 2 weights per component
2. Monospace for all data: IDs, scores, CVEs, paths
3. Gradient text only for hero headlines
4. Uppercase only for labels (with tracking-wider)
