import { test, expect } from '@playwright/test';

test.describe('Landing page SEO', () => {
  test('has title and meta description', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Webcam Test.*Microphone Test.*Call Preflight/i);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /webcam.*microphone/i,
    );
    await expect(page.locator('meta[name="keywords"]')).toHaveCount(0);
  });

  test('has crawlable headings and content', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', {
      level: 1,
      name: /free webcam and microphone test/i,
    })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /what you can test/i })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /how it works/i })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /frequently asked questions/i })).toBeVisible();
    await expect(page.locator('.how-it-works')).toContainText(/WebRTC/i);
    await expect(page.locator('.search-intent')).toContainText(/webcam test/i);
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
  test('Start free preflight check button hides landing and shows app', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /start free preflight check/i }).click();

    await expect(page.locator('#landing')).toBeHidden();
    await expect(page.locator('#app')).toBeVisible();
    await expect(page.getByRole('button', { name: /join test call/i })).toBeVisible();
  });
});
