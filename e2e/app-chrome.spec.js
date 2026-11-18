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

  test('follows the delayed audio, not the live mic', async ({ page }) => {
    await openApp(page);
    await page.locator('label.delay-option', { hasText: '10s' }).click();

    await page.getByRole('button', { name: /join test call/i }).click();
    await expect(page.locator('#status')).toContainText(/delayed by 10 seconds/i, { timeout: 10_000 });

    const meter = page.getByRole('meter', { name: /microphone level/i });
    const readings = [];
    for (let i = 0; i < 10; i += 1) {
      readings.push(Number(await meter.getAttribute('aria-valuenow')));
      await page.waitForTimeout(200);
    }
    expect(Math.max(...readings)).toBe(-60);
  });

  test('keeps working after switching microphone', async ({ page }) => {
    await openApp(page);
    await page.getByRole('button', { name: /join test call/i }).click();
    await expect(page.locator('#status')).toContainText(/delayed by 3 seconds/i, { timeout: 10_000 });

    const micSelect = page.getByLabel('Select microphone');
    const values = await micSelect.locator('option').evaluateAll((opts) => opts.map((o) => o.value));
    const current = await micSelect.inputValue();
    const other = values.find((v) => v && v !== current);
    test.skip(!other, 'only one fake microphone available');

    await micSelect.selectOption(other);
    await expect(page.locator('#status')).toContainText(/microphone switched/i, { timeout: 10_000 });

    const meter = page.getByRole('meter', { name: /microphone level/i });
    await page.locator('label.delay-option', { hasText: 'Off' }).click();
    await page.waitForTimeout(1000);
    await expect
      .poll(async () => Number(await meter.getAttribute('aria-valuenow')), { timeout: 6_000 })
      .toBeGreaterThan(-60);
  });
});
