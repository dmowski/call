import { test, expect } from '@playwright/test';
import { openApp } from './helpers.js';

test.describe('Permission denied on join', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
    });
    await openApp(page);
  });

  test('shows error, re-enables join button, keeps placeholder', async ({ page }) => {
    await page.getByRole('button', { name: /join test call/i }).click();

    await expect(page.locator('#status')).toContainText(/blocked/i, { timeout: 10_000 });
    await expect(page.locator('#status')).toHaveAttribute('data-state', 'error');
    await expect(page.locator('#video-placeholder')).toBeVisible();
    await expect(page.getByRole('button', { name: /join test call/i })).toBeEnabled();
  });
});
