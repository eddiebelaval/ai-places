# Mobile-First Component Architecture

## Philosophy

This codebase now follows a **mobile-first, CSS-driven** responsive strategy:

1. **Default to mobile** - All components render mobile layout by default
2. **Progressive enhancement** - Use Tailwind breakpoints to add desktop features
3. **No JavaScript layout** - Avoid `window.innerWidth` checks (SSR hazard)
4. **Touch-first** - All interactions assume touch, keyboard second, mouse third

## Responsive Breakpoints

```js
// Tailwind default breakpoints
sm: 640px   // Small tablets, large phones in landscape
md: 768px   // Tablets, desktop nav appears
lg: 1024px  // Desktop, sidebars can appear
xl: 1280px  // Large desktop
2xl: 1536px // Extra large desktop
```

## Component Patterns

### Pattern 1: Hide on Mobile, Show on Desktop

```tsx
{/* Mobile: hidden, Desktop (md+): visible */}
<div className="hidden md:block">
  <DesktopFeature />
</div>
```

**Example**: Desktop navigation in header
```tsx
<nav className="pointer-events-auto hidden md:flex flex-1 items-center justify-center px-2">
  <NavTab href="/gallery" label="Gallery" />
  <NavTab href="/setup" label="Setup" />
  <NavTab href="/archives" label="Archives" />
</nav>
```

### Pattern 2: Show on Mobile, Hide on Desktop

```tsx
{/* Mobile: visible, Desktop (md+): hidden */}
<button className="md:hidden">
  <MenuIcon />
</button>
```

**Example**: Hamburger menu
```tsx
<button
  onClick={() => setShowMobileNav(!showMobileNav)}
  className="md:hidden p-2.5 hover:bg-neutral-800 rounded-lg transition-colors min-w-[44px] min-h-[44px]"
>
  <MenuIcon className="w-6 h-6 text-neutral-400" />
</button>
```

### Pattern 3: Responsive Sizing

```tsx
{/* Mobile: larger (9x9), Desktop: smaller (8x8) */}
<div className="w-9 h-9 md:w-8 md:h-8" />
```

**Example**: Color squares in palette
```tsx
<div
  className="w-9 h-9 md:w-8 md:h-8 rounded-lg transition-all"
  style={{ backgroundColor: hex }}
/>
```

### Pattern 4: Mobile Overlay, Desktop Sidebar

```tsx
{/* Mobile: fixed full-screen, Desktop: absolute sidebar */}
<aside className="fixed lg:absolute right-0 lg:right-4 top-0 lg:top-16 w-full sm:w-80 lg:w-72">
  <Sidebar />
</aside>

{/* Mobile backdrop (only on mobile) */}
<div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={onClose} />
```

**Example**: Leaderboard sidebar
```tsx
{showLeaderboard && (
  <>
    {/* Backdrop - mobile only */}
    <div
      className="lg:hidden fixed inset-0 bg-black/50 z-40 pointer-events-auto"
      onClick={() => setShowLeaderboard(false)}
    />
    {/* Sidebar/Overlay */}
    <aside className="fixed lg:absolute right-0 lg:right-4 top-0 lg:top-16 bottom-0 lg:bottom-24 w-full sm:w-80 lg:w-72 z-50 lg:z-10">
      <AgentLeaderboard />
    </aside>
  </>
)}
```

### Pattern 5: Responsive Spacing

```tsx
{/* Mobile: smaller spacing, Desktop: larger */}
<div className="px-3 md:px-5 py-2.5 md:py-3" />
```

**Example**: Header padding
```tsx
<div className="flex items-center justify-between px-3 md:px-5 py-2.5 md:py-3">
  {/* Header content */}
</div>
```

### Pattern 6: Conditional Text/Content

```tsx
{/* Mobile: short label, Desktop: full label */}
<span className="text-xs md:text-sm truncate md:whitespace-normal">
  {isSmallScreen ? "Short" : "Full Description"}
</span>

{/* Better: CSS-only approach */}
<span className="hidden md:inline">Full text</span>
<span className="md:hidden">Short</span>
```

