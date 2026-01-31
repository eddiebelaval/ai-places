# Mobile Testing Checklist

## Visual Regression Tests

### Mobile (390x844 - iPhone 14)

#### Header
- [ ] Logo visible and tappable (44x44px)
- [ ] Hamburger menu visible in top right
- [ ] Connection status hidden on smallest screens, visible on sm+
- [ ] No horizontal overflow

#### Navigation
- [ ] Tap hamburger opens dropdown menu
- [ ] Dropdown contains: Gallery, Setup, Archives, Rules
- [ ] All nav items 44px+ height
- [ ] Menu closes when item tapped
- [ ] Menu has backdrop overlay

#### Canvas
- [ ] Canvas fills full viewport width
- [ ] No sidebars visible by default
- [ ] Pan/zoom gestures work
- [ ] No layout shift on load

#### Sidebars
- [ ] Activity feed: completely hidden (no toggle button)
- [ ] Leaderboard toggle visible
- [ ] Tap leaderboard opens full-screen overlay
- [ ] Backdrop visible behind leaderboard
- [ ] Can close leaderboard with X or backdrop tap

#### Bottom Toolbar
- [ ] Toolbar full width with 8px margin each side
- [ ] Fixed to bottom (always visible)
- [ ] Color squares 9x9 (36px visual + spacing)
- [ ] All squares tappable without mis-taps
- [ ] "Spectating" badge visible
- [ ] Info button 44x44px
- [ ] Pixel count hidden on mobile
- [ ] "Trending" section hidden on mobile

#### Footer
- [ ] Footer completely hidden

#### Touch Interactions
- [ ] No double-tap zoom on buttons
- [ ] Tap highlight visible but not jarring
- [ ] No accidental taps between close elements
- [ ] Smooth scrolling in sidebars

### Tablet (768x1024 - iPad Mini)

#### Header
- [ ] Desktop nav appears in center
- [ ] Gallery, Setup, Archives visible
- [ ] Hamburger menu hidden
- [ ] Connection status visible

#### Canvas
- [ ] Full width (sidebars still hidden)
- [ ] Activity feed toggle still hidden
- [ ] Leaderboard still opens as overlay (not sidebar yet)

#### Bottom Toolbar
- [ ] Toolbar centered with auto margins
- [ ] Color squares 8x8 (desktop size)
- [ ] Pixel count visible

#### Footer
- [ ] Footer visible

### Desktop (1440x900)

#### Layout
- [ ] Original desktop layout intact
- [ ] Activity feed toggle appears (lg+)
- [ ] Both sidebars can open as sidebars (not overlays)
- [ ] Canvas adjusts width when sidebars open

#### Sidebars
- [ ] Activity feed: sidebar on left with collapse chevron
- [ ] Leaderboard: sidebar on right with collapse chevron
- [ ] Both can be open simultaneously

#### Bottom Toolbar
- [ ] All features visible
- [ ] Hover tooltips work on color squares
- [ ] Trending section fully visible

## Console Checks

### All Viewports
- [ ] No hydration warnings
- [ ] No React errors
- [ ] No ARIA warnings
- [ ] No console.error messages

## Lighthouse Scores (Mobile)

Run Lighthouse in Chrome DevTools with mobile throttling:

### Before (baseline)
- Performance: ?
- Accessibility: ?
- Best Practices: ?

### After (target)
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+

## Accessibility Tests

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Skip link works
- [ ] Focus visible on all elements
- [ ] No keyboard traps

### Screen Reader (VoiceOver on iOS)
- [ ] Header announces correctly
- [ ] Navigation menu items announced
- [ ] Canvas area announced
- [ ] Color palette items have labels
- [ ] Leaderboard items announced

### Touch Targets (WCAG 2.1 Level AAA)
Measure in browser DevTools:
- [ ] All buttons 44x44px minimum
- [ ] Color squares 36x36px minimum (with spacing)
- [ ] Adequate spacing between targets (8px+)

## Cross-Browser Testing

### iOS
- [ ] Safari 17+
- [ ] Chrome iOS
- [ ] Test on iPhone 14, 14 Pro, SE

### Android
- [ ] Chrome Android
- [ ] Samsung Internet
- [ ] Test on Pixel 7, Samsung S23

### Desktop
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)

## Performance Metrics

### Mobile Network (3G)
- [ ] FCP < 2s
- [ ] LCP < 3s
- [ ] No layout shift (CLS = 0)
- [ ] Interaction ready < 3s

### Edge Cases
- [ ] Rotate device (portrait ↔ landscape)
- [ ] Pinch zoom works on canvas
- [ ] Sidebar opens/closes smoothly
- [ ] Multiple rapid taps don't break UI

## Issues to Watch For

### Known Risks
- Canvas touch events might conflict with browser gestures
- Rapid sidebar toggle could cause animation jank
- Large leaderboard data might cause scroll lag

### Fallbacks
- If canvas touch breaks: Add touch-action: pan-x pan-y
- If sidebar jank: Reduce transition duration
- If scroll lag: Add will-change: transform

## Sign-off

- [ ] Mobile (iPhone) tested and approved
- [ ] Mobile (Android) tested and approved
- [ ] Tablet tested and approved
- [ ] Desktop regression tested
- [ ] Accessibility verified
- [ ] Performance acceptable
- [ ] No console errors

**Tester**: _______________
**Date**: _______________
**Device**: _______________
**Notes**: _______________
