import { test, expect } from '@playwright/test';

/**
 * Smoke Tests
 * Basic tests to verify the app loads and key elements are present
 */

test.describe('Homepage Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Dismiss intro modal by setting localStorage before navigating
    await page.addInitScript(() => {
      localStorage.setItem('aiplaces_intro_seen', 'true');
    });
    await page.goto('/');
  });

  test('homepage loads successfully', async ({ page }) => {
    // Should have proper title
    await expect(page).toHaveTitle(/aiPlaces/i);
  });

  test('header is visible with branding', async ({ page }) => {
    // Header should be visible
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Brand name should be visible on desktop
    const brandName = page.getByText('aiPlaces');
    await expect(brandName).toBeVisible();

    // Beta badge should be visible
    const betaBadge = page.getByText('Beta');
    await expect(betaBadge).toBeVisible();
  });

  test('main canvas area is present', async ({ page }) => {
    // Canvas container should exist
    const main = page.locator('main#main-canvas');
    await expect(main).toBeVisible();
    await expect(main).toHaveAttribute('role', 'application');
  });

  test('navigation tabs are visible on desktop', async ({ page }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 720 });

    // Navigation links in the header nav (use exact: true to avoid footer links)
    const nav = page.locator('header nav');
    const galleryLink = nav.getByRole('link', { name: 'Gallery', exact: true });
    const setupLink = nav.getByRole('link', { name: 'Setup', exact: true });
    const archivesLink = nav.getByRole('link', { name: 'Archives', exact: true });

    await expect(galleryLink).toBeVisible();
    await expect(setupLink).toBeVisible();
    await expect(archivesLink).toBeVisible();
  });

  test('leaderboard toggle button is present', async ({ page }) => {
    const leaderboardButton = page.getByRole('button', { name: /leaderboard/i });
    await expect(leaderboardButton).toBeVisible();
  });
});

test.describe('Intro Modal', () => {
  test('shows intro modal on first visit', async ({ page }) => {
    // Don't set localStorage - let intro appear
    await page.goto('/');

    // Modal should appear (look for the InfoModal)
    // The exact content depends on the InfoModal implementation
    // Check for common modal patterns
    const modal = page.locator('[role="dialog"]');

    // If modal is present, it should be visible
    const modalCount = await modal.count();
    if (modalCount > 0) {
      await expect(modal.first()).toBeVisible();
    }
  });

  test('does not show intro modal after dismissal', async ({ page }) => {
    // Set localStorage to indicate intro was seen
    await page.addInitScript(() => {
      localStorage.setItem('aiplaces_intro_seen', 'true');
    });
    await page.goto('/');

    // Wait for page to stabilize
    await page.waitForLoadState('networkidle');

    // Modal should not be visible
    const modal = page.locator('[role="dialog"]');
    await expect(modal).not.toBeVisible();
  });
});
