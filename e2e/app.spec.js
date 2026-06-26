import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('has SEO-friendly content and meta tags', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Call Prep/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /camera.*microphone/i,
    );

    await expect(page.getByRole('heading', { level: 1, name: /get ready for the call/i })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /what you can do/i })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /how it works/i })).toBeVisible();
    await expect(page.locator('.how-it-works')).toContainText(/WebRTC/i);
  });

  test('footer links to privacy and contact pages', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('navigation', { name: 'Footer' }).getByRole('link', { name: /privacy/i })).toHaveAttribute(
      'href',
      '/privacy.html',
    );
    await expect(page.getByRole('navigation', { name: 'Footer' }).getByRole('link', { name: /contact/i })).toHaveAttribute(
      'href',
      '/contact.html',
    );
  });

  test('Start button hides landing and shows app', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Start', exact: true }).click();

    await expect(page.locator('#landing')).toBeHidden();
    await expect(page.locator('#app')).toBeVisible();
    await expect(page.getByRole('button', { name: /enable camera/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /enable mic/i })).toBeVisible();
  });
});

test.describe('Static pages', () => {
  test('privacy page loads with policy content', async ({ page }) => {
    await page.goto('/privacy.html');

    await expect(page.getByRole('heading', { level: 1, name: /privacy policy/i })).toBeVisible();
    await expect(page.getByText(/no analytics/i)).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: /local storage/i })).toBeVisible();
  });

  test('contact page loads with feedback info', async ({ page }) => {
    await page.goto('/contact.html');

    await expect(page.getByRole('heading', { level: 1, name: /contact.*feedback/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /feedback@call-prep.app/i })).toBeVisible();
  });
});

test.describe('App functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole('button', { name: 'Start', exact: true }).click();
  });

  test('lists camera and microphone selectors', async ({ page }) => {
    await expect(page.getByLabel('Select camera')).toBeVisible();
    await expect(page.getByLabel('Select microphone')).toBeVisible();

    const cameraOptions = page.getByLabel('Select camera').locator('option');
    await expect(cameraOptions).not.toHaveCount(0);
  });

  test('enable camera replaces placeholder with delayed preview', async ({ page }) => {
    await page.getByRole('button', { name: /enable camera/i }).click();

    await expect(page.locator('#video-placeholder')).toBeHidden({ timeout: 10_000 });
    await expect(page.locator('.delayed-canvas')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/camera active/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /camera enabled/i })).toBeDisabled();
  });

  test('enable mic activates delayed audio playback', async ({ page }) => {
    await page.getByRole('button', { name: /enable mic/i }).click();

    await expect(page.getByText(/mic active/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /mic enabled/i })).toBeDisabled();

    const audioPlaying = await page.evaluate(() => {
      const audio = document.getElementById('remote-audio');
      return audio instanceof HTMLAudioElement && audio.srcObject instanceof MediaStream;
    });
    expect(audioPlaying).toBe(true);
  });

  test('device selection persists in localStorage', async ({ page }) => {
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

  test('back button returns to landing', async ({ page }) => {
    await page.getByRole('button', { name: /back to home/i }).click();

    await expect(page.locator('#landing')).toBeVisible();
    await expect(page.locator('#app')).toBeHidden();
  });
});

test.describe('Theme', () => {
  test('theme toggle switches data-theme and persists', async ({ page }) => {
    await page.goto('/');

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
