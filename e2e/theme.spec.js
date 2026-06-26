import { test, expect } from '@playwright/test';
import { clearStorage } from './helpers.js';

test.describe('Theme toggle', () => {
  test('switches data-theme and persists to localStorage', async ({ page }) => {
    await clearStorage(page);

    const initial = await page.evaluate(() => document.documentElement.dataset.theme);
    await page.getByRole('button', { name: /toggle color theme/i }).click();

    const after = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(after).not.toBe(initial);

    const saved = await page.evaluate(() => {
      const raw = localStorage.getItem('call-prep-settings');
      return raw ? JSON.parse(raw).theme : null;
    });
    expect(saved).toBe(after);
  });
});
