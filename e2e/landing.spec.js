import { test, expect } from '@playwright/test';

test.describe('Landing page SEO', () => {
  test('has title and meta description', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Call Prep/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /camera.*microphone/i,
    );
  });

  test('has crawlable headings and content', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1, name: /get ready for the call/i })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /what you can do/i })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /how it works/i })).toBeVisible();
    await expect(page.locator('.how-it-works')).toContainText(/WebRTC/i);
  });
});

test.describe('Landing page footer', () => {
  test('links to privacy and contact pages', async ({ page }) => {
    await page.goto('/');

    const footer = page.getByRole('navigation', { name: 'Footer' });
    await expect(footer.getByRole('link', { name: /privacy/i })).toHaveAttribute('href', '/privacy.html');
    await expect(footer.getByRole('link', { name: /contact/i })).toHaveAttribute('href', '/contact.html');
  });
});

test.describe('Landing page navigation', () => {
  test('Start button hides landing and shows app', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Start', exact: true }).click();

    await expect(page.locator('#landing')).toBeHidden();
    await expect(page.locator('#app')).toBeVisible();
    await expect(page.getByRole('button', { name: /join test call/i })).toBeVisible();
  });
});
