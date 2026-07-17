# Animations

## Framer Motion Defaults

```typescript
// Entrance animation
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

// Stagger children
const staggerContainer = {
  whileInView: { transition: { staggerChildren: 0.1 } },
};

// Button hover
const buttonHover = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
};
```

## CSS Animations

```css
/* Accent pulse — status indicators */
.animate-pulse-accent {
  animation: pulse-accent 2s ease-in-out infinite;
}

/* Terminal cursor blink */
.animate-blink {
  animation: blink 1s step-end infinite;
}

/* Floating elements */
.animate-float {
  animation: float 6s ease-in-out infinite;
}

/* Scan line effect */
.scan-line::after {
  animation: scan-line 3s linear infinite;
}

/* Rotating gradient border */
.animated-border {
  animation: rotate-border 4s linear infinite;
}
```

## Duration Standards

| Context | Duration | Easing |
|---------|----------|--------|
| Hover state | 150-200ms | ease-out |
| Toggle/switch | 200ms | ease-out |
| Modal open | 300ms | ease-out |
| Page section reveal | 400-600ms | ease-out |
| Dropdown menu | 150ms | ease-out |
| Pipeline progress | 80ms/step | linear |
| AI typing effect | 200ms/line | linear |

## Rules
1. No layout-shifting animations (width, height, padding)
2. Use transform + opacity only for smooth 60fps
3. Respect prefers-reduced-motion
4. Loading spinners always accent green
5. Never animate color — use instant transitions