**Example**: Hide pixel count on mobile
```tsx
{hasActivity && (
  <span className="text-[9px] md:text-[10px] text-neutral-500 hidden sm:inline">
    {totalPixels.toLocaleString()} pixels this session
  </span>
)}
```

## Touch Target Guidelines

### Minimum Sizes (WCAG 2.1 Level AAA)
- **Primary actions**: 44x44px minimum
- **Secondary actions**: 44x44px minimum
- **Color squares**: 36x36px (with 8px spacing = 44px touch area)

### Implementation
```tsx
{/* Button with explicit touch target */}
<button className="min-w-[44px] min-h-[44px] p-2">
  <Icon className="w-5 h-5" />
</button>

{/* Link with padding for touch area */}
<a className="p-2 -m-2"> {/* Negative margin maintains visual spacing */}
  Click me
</a>
```

## Accessibility Features

### ARIA Labels
```tsx
<button
  onClick={handleClick}
  aria-label="Open navigation menu"
  aria-expanded={isOpen}
>
  <MenuIcon />
</button>
```

### Screen Reader Only Text
```tsx
<div className="sr-only">
  Additional context for screen readers
</div>
```

### Focus Visible
All interactive elements automatically get focus-visible styles from globals.css:
```css
*:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
```

## Anti-Patterns (Avoid These)

### ❌ DON'T: Use window.innerWidth in component state
```tsx
// BAD - causes SSR hydration mismatch
const [isMobile, setIsMobile] = useState(
  typeof window !== 'undefined' ? window.innerWidth < 768 : false
);
```

### ✅ DO: Use CSS breakpoints
```tsx
// GOOD - SSR-safe, no hydration issues
<div className="hidden md:block">
  <DesktopFeature />
</div>
```

### ❌ DON'T: Small touch targets
```tsx
// BAD - 32x32 is too small for touch
<button className="p-1">
  <Icon className="w-4 h-4" />
</button>
```

### ✅ DO: Proper touch targets
```tsx
// GOOD - 44x44 minimum
<button className="p-2.5 min-w-[44px] min-h-[44px]">
  <Icon className="w-5 h-5" />
</button>
```

### ❌ DON'T: Desktop-first media queries
```tsx
// BAD - requires overriding for mobile
<div className="w-80 sm:w-64" />
```

### ✅ DO: Mobile-first media queries
```tsx
// GOOD - mobile default, progressively enhanced
<div className="w-64 md:w-80" />
```

## Testing Components

### Visual Regression Test
1. Open Chrome DevTools
2. Toggle device toolbar (Cmd+Shift+M)
3. Test viewports: 390x844, 768x1024, 1440x900
4. Check console for errors

### Accessibility Test
1. Tab through all interactive elements
2. Verify focus visible on all elements
3. Check ARIA labels in accessibility tree
4. Test with VoiceOver/NVDA

### Performance Test
1. Run Lighthouse in mobile mode
2. Check for layout shifts (CLS)
3. Verify no hydration warnings
4. Monitor bundle size impact

## Component Checklist

When building a new component:

- [ ] Designed mobile-first (320px+)
- [ ] Touch targets 44x44px minimum
- [ ] Breakpoints use md/lg/xl (not custom values)
- [ ] No window.innerWidth checks
- [ ] ARIA labels on interactive elements
- [ ] Focus visible styles work
- [ ] Tested on 390x844 (iPhone 14)
- [ ] Tested on 768x1024 (iPad)
- [ ] Tested on 1440x900 (Desktop)
- [ ] No console errors or warnings
- [ ] Lighthouse accessibility 95+

## Resources

- [Tailwind Responsive Design Docs](https://tailwindcss.com/docs/responsive-design)
- [WCAG 2.1 Touch Target Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [Next.js SSR Best Practices](https://nextjs.org/docs/messages/react-hydration-error)
- [Mobile Touch Interactions](https://web.dev/mobile-touch/)
