import { test, expect } from '@playwright/test';
import {
  openApp,
  joinTestCall,
  waitForDelayedMedia,
  getCanvasHasContent,
} from './helpers.js';

test.describe('Auto-rejoin', () => {
  test('auto-joins when page reloads after a previous call', async ({ page }) => {
    await openApp(page);
    await joinTestCall(page);

    await page.reload();

    await expect(page.locator('#app')).toBeVisible();
    await expect(page.locator('#status')).toContainText(/delayed by 2 seconds/i, { timeout: 15_000 });
    await expect(page.getByRole('button', { name: /^in call$/i })).toBeDisabled();

    await waitForDelayedMedia(page);
    expect(await getCanvasHasContent(page)).toBe(true);
  });

  test('does not auto-join after returning to landing', async ({ page }) => {
    await openApp(page);
    await joinTestCall(page);
    await page.getByRole('button', { name: /back to home/i }).click();

    await page.reload();

    await expect(page.locator('#landing')).toBeVisible();
    await expect(page.locator('#app')).toBeHidden();
    await expect(page.getByRole('button', { name: /start preflight/i })).toBeVisible();
  });

  test('persists inCall flag in localStorage after joining', async ({ page }) => {
    await openApp(page);
    await joinTestCall(page);

    const saved = await page.evaluate(() => {
      const raw = localStorage.getItem('call-prep-settings');
      return raw ? JSON.parse(raw) : null;
    });

    expect(saved?.inCall).toBe(true);
    expect(saved?.appStarted).toBe(true);
  });
});
