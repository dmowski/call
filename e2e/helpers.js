import { expect } from '@playwright/test';

export async function clearStorage(page, path = '/') {
  await page.goto(path);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

export async function openApp(page) {
  await clearStorage(page);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.locator('#app')).toBeVisible();
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
