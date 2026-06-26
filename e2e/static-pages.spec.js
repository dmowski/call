import { test, expect } from '@playwright/test';

test.describe('Privacy page', () => {
  test('loads with policy content', async ({ page }) => {
    await page.goto('/privacy.html');

    await expect(page.getByRole('heading', { level: 1, name: /privacy policy/i })).toBeVisible();
    await expect(page.getByText(/no analytics/i)).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /local storage/i })).toBeVisible();
  });
});

test.describe('Contact page', () => {
  test('loads with feedback info', async ({ page }) => {
    await page.goto('/contact.html');

    await expect(page.getByRole('heading', { level: 1, name: /contact.*feedback/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /dmowski\.alex@gmail\.com/i })).toBeVisible();
  });
});
