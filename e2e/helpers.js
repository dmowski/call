import { expect } from '@playwright/test';

export async function clearStorage(page, path = '/') {
  await page.goto(path);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

export async function openApp(page) {
  await clearStorage(page);
  await page.getByRole('button', { name: /start free preflight check/i }).click();
  await expect(page.locator('#app')).toBeVisible();
}

export async function joinTestCall(page) {
  await page.getByRole('button', { name: /join test call/i }).click();
  await expect(page.locator('#status')).toContainText(/delayed by 2 seconds/i, { timeout: 15_000 });
}

/** Wait for 2s delay buffer plus render frames. */
export async function waitForDelayedMedia(page, ms = 3500) {
  await page.waitForTimeout(ms);
}

export async function getCanvasHasContent(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('.delayed-canvas');
    if (!canvas || canvas.width === 0 || canvas.height === 0) return false;

    const ctx = canvas.getContext('2d');
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < height; y += 4) {
      for (let x = 0; x < width; x += 4) {
        const i = (y * width + x) * 4;
        if (data[i] > 15 || data[i + 1] > 15 || data[i + 2] > 15) return true;
      }
    }
    return false;
  });
}

export async function getAudioIsActive(page) {
  return page.evaluate(() => {
    const audio = document.getElementById('remote-audio');
    if (!(audio instanceof HTMLAudioElement) || !(audio.srcObject instanceof MediaStream)) {
      return false;
    }

    const tracks = audio.srcObject.getAudioTracks();
    return !audio.paused && tracks.some((t) => t.readyState === 'live');
  });
}

export async function getDebugState(page) {
  return page.evaluate(() => window.__callPrepDebug?.() ?? null);
}

export async function getActiveMediaTracks(page) {
  return page.evaluate(() => {
    const tracks = [];
    for (const video of document.querySelectorAll('video')) {
      const stream = video.srcObject;
      if (stream instanceof MediaStream) tracks.push(...stream.getTracks());
    }
    for (const audio of document.querySelectorAll('audio')) {
      const stream = audio.srcObject;
      if (stream instanceof MediaStream) tracks.push(...stream.getTracks());
    }
    return tracks.map((t) => ({ kind: t.kind, readyState: t.readyState }));
  });
}
