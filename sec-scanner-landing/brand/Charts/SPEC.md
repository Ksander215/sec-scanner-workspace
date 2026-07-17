# Charts

## Design Principles
1. Dark background (#0d0d12) for chart containers
2. Low-saturation fills, high-saturation borders/strokes
3. Minimal grid — only horizontal lines at major intervals
4. Semantic colors for data categories
5. No 3D effects, gradients on bars, or decorative markers

## Color Mapping
```
Critical: #ff4444
High:     #ffb800
Medium:   #ffb800
Low:      #00ff88
Info:     #00d4ff
Accent:   #00ff88
Cyan:     #00d4ff
Purple:   #a855f7
```

## Chart Types

### Donut Chart
```
Stroke width: 8px (SVG circle)
Background ring: #1e1e2e
Center: score value + label
Animation: strokeDasharray transition
```

### Bar Chart
```
Bar height: 20px
Border radius: 4px (rounded caps)
Background: #1c1c28
Gap between bars: 8px
Label: right-aligned, font-mono
```

### Line Chart (SVG)
```
Stroke: 2px, semantic color
Grid: #1e1e2e, 0.5px
Axis labels: 8px, #6b6b80
Points: none (clean line)
Legend: top-right, color swatch + label
```

### Sparkline
```
Stroke: 1.5px
No axes, no labels
Width: 120px, Height: 32px
```

### Heatmap (Compliance)
```
Cell: rounded-full bar, h-2.5
Score >= 70: bg-accent
Score >= 50: bg-amber
Score < 50: bg-red
Label: right, font-mono, semantic color
```
