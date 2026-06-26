import { test, expect } from '@playwright/test';
import { openApp } from './helpers.js';

test.describe('Insecure context', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'isSecureContext', { get: () => false });
    });
    await openApp(page);
  });

  test('shows secure connection error instead of generic blocked message', async ({ page }) => {
    await page.getByRole('button', { name: /join test call/i }).click();

    await expect(page.locator('#status')).toContainText(/secure connection|localhost/i, {
      timeout: 10_000,
    });
    await expect(page.locator('#status')).toHaveAttribute('data-state', 'error');
    await expect(page.getByRole('button', { name: /join test call/i })).toBeEnabled();
  });
});

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

    await expect(page.locator('#status')).toContainText(/blocked|embedded browser/i, {
      timeout: 10_000,
    });
    await expect(page.locator('#status')).toHaveAttribute('data-state', 'error');
    await expect(page.locator('#video-placeholder')).toBeVisible();
    await expect(page.getByRole('button', { name: /join test call/i })).toBeEnabled();
  });
});
