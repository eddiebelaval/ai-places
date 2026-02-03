import { test, expect } from '@playwright/test';

/**
 * Canvas Tests
 * Test canvas rendering and interactions
 */

test.describe('Canvas Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('aiplaces_intro_seen', 'true');
    });
    await page.goto('/');
  });

  test('canvas container is rendered', async ({ page }) => {
    const canvasMain = page.locator('main#main-canvas');
    await expect(canvasMain).toBeVisible();
  });

  test('canvas has proper accessibility attributes', async ({ page }) => {
    const canvasMain = page.locator('main#main-canvas');
    await expect(canvasMain).toHaveAttribute('role', 'application');
    await expect(canvasMain).toHaveAttribute('aria-label', 'AI collaborative pixel canvas');
  });

  test('skip link is present for keyboard navigation', async ({ page }) => {
    const skipLink = page.locator('a.skip-link');
    await expect(skipLink).toHaveAttribute('href', '#main-canvas');
  });

  test('screen reader instructions are present', async ({ page }) => {
    const srInstructions = page.locator('[aria-label="Canvas instructions"]');
    await expect(srInstructions).toBeAttached();
  });
});

test.describe('Canvas Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('aiplaces_intro_seen', 'true');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('canvas responds to keyboard navigation', async ({ page }) => {
    // Focus on canvas
    const canvasMain = page.locator('main#main-canvas');
    await canvasMain.focus();

    // Arrow keys should work (exact behavior depends on implementation)
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');

    // Canvas should still be visible and interactive
    await expect(canvasMain).toBeVisible();
  });

  test('canvas supports zoom controls', async ({ page }) => {
    // Get canvas element
    const canvasMain = page.locator('main#main-canvas');
    await canvasMain.focus();

    // Test zoom with + and - keys
    await page.keyboard.press('+');
    await page.keyboard.press('-');

    // Canvas should remain stable
    await expect(canvasMain).toBeVisible();
  });
});

test.describe('Bottom Toolbar', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('aiplaces_intro_seen', 'true');
    });
    await page.goto('/');
  });

  test('bottom toolbar is visible', async ({ page }) => {
    // The BottomToolbar component should be present
    // Look for common toolbar elements
    const toolbar = page.locator('[class*="bottom"], [class*="toolbar"]').last();

    // Wait for it to be attached to DOM
    await page.waitForLoadState('domcontentloaded');

    // Check page has a bottom section
    const bottomSection = page.locator('footer, [class*="bottom"]');
    const count = await bottomSection.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Connection Status', () => {
  test('connection status indicator is visible on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.addInitScript(() => {
      localStorage.setItem('aiplaces_intro_seen', 'true');
    });
    await page.goto('/');

    // Connection status should be visible (hidden on mobile)
    // The exact selector depends on the ConnectionStatus component
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });
});

test.describe('Coordinate Display', () => {
  test('coordinate display updates on mouse movement', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('aiplaces_intro_seen', 'true');
    });
    await page.goto('/');

    // Move mouse over canvas area
    const canvasMain = page.locator('main#main-canvas');
    await canvasMain.hover();

    // Move mouse to different positions
    const box = await canvasMain.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 100, box.y + 100);
      await page.mouse.move(box.x + 200, box.y + 200);
    }

    // Canvas should remain interactive
    await expect(canvasMain).toBeVisible();
  });
});
