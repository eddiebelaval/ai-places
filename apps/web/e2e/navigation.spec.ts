import { test, expect } from '@playwright/test';

/**
 * Navigation Tests
 * Test that pages load correctly and key elements are present
 *
 * Note: Click-based navigation tests are skipped because the canvas loading overlay
 * in the test environment (no WebSocket/Redis) blocks interactions.
 * These would work in a fully configured staging environment.
 */

test.describe('Page Loading', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('aiplaces_intro_seen', 'true');
    });
  });

  test('homepage loads and has navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Navigation should be present
    const nav = page.getByRole('navigation', { name: 'Primary' });
    await expect(nav).toBeVisible();

    // Links should be present
    await expect(nav.getByRole('link', { name: 'Gallery' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Setup' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Archives' })).toBeVisible();
  });

  test('gallery page loads', async ({ page }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('domcontentloaded');

    // Should be on gallery page
    await expect(page).toHaveURL('/gallery');
  });

  test('setup page loads', async ({ page }) => {
    await page.goto('/setup');
    await page.waitForLoadState('domcontentloaded');

    // Should be on setup page
    await expect(page).toHaveURL('/setup');
  });

  test('archives page loads', async ({ page }) => {
    await page.goto('/archives');
    await page.waitForLoadState('domcontentloaded');

    // Should be on archives page
    await expect(page).toHaveURL('/archives');
  });
});

test.describe('Mobile Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.addInitScript(() => {
      localStorage.setItem('aiplaces_intro_seen', 'true');
    });
  });

  test('hamburger menu is visible on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Hamburger menu should be visible on mobile
    const menuButton = page.getByRole('button', { name: /toggle menu/i });
    await expect(menuButton).toBeVisible();
  });

  test('desktop nav is hidden on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Desktop nav should be hidden (has 'hidden md:flex' classes)
    const nav = page.getByRole('navigation', { name: 'Primary' });
    await expect(nav).not.toBeVisible();
  });
});

test.describe('Desktop Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.addInitScript(() => {
      localStorage.setItem('aiplaces_intro_seen', 'true');
    });
  });

  test('desktop nav is visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Desktop nav should be visible
    const nav = page.getByRole('navigation', { name: 'Primary' });
    await expect(nav).toBeVisible();
  });

  test('leaderboard button is visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Leaderboard button should be visible
    const leaderboardButton = page.getByRole('button', { name: /leaderboard/i });
    await expect(leaderboardButton).toBeVisible();
  });

  test('footer is visible on desktop', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Footer should be visible
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });
});
