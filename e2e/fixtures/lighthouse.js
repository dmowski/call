import { test as base, chromium } from '@playwright/test';
import getPort from 'get-port';

/** Playwright test extended with a unique CDP port for Lighthouse audits. */
export const lighthouseTest = base.extend({
  port: [
    async ({}, use) => {
      const port = await getPort();
      await use(port);
    },
    { scope: 'worker' },
  ],

  browser: [
    async ({ port, launchOptions }, use) => {
      const browser = await chromium.launch({
        ...launchOptions,
        args: [
          ...(launchOptions?.args ?? []),
          `--remote-debugging-port=${port}`,
        ],
      });
      await use(browser);
      await browser.close();
    },
    { scope: 'worker' },
  ],
});
