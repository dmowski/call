import { test, expect } from '@playwright/test';
import { openApp } from './helpers.js';

test.describe('App view chrome', () => {
  test('hides site header and footer in the app and restores them on home', async ({ page }) => {
    await openApp(page);

    await expect(page.locator('.site-header')).toBeHidden();
    await expect(page.locator('.site-footer')).toBeHidden();

    await page.getByRole('button', { name: /back to home/i }).click();
    await expect(page.locator('.site-header')).toBeVisible();
    await expect(page.locator('.site-footer')).toBeVisible();
  });

  test('theme can still be toggled inside the app', async ({ page }) => {
    await openApp(page);
    const initial = await page.evaluate(() => document.documentElement.dataset.theme);

    await page.locator('#app').getByRole('button', { name: /toggle color theme/i }).click();

    const after = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(after).not.toBe(initial);
  });
});

test.describe('Microphone level meter', () => {
  test('is idle before join and reacts to mic input after join', async ({ page }) => {
    await openApp(page);

    const meter = page.getByRole('meter', { name: /microphone level/i });
    await expect(meter).toBeVisible();
    await expect(meter).toHaveAttribute('aria-valuenow', '-60');
    await expect(page.locator('#audio-meter-value')).toHaveText('—');

    await page.getByRole('button', { name: /join test call/i }).click();
    await expect(page.locator('#status')).toContainText(/delayed by 3 seconds/i, { timeout: 10_000 });

    await expect
      .poll(async () => Number(await meter.getAttribute('aria-valuenow')), { timeout: 5_000 })
      .toBeGreaterThan(-60);

    await page.getByRole('button', { name: /back to home/i }).click();
    await page.getByRole('button', { name: /start free preflight check/i }).click();
    await expect(meter).toHaveAttribute('aria-valuenow', '-60');
  });
});
