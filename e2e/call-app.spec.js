import { test, expect } from '@playwright/test';
import { openApp, getActiveMediaTracks } from './helpers.js';

test.describe('App layout', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
  });

  test('shows camera and microphone selectors', async ({ page }) => {
    await expect(page.getByLabel('Select camera')).toBeVisible();
    await expect(page.getByLabel('Select microphone')).toBeVisible();
  });

  test('back button returns to landing', async ({ page }) => {
    await page.getByRole('button', { name: /back to home/i }).click();

    await expect(page.locator('#landing')).toBeVisible();
    await expect(page.locator('#app')).toBeHidden();
  });
});

test.describe('Permissions', () => {
  test('Start does not activate media before joining', async ({ page }) => {
    await openApp(page);

    const tracks = await getActiveMediaTracks(page);
    expect(tracks).toHaveLength(0);
    await expect(page.locator('#video-placeholder')).toBeVisible();
  });
});

test.describe('Join test call', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
  });

  test('replaces placeholder with delayed video preview', async ({ page }) => {
    await page.getByRole('button', { name: /join test call/i }).click();

    await expect(page.locator('#video-placeholder')).toBeHidden({ timeout: 10_000 });
    await expect(page.locator('.delayed-canvas')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('#status')).toContainText(/delayed by 3 seconds/i);
    await expect(page.getByRole('button', { name: /^in call$/i })).toBeDisabled();
  });

  test('activates delayed audio playback', async ({ page }) => {
    await page.getByRole('button', { name: /join test call/i }).click();

    await expect(page.locator('#status')).toContainText(/delayed by 3 seconds/i, { timeout: 10_000 });

    await page.waitForTimeout(4500);

    const audioPlaying = await page.evaluate(() => {
      const audio = document.getElementById('remote-audio');
      return (
        audio instanceof HTMLAudioElement &&
        audio.srcObject instanceof MediaStream &&
        !audio.paused
      );
    });
    expect(audioPlaying).toBe(true);
  });

  test('shows delay toolbar on preview and updates status', async ({ page }) => {
    await expect(page.getByRole('radiogroup', { name: /preview delay/i })).toBeVisible();
    await expect(page.getByRole('radio', { name: '3s' })).toBeChecked();

    await page.getByRole('button', { name: /join test call/i }).click();
    await expect(page.locator('#status')).toContainText(/delayed by 3 seconds/i, { timeout: 10_000 });

    await page.locator('label.delay-option', { hasText: 'Off' }).click();
    await expect(page.locator('#status')).toContainText(/live preview, no delay/i);
    await expect(page.locator('#participant-label')).toHaveText('You (live)');

    await page.locator('label.delay-option', { hasText: '10s' }).click();
    await expect(page.locator('#status')).toContainText(/delayed by 10 seconds/i);
    await expect(page.locator('#participant-label')).toHaveText('You (10s delay)');
  });

  test('mirrors preview horizontally when toggled', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Mirror' })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#participant-tile')).not.toHaveClass(/mirror-preview/);

    await page.getByRole('button', { name: 'Mirror' }).click();
    await expect(page.getByRole('button', { name: 'Mirror' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#participant-tile')).toHaveClass(/mirror-preview/);

    const saved = await page.evaluate(() => {
      const raw = localStorage.getItem('call-prep-settings');
      return raw ? JSON.parse(raw) : null;
    });
    expect(saved?.mirrorPreview).toBe(true);
  });
});

test.describe('Device preferences', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page);
  });

  test('selection persists in localStorage', async ({ page }) => {
    const cameraSelect = page.getByLabel('Select camera');
    const options = cameraSelect.locator('option');
    const count = await options.count();

    if (count > 1) {
      const secondValue = await options.nth(1).getAttribute('value');
      await cameraSelect.selectOption(secondValue ?? '');

      const saved = await page.evaluate(() => {
        const raw = localStorage.getItem('call-prep-settings');
        return raw ? JSON.parse(raw) : null;
      });
      expect(saved?.cameraId).toBe(secondValue);
    }
  });
});
